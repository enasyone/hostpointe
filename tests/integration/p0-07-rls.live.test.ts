import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for the P0-07 row-level security proof');
}

const client = new Client({ connectionString: databaseUrl });

async function setTenant(tenantId: string | null) {
  await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId ?? '']);
}

describe('P0-07 live PostgreSQL row-level security proof', () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  });

  test('hostpointe_api is a least-privilege application login', async () => {
    const result = await client.query<{
      current_user: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      owns_tenant_tables: boolean;
    }>(`
      SELECT current_user,
             r.rolsuper,
             r.rolbypassrls,
             EXISTS (
               SELECT 1
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relname IN ('tenants', 'events', 'guests')
                  AND pg_get_userbyid(c.relowner) = current_user
             ) AS owns_tenant_tables
        FROM pg_roles r
       WHERE r.rolname = current_user
    `);

    expect(result.rows).toEqual([
      {
        current_user: 'hostpointe_api',
        rolsuper: false,
        rolbypassrls: false,
        owns_tenant_tables: false,
      },
    ]);
  });

  test('tenant A cannot read or change tenant B rows and context fails closed', async () => {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const eventA = randomUUID();
    const eventB = randomUUID();
    const guestA = randomUUID();
    const guestB = randomUUID();

    await client.query('BEGIN');
    try {
      await setTenant(tenantA);
      await client.query(
        `INSERT INTO tenants (id, name, country_code, default_currency, default_timezone)
         VALUES ($1, 'QA Tenant A', 'GB', 'GBP', 'Europe/London')`,
        [tenantA],
      );
      await client.query(
        `INSERT INTO events (id, tenant_id, title, category)
         VALUES ($1, $2, 'QA Event A', 'corporate')`,
        [eventA, tenantA],
      );
      await client.query(
        `INSERT INTO guests (id, tenant_id, event_id, full_name)
         VALUES ($1, $2, $3, 'Fake Guest A')`,
        [guestA, tenantA, eventA],
      );

      await setTenant(tenantB);
      await client.query(
        `INSERT INTO tenants (id, name, country_code, default_currency, default_timezone)
         VALUES ($1, 'QA Tenant B', 'NG', 'NGN', 'Africa/Lagos')`,
        [tenantB],
      );
      await client.query(
        `INSERT INTO events (id, tenant_id, title, category)
         VALUES ($1, $2, 'QA Event B', 'corporate')`,
        [eventB, tenantB],
      );
      await client.query(
        `INSERT INTO guests (id, tenant_id, event_id, full_name)
         VALUES ($1, $2, $3, 'Fake Guest B')`,
        [guestB, tenantB, eventB],
      );

      await setTenant(tenantA);
      const visible = await client.query<{ id: string }>('SELECT id FROM guests ORDER BY id');
      expect(visible.rows).toEqual([{ id: guestA }]);

      const forgedRead = await client.query('SELECT id FROM guests WHERE id = $1', [guestB]);
      expect(forgedRead.rowCount).toBe(0);

      const forgedUpdate = await client.query(
        `UPDATE guests SET full_name = 'Cross-tenant change' WHERE id = $1`,
        [guestB],
      );
      expect(forgedUpdate.rowCount).toBe(0);

      await setTenant(null);
      const withoutContext = await client.query('SELECT id FROM guests');
      expect(withoutContext.rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK');
    }

    await client.query('BEGIN');
    try {
      const nextTransaction = await client.query('SELECT id FROM guests');
      expect(nextTransaction.rowCount).toBe(0);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
