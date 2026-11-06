// FAKE seed data for development databases only (DEMO). Every name, email and phone here is invented.
// Run with the owner login: MIGRATION_DATABASE_URL (loaded from the repository root .env if present).
// Safe to run twice: fixed ids and ON CONFLICT DO NOTHING. Refuses to run unless APP_ENV is development or test (unset is refused).
// Row-level security is forced even for the owner, so each tenant's rows are written with that
// tenant's context set inside one transaction.
import pg from 'pg';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
if (process.env.APP_ENV !== 'development' && process.env.APP_ENV !== 'test') {
  console.error('Refusing to seed fake data unless APP_ENV is development or test.');
  process.exit(1);
}
if (!process.env.MIGRATION_DATABASE_URL) {
  console.error('MIGRATION_DATABASE_URL is not set.');
  process.exit(1);
}

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tenants = [
  { n: 1, name: 'DEMO Riverside Church', country: 'GB', currency: 'GBP', tz: 'Europe/London', person: 'Demo Organiser One' },
  { n: 2, name: 'DEMO Lagos Events Ltd', country: 'NG', currency: 'NGN', tz: 'Africa/Lagos', person: 'Demo Organiser Two' },
];

const client = new pg.Client({ connectionString: process.env.MIGRATION_DATABASE_URL });
await client.connect();
try {
  for (const t of tenants) {
    const base = t.n * 1000;
    const tenantId = id(base + 1), userId = id(base + 2), eventId = id(base + 3), seriesId = id(base + 4),
      occId = id(base + 5), venueId = id(base + 6);
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    await client.query(
      `INSERT INTO tenants (id, name, country_code, default_currency, default_timezone)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [tenantId, t.name, t.country, t.currency, t.tz]);
    await client.query(
      `INSERT INTO users (id, identity_issuer, identity_subject, email, display_name)
       VALUES ($1,'demo-seed',$2,$3,$4) ON CONFLICT DO NOTHING`,
      [userId, `demo-subject-${t.n}`, `organiser${t.n}@example.invalid`, t.person]);
    await client.query(
      `INSERT INTO memberships (tenant_id, user_id, role_key) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`,
      [tenantId, userId]);
    await client.query(
      `INSERT INTO events (id, tenant_id, title, category, status) VALUES ($1,$2,$3,'personal','published')
       ON CONFLICT DO NOTHING`, [eventId, tenantId, `DEMO Open Day ${t.n}`]);
    await client.query(
      `INSERT INTO event_series (id, tenant_id, event_id, timezone, first_local_start, duration_minutes)
       VALUES ($1,$2,$3,$4,'2026-12-05 10:00',120) ON CONFLICT DO NOTHING`, [seriesId, tenantId, eventId, t.tz]);
    // Occurrence times are fixed UTC instants good enough for demo data; the real API computes them in packages/domain.
    await client.query(
      `INSERT INTO venues (id, tenant_id, name, address, timezone) VALUES ($1,$2,'DEMO Hall','1 Example Street',$3)
       ON CONFLICT DO NOTHING`, [venueId, tenantId, t.tz]);
    await client.query(
      `INSERT INTO event_occurrences (id, tenant_id, event_id, series_id, recurrence_local_start, timezone,
         local_start, starts_at, ends_at, venue_id)
       VALUES ($1,$2,$3,$4,'2026-12-05 10:00',$5,'2026-12-05 10:00','2026-12-05 09:00+00','2026-12-05 11:00+00',$6)
       ON CONFLICT DO NOTHING`, [occId, tenantId, eventId, seriesId, t.tz, venueId]);
    const names = ['Ada Demo', 'Bola Sample', 'Chidi Example', 'Dayo Placeholder'];
    for (let i = 0; i < names.length; i++) {
      const guestId = id(base + 100 + i), credId = id(base + 200 + i);
      await client.query(
        `INSERT INTO guests (id, tenant_id, event_id, full_name, email, phone, rsvp_status)
         VALUES ($1,$2,$3,$4,$5,$6,'yes') ON CONFLICT DO NOTHING`,
        [guestId, tenantId, eventId, names[i], `guest${t.n}${i}@example.invalid`, `+447700900${t.n}0${i}`]);
      await client.query(
        `INSERT INTO credentials (id, tenant_id, event_id, guest_id, kind) VALUES ($1,$2,$3,$4,'qr')
         ON CONFLICT DO NOTHING`, [credId, tenantId, eventId, guestId]);
      await client.query(
        `INSERT INTO consent_records (tenant_id, event_id, guest_id, purpose, channel, action, wording_version, source)
         SELECT $1,$2,$3,'event_messages','email','given','demo-v1','organiser_entry'
          WHERE NOT EXISTS (SELECT 1 FROM consent_records WHERE guest_id = $3)`, [tenantId, eventId, guestId]);
      if (i < 2) {
        await client.query(
          `INSERT INTO check_ins (id, tenant_id, event_id, occurrence_id, guest_id, credential_id, method,
             checked_in_by, idempotency_key, scanned_at)
           VALUES ($1,$2,$3,$4,$5,$6,'qr',$7,$8,'2026-12-05 09:30+00') ON CONFLICT DO NOTHING`,
          [id(base + 300 + i), tenantId, eventId, occId, guestId, credId, userId, id(base + 400 + i)]);
      }
    }
    await client.query('COMMIT');
  }
  // audit_events accepts rows only from the API role (its policy excludes the owner), so write them
  // through DATABASE_URL (hostpointe_api) with the tenant set. Skipped if that variable is not set.
  if (process.env.DATABASE_URL) {
    const api = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await api.connect();
    try {
      for (const t of tenants) {
        const base = t.n * 1000;
        await api.query('BEGIN');
        await api.query("SELECT set_config('app.tenant_id', $1, true)", [id(base + 1)]);
        for (let i = 0; i < 2; i++) {
          await api.query(
            `INSERT INTO audit_events (id, tenant_id, actor_user_id, action, entity_type, entity_id)
             VALUES ($1,$2,$3,'check_in.created','check_in',$4) ON CONFLICT DO NOTHING`,
            [id(base + 500 + i), id(base + 1), id(base + 2), id(base + 300 + i)]);
        }
        await api.query('COMMIT');
      }
    } catch (err) {
      await api.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      await api.end();
    }
  } else {
    console.log('DATABASE_URL not set: audit events not seeded.');
  }
  const counts = await client.query(
    `SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public') AS tables`);
  console.log(`Seeded ${tenants.length} DEMO tenants (fake data).`, counts.rows[0].tables, 'tables present.');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  throw err;
} finally {
  await client.end();
}
