-- Up Migration
-- Hostpointe migration 0002 (HPE-81): venues, guest invites, consent records, suppressions, duplicate rule.
-- Reviewers: Adaeze (design), Osaretin (personal data, consent; invite token under C-4).
-- Access needs (special category data) are NOT here: they wait for Osaretin's ruling and a later migration.
-- Assumes PERSONAL invite links (one per guest). One open link for everyone would change guest_invites.

-- ---------------------------------------------------------------------------------------------
-- Venues, and an optional venue on each occurrence
-- ---------------------------------------------------------------------------------------------

CREATE TABLE venues (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  address    text CHECK (address IS NULL OR length(address) <= 500),
  timezone   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
CREATE TRIGGER venues_touch BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- MATCH SIMPLE: when venue_id is NULL the key is not checked, so the venue stays optional;
-- when it is set, the venue must belong to the same tenant.
ALTER TABLE event_occurrences ADD COLUMN venue_id uuid;
ALTER TABLE event_occurrences ADD CONSTRAINT event_occurrences_venue_fk
  FOREIGN KEY (tenant_id, venue_id) REFERENCES venues (tenant_id, id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------------------------
-- Duplicate rule: one guest per normalised email and per normalised phone within an event.
-- Anonymised guests have email and phone cleared (0001), so they never block a new guest.
-- email: trimmed, lower case. phone: digits and a leading + only; full international formatting
-- (E.164) is done by the API before saving, this is the database backstop.
-- ---------------------------------------------------------------------------------------------

ALTER TABLE guests
  ADD COLUMN email_normalised text GENERATED ALWAYS AS (NULLIF(lower(btrim(email)), '')) STORED,
  ADD COLUMN phone_normalised text GENERATED ALWAYS AS (NULLIF(regexp_replace(phone, '[^0-9+]', '', 'g'), '')) STORED;
CREATE UNIQUE INDEX guests_event_email_unique
  ON guests (tenant_id, event_id, email_normalised)
  WHERE email_normalised IS NOT NULL AND anonymised_at IS NULL;
CREATE UNIQUE INDEX guests_event_phone_unique
  ON guests (tenant_id, event_id, phone_normalised)
  WHERE phone_normalised IS NOT NULL AND anonymised_at IS NULL;

-- ---------------------------------------------------------------------------------------------
-- Guest invites. The link holds a random 256-bit token; only its SHA-256 hash is stored, so a
-- database read cannot recreate a link. At most one live invite per guest (revoke, then reissue).
-- ---------------------------------------------------------------------------------------------

CREATE TABLE guest_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  event_id     uuid NOT NULL,
  guest_id     uuid NOT NULL,
  token_hash   bytea NOT NULL UNIQUE CHECK (length(token_hash) = 32),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, event_id, guest_id)
    REFERENCES guests (tenant_id, event_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX guest_invites_one_live_per_guest
  ON guest_invites (guest_id) WHERE revoked_at IS NULL;
CREATE INDEX guest_invites_event_idx ON guest_invites (tenant_id, event_id);

-- Erasing a guest (app.anonymise_guest, 0001) must also kill their link. A trigger keeps that
-- inside the same transaction without changing the 0001 function. It runs as the caller, so
-- row-level security still limits it to the current tenant.
CREATE FUNCTION app.revoke_invites_on_anonymise() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
  AS $$
  BEGIN
    UPDATE guest_invites SET revoked_at = now() WHERE guest_id = NEW.id AND revoked_at IS NULL;
    RETURN NEW;
  END
  $$;
CREATE TRIGGER guests_revoke_invites AFTER UPDATE OF anonymised_at ON guests
  FOR EACH ROW WHEN (OLD.anonymised_at IS NULL AND NEW.anonymised_at IS NOT NULL)
  EXECUTE FUNCTION app.revoke_invites_on_anonymise();

-- ---------------------------------------------------------------------------------------------
-- Consent records: append-only history. Current state = the newest row per guest, purpose and
-- channel. A withdrawal is a new row with action 'withdrawn'. No free text, no personal data.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  event_id        uuid NOT NULL,
  guest_id        uuid NOT NULL,
  purpose         text NOT NULL CHECK (purpose IN ('event_messages', 'access_needs')),
  channel         text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'web')),
  action          text NOT NULL CHECK (action IN ('given', 'withdrawn')),
  wording_version text NOT NULL CHECK (length(wording_version) BETWEEN 1 AND 50),
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, event_id, guest_id)
    REFERENCES guests (tenant_id, event_id, id) ON DELETE RESTRICT
);
CREATE INDEX consent_records_guest_idx ON consent_records (tenant_id, guest_id, purpose, channel, recorded_at DESC);

