-- Up Migration
-- Hostpointe data model v0: tenancy and core model (P0-07, P0-08).
-- Decisions: ADR-0002 (tenancy), ADR-0003 (scheduling), ADR-0004 (credentials and check-in).
-- Compliance: docs/compliance/reviews/REVIEW-0001-data-model-v0.md.
-- Needs PostgreSQL 16 or later (UNIQUE NULLS NOT DISTINCT needs 15). node-pg-migrate runs each
-- section of this file in one transaction.

-- The role the API connects through. It must never own tables or bypass row-level security.
-- NOLOGIN: the login that belongs to this role is created outside migrations (P0-05).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hostpointe_app') THEN
    CREATE ROLE hostpointe_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  -- The scheduled purge job only. It can delete audit rows older than 24 months and nothing else.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hostpointe_purge') THEN
    CREATE ROLE hostpointe_purge NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

CREATE SCHEMA app;
GRANT USAGE ON SCHEMA app TO hostpointe_app;

-- Request context. The API sets both per transaction with set_config(name, value, true), so a
-- pooled connection cannot carry them into another request. Unset means NULL, which matches no rows.
CREATE FUNCTION app.current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE FUNCTION app.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Audit rows cannot be erased, so metadata must never hold personal data. Only these keys are
-- allowed, and every value must be a short lower-case token: this rejects names and email
-- addresses. Adding a key takes a migration, and so a compliance review.
CREATE FUNCTION app.audit_metadata_is_allowed(m jsonb) RETURNS boolean
  LANGUAGE sql IMMUTABLE
  AS $$
    SELECT jsonb_typeof(m) = 'object' AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(m) AS e
      WHERE e.key <> ALL (ARRAY['request_id', 'method', 'from_status', 'to_status'])
         OR jsonb_typeof(e.value) <> 'string'
         OR (e.value #>> ARRAY[]::text[]) !~ '^[a-z0-9_-]{1,64}$'
    )
  $$;

-- ---------------------------------------------------------------------------------------------
-- Identity and tenancy
-- ---------------------------------------------------------------------------------------------

CREATE TABLE tenants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  country_code     text NOT NULL CHECK (country_code IN ('GB', 'NG')),
  default_currency text NOT NULL CHECK (default_currency IN ('GBP', 'NGN')),
  default_timezone text NOT NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Organisers and staff only. Guests have no account (see the guests table).
-- Global, because one person can belong to several tenants.
CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_issuer  text NOT NULL,
  identity_subject text NOT NULL,
  email            text NOT NULL,
  display_name     text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_issuer, identity_subject)
);

-- Fixed catalogue, changed only by migrations.
CREATE TABLE roles (
  key         text PRIMARY KEY,
  description text NOT NULL
);

INSERT INTO roles (key, description) VALUES
  ('owner',   'Full control of the tenant, including billing and members'),
  ('admin',   'Manages events, guests and staff'),
  ('staff',   'Checks guests in at the door'),
  ('viewer',  'Read-only access to events and reports');

CREATE TABLE memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  role_key   text NOT NULL REFERENCES roles (key) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

-- ---------------------------------------------------------------------------------------------
-- Scheduling: Event -> EventSeries (RRULE) -> EventOccurrence -> Session
-- Composite foreign keys carry tenant_id and event_id, so the database itself refuses a row that
-- points at another tenant's or another event's data.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  title      text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  category   text NOT NULL CHECK (category IN ('personal', 'corporate')),
  status     text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