-- ---------------------------------------------------------------------------------------------
-- Suppressions: addresses that must not be messaged (unsubscribed, bounced, complained).
-- Stored as a keyed hash computed by the API (the key is a secret), never as the address.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE suppressions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT,
  channel      text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  address_hash bytea NOT NULL CHECK (length(address_hash) = 32),
  reason       text NOT NULL CHECK (reason IN ('unsubscribed', 'bounced', 'complaint')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, address_hash)
);

-- ---------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['venues', 'consent_records', 'suppressions'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = app.current_tenant_id()) '
      'WITH CHECK (tenant_id = app.current_tenant_id())', t);
  END LOOP;
END $$;

-- guest_invites: ENABLE only, not FORCE, like `users` in 0001. The lookup function below runs as the
-- table owner with no tenant context yet, and has to find the invite. hostpointe_app is not the
-- owner, so every normal API query is still filtered by this policy.
ALTER TABLE guest_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON guest_invites
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- ---------------------------------------------------------------------------------------------
-- Invite lookup for public RSVP pages (no signed-in user). The caller sends the SHA-256 hash of
-- the token from the link. Returns the tenant, event and guest of a live invite, or no row.
-- It returns no other data. The API then sets app.tenant_id and continues under normal RLS.
-- Same answer for unknown, expired and revoked tokens, so a caller cannot tell them apart.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION app.resolve_invite(p_token_hash bytea)
  RETURNS TABLE (tenant_id uuid, event_id uuid, guest_id uuid)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = pg_catalog, public
  AS $$
    UPDATE public.guest_invites i
       SET last_used_at = now()
     WHERE i.token_hash = p_token_hash
       AND i.revoked_at IS NULL
       AND i.expires_at > now()
    RETURNING i.tenant_id, i.event_id, i.guest_id
  $$;

REVOKE ALL ON FUNCTION app.resolve_invite(bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_invite(bytea) TO hostpointe_app;

-- ---------------------------------------------------------------------------------------------
-- Grants. consent_records is insert-and-read only (append-only). Invites and venues can be changed.
-- ---------------------------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON venues TO hostpointe_app;
GRANT SELECT, INSERT, UPDATE ON guest_invites TO hostpointe_app;
GRANT SELECT, INSERT ON consent_records TO hostpointe_app;
GRANT SELECT, INSERT, DELETE ON suppressions TO hostpointe_app;

-- Down Migration
-- Rollback for the up section. Destroys all data in the tables below (escalate before running anywhere
-- except a local database, CLAUDE.md rule 10).

DROP FUNCTION app.resolve_invite(bytea);
DROP TRIGGER guests_revoke_invites ON guests;
DROP FUNCTION app.revoke_invites_on_anonymise();
DROP TABLE suppressions;
DROP TABLE consent_records;
DROP TABLE guest_invites;
DROP INDEX guests_event_phone_unique;
DROP INDEX guests_event_email_unique;
ALTER TABLE guests DROP COLUMN phone_normalised, DROP COLUMN email_normalised;
ALTER TABLE event_occurrences DROP CONSTRAINT event_occurrences_venue_fk;
ALTER TABLE event_occurrences DROP COLUMN venue_id;
DROP TABLE venues;