-- rrule NULL means the dates are listed by hand (a one-off or an irregular multi-day event).
-- first_local_start is wall-clock time in `timezone`: 10:00 stays 10:00 across daylight saving.
CREATE TABLE event_series (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL,
  event_id          uuid NOT NULL,
  rrule             text CHECK (rrule ~ '^FREQ='),
  timezone          text NOT NULL,
  first_local_start timestamp NOT NULL,
  duration_minutes  integer NOT NULL CHECK (duration_minutes > 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events (tenant_id, id) ON DELETE RESTRICT
);

-- recurrence_local_start is the date's permanent identity (RECURRENCE-ID in RFC 5545) and never
-- changes. Moving a date changes local_start and starts_at only. Skipping a date sets status to
-- 'cancelled' and keeps the row, so earlier attendance stays attached.
-- The attendance day is local_date, never the UTC day of starts_at.
CREATE TABLE event_occurrences (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL,
  event_id               uuid NOT NULL,
  series_id              uuid NOT NULL,
  recurrence_local_start timestamp NOT NULL,
  timezone               text NOT NULL,
  local_start            timestamp NOT NULL,
  local_date             date GENERATED ALWAYS AS (local_start::date) STORED,
  starts_at              timestamptz NOT NULL,
  ends_at                timestamptz NOT NULL,
  status                 text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (series_id, recurrence_local_start),
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id, series_id)
    REFERENCES event_series (tenant_id, event_id, id) ON DELETE RESTRICT
);
CREATE INDEX event_occurrences_event_date_idx ON event_occurrences (tenant_id, event_id, local_date);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  event_id      uuid NOT NULL,
  occurrence_id uuid NOT NULL,
  title         text NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  timezone      text NOT NULL,
  local_start   timestamp NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (tenant_id, event_id, occurrence_id, id),
  FOREIGN KEY (tenant_id, event_id, occurrence_id)
    REFERENCES event_occurrences (tenant_id, event_id, id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------------------------------
-- Guests, credentials, check-in
-- ---------------------------------------------------------------------------------------------

-- Personal data. A guest belongs to one event and needs no account. Consent and all children's
-- data (Safe Pickup) arrive in later, separately reviewed migrations.
-- rsvp_status is the event-wide answer. Per-date RSVP for repeating events is a later rsvps table.
-- Erasure is app.anonymise_guest, never DELETE: attendance rows must stay (ADR-0004).
CREATE TABLE guests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  event_id    uuid NOT NULL,
  full_name   text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
  email       text,
  phone       text,
  rsvp_status text NOT NULL DEFAULT 'invited' CHECK (rsvp_status IN ('invited', 'yes', 'no', 'maybe')),
  anonymised_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (anonymised_at IS NULL OR (email IS NULL AND phone IS NULL)),
  UNIQUE (tenant_id, event_id, id),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events (tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX guests_event_name_idx ON guests (tenant_id, event_id, lower(full_name));

-- No personal data and no raw secret. A QR payload carries only this row's id, a signing key id and
-- a signature. Short codes and door-tag identifiers are stored as keyed hashes in lookup_hash.
CREATE TABLE credentials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  event_id    uuid NOT NULL,
  guest_id    uuid NOT NULL,
  kind        text NOT NULL CHECK (kind IN ('qr', 'short_code', 'door_tag')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  lookup_hash bytea,
  valid_from  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CHECK (expires_at IS NULL OR expires_at > valid_from),
  CHECK (kind = 'qr' OR status = 'revoked' OR lookup_hash IS NOT NULL),
  UNIQUE (tenant_id, event_id, guest_id, id),
  FOREIGN KEY (tenant_id, event_id, guest_id)
    REFERENCES guests (tenant_id, event_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX credentials_one_active_per_kind
  ON credentials (guest_id, kind) WHERE status = 'active';
CREATE UNIQUE INDEX credentials_lookup_unique
  ON credentials (tenant_id, event_id, kind, lookup_hash) WHERE lookup_hash IS NOT NULL;

-- Invariant: one check-in per guest, occurrence and session. session_id NULL is a check-in for the
-- whole date; NULLS NOT DISTINCT makes that combination unique too. Rows are never updated.
-- idempotency_key is generated by the scanning device, so an offline retry cannot create a second row.
CREATE TABLE check_ins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  event_id        uuid NOT NULL,
  occurrence_id   uuid NOT NULL,
  session_id      uuid,
  guest_id        uuid NOT NULL,
  credential_id   uuid,
  method          text NOT NULL CHECK (method IN ('qr', 'short_code', 'door_tag', 'staff_lookup')),
  checked_in_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  scanned_at      timestamptz NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_ins_one_per_guest_occurrence_session
    UNIQUE NULLS NOT DISTINCT (tenant_id, guest_id, occurrence_id, session_id),
  CONSTRAINT check_ins_idempotency_unique UNIQUE (tenant_id, idempotency_key),
  CHECK (method = 'staff_lookup' OR credential_id IS NOT NULL),
  FOREIGN KEY (tenant_id, event_id, guest_id)
    REFERENCES guests (tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, occurrence_id)
    REFERENCES event_occurrences (tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, occurrence_id, session_id)
    REFERENCES sessions (tenant_id, event_id, occurrence_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, guest_id, credential_id)
    REFERENCES credentials (tenant_id, event_id, guest_id, id) ON DELETE RESTRICT
);
CREATE INDEX check_ins_occurrence_idx ON check_ins (tenant_id, occurrence_id);

-- Append-only for the API role (see the grants below). Kept for 24 months, then deleted only by
-- the scheduled purge job through hostpointe_purge.
CREATE TABLE audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action        text NOT NULL CHECK (action ~ '^[a-z0-9_.]{1,100}$'),
  entity_type   text NOT NULL CHECK (entity_type ~ '^[a-z0-9_]{1,100}$'),
  entity_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (app.audit_metadata_is_allowed(metadata)),
  occurred_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_tenant_time_idx ON audit_events (tenant_id, occurred_at DESC);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------------------------

CREATE TRIGGER tenants_touch BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER memberships_touch BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER events_touch BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER event_series_touch BEFORE UPDATE ON event_series
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER event_occurrences_touch BEFORE UPDATE ON event_occurrences
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER sessions_touch BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER guests_touch BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER credentials_touch BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Row-level security. FORCE applies the policies to the table owner as well.
-- `users` is the one exception (ENABLE only): app.upsert_user_from_identity runs as the owner and
-- has to find a user before any user context exists. `roles` holds no tenant data and is read-only.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

-- A signed-in user may list their own memberships and tenants before choosing a tenant.
-- All writes need the tenant context.
CREATE POLICY memberships_read ON memberships FOR SELECT
  USING (tenant_id = app.current_tenant_id() OR user_id = app.current_user_id());
CREATE POLICY memberships_insert ON memberships FOR INSERT
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY memberships_delete ON memberships FOR DELETE
  USING (tenant_id = app.current_tenant_id());

CREATE POLICY tenants_read ON tenants FOR SELECT
  USING (
    id = app.current_tenant_id()
    OR id IN (SELECT m.tenant_id FROM memberships m WHERE m.user_id = app.current_user_id())
  );
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (id = app.current_tenant_id());
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id = app.current_tenant_id())
  WITH CHECK (id = app.current_tenant_id());

-- A user sees their own row and the members of the current tenant. A user edits only their own row.
CREATE POLICY users_read ON users FOR SELECT
  USING (
    id = app.current_user_id()
    OR id IN (SELECT m.user_id FROM memberships m WHERE m.tenant_id = app.current_tenant_id())
  );
CREATE POLICY users_update ON users FOR UPDATE
  USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events', 'event_series', 'event_occurrences', 'sessions',
    'guests', 'credentials', 'check_ins', 'audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = app.current_tenant_id()) '
      'WITH CHECK (tenant_id = app.current_tenant_id())', t);
  END LOOP;
END $$;

-- The generic policy applies to every role. On audit_events it must apply to the API role only,
-- otherwise the purge role could set a tenant context and delete recent rows.
ALTER POLICY tenant_isolation ON audit_events TO hostpointe_app;
CREATE POLICY audit_purge_read ON audit_events FOR SELECT TO hostpointe_purge
  USING (occurred_at < now() - interval '24 months');
CREATE POLICY audit_purge_delete ON audit_events FOR DELETE TO hostpointe_purge
  USING (occurred_at < now() - interval '24 months');

-- ---------------------------------------------------------------------------------------------
-- Sign-in lookup: the only way to reach a user row with no user context
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION app.upsert_user_from_identity(
  p_issuer text, p_subject text, p_email text, p_display_name text
) RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
    INSERT INTO public.users (identity_issuer, identity_subject, email, display_name)
    VALUES (p_issuer, p_subject, p_email, p_display_name)
    ON CONFLICT (identity_issuer, identity_subject)
    DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
    RETURNING id
  $$;

-- ---------------------------------------------------------------------------------------------
-- Erasure: runs as the caller, so row-level security limits it to the current tenant. Keeps the
-- guest row and check-ins, removes everything that identifies the person. Repeat calls change
-- nothing. Returns false when the guest is not visible or was already anonymised.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION app.anonymise_guest(p_guest_id uuid) RETURNS boolean
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
  AS $$
  DECLARE
    v_tenant_id uuid;
  BEGIN
    UPDATE guests
       SET full_name = 'Anonymised guest', email = NULL, phone = NULL, anonymised_at = now()
     WHERE id = p_guest_id AND anonymised_at IS NULL
    RETURNING tenant_id INTO v_tenant_id;

    IF v_tenant_id IS NULL THEN
      RETURN false;
    END IF;

    UPDATE credentials
       SET status = 'revoked', revoked_at = COALESCE(revoked_at, now()), lookup_hash = NULL
     WHERE guest_id = p_guest_id;

    INSERT INTO audit_events (tenant_id, actor_user_id, action, entity_type, entity_id)
    VALUES (v_tenant_id, app.current_user_id(), 'guest.anonymised', 'guest', p_guest_id);

    RETURN true;
  END
  $$;

-- ---------------------------------------------------------------------------------------------
-- Grants. Least privilege: check_ins and audit_events are insert-and-read only, and no table
-- grants TRUNCATE.
-- ---------------------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION app.upsert_user_from_identity(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.upsert_user_from_identity(text, text, text, text) TO hostpointe_app;

GRANT SELECT ON roles TO hostpointe_app;
GRANT SELECT, UPDATE ON users TO hostpointe_app;
GRANT SELECT, INSERT, UPDATE ON tenants TO hostpointe_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON memberships, events, event_series, event_occurrences, sessions, guests, credentials
  TO hostpointe_app;
GRANT SELECT, INSERT ON check_ins, audit_events TO hostpointe_app;

REVOKE ALL ON FUNCTION app.anonymise_guest(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.anonymise_guest(uuid) TO hostpointe_app;

GRANT USAGE ON SCHEMA app TO hostpointe_purge;
GRANT SELECT (occurred_at), DELETE ON audit_events TO hostpointe_purge;

-- Down Migration
-- Rollback for the up section. This destroys all data in these tables, so
-- running it anywhere except a local database is an escalation to Michael (CLAUDE.md rule 10).
-- The hostpointe_app and hostpointe_purge roles stay: roles belong to the whole server, other databases on the
-- server may use them, and the up section tolerates them already existing.

DROP TABLE audit_events;
DROP TABLE check_ins;
DROP TABLE credentials;
DROP TABLE guests;
DROP TABLE sessions;
DROP TABLE event_occurrences;
DROP TABLE event_series;
DROP TABLE events;
DROP POLICY tenants_read ON tenants;
DROP POLICY users_read ON users;
DROP TABLE memberships;
DROP TABLE roles;
DROP TABLE users;
DROP TABLE tenants;
DROP SCHEMA app CASCADE;
