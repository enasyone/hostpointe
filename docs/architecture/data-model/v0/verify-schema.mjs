// Throwaway check of the v0 schema on PGlite. Not a project test: tests/ belongs to Codex.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const file = readFileSync(process.argv[2], 'utf8');
const at = file.indexOf('-- Down Migration');
const up = file.slice(0, at), down = file.slice(at);
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const q = async (s, p) => (await db.query(s, p)).rows;
const rejects = async (name, s, p, re) => {
  try { const r = await db.query(s, p); ok(name, false, `(no error, ${r.affectedRows} rows)`); }
  catch (e) { ok(name, !re || re.test(e.message), `-> ${e.message}`); }
};

const A = '00000000-0000-4000-a000-00000000000a', B = '00000000-0000-4000-a000-00000000000b';
const id = (t, n) => `${t === A ? 'aaaaaaaa' : 'bbbbbbbb'}-0000-4000-a000-${String(n).padStart(12, '0')}`;

// Run the migration as a non-superuser owner, as on Azure, so FORCE really applies to the owner.
await db.exec(`CREATE ROLE migrator NOSUPERUSER CREATEROLE; GRANT ALL ON SCHEMA public TO migrator; GRANT CREATE ON DATABASE postgres TO migrator;`);
const asMigrator = async (sql) => { await db.exec('SET ROLE migrator'); await db.exec(`BEGIN;${sql};COMMIT;`); await db.exec('RESET ROLE'); };

await asMigrator(up); ok('up applies', true);
await asMigrator(down);
const left = await q(`SELECT count(*)::int c FROM pg_tables WHERE schemaname='public'`);
const leftSchema = await q(`SELECT count(*)::int c FROM pg_namespace WHERE nspname='app'`);
ok('down removes everything', left[0].c === 0 && leftSchema[0].c === 0);
await asMigrator(up); ok('up applies again after down', true);

const flags = await q(`SELECT relname, relrowsecurity r, relforcerowsecurity f FROM pg_class c JOIN pg_namespace n ON n.oid=relnamespace WHERE nspname='public' AND relkind='r'`);
const by = Object.fromEntries(flags.map(x => [x.relname, x]));
ok('RLS on every table except roles', flags.every(x => x.relname === 'roles' ? !x.r : x.r));
ok('FORCE on every table except roles, users', flags.every(x => ['roles', 'users'].includes(x.relname) ? !x.f : x.f), JSON.stringify(flags.filter(x => !x.f).map(x => x.relname)));
const role = await q(`SELECT rolsuper s, rolbypassrls b, rolcanlogin l FROM pg_roles WHERE rolname='hostpointe_app'`);
ok('app role cannot bypass RLS', !role[0].s && !role[0].b && !role[0].l);

// Fixtures as superuser (superuser bypasses RLS).
const seed = async (t, name) => {
  await db.exec(`
  INSERT INTO tenants (id,name,country_code,default_currency,default_timezone) VALUES ('${t}','${name}','NG','NGN','Africa/Lagos');
  INSERT INTO users (id,identity_issuer,identity_subject,email,display_name) VALUES ('${id(t,1)}','iss','${name}','${name}@example.test','${name} Owner');
  INSERT INTO memberships (tenant_id,user_id,role_key) VALUES ('${t}','${id(t,1)}','owner');
  INSERT INTO events (id,tenant_id,title,category) VALUES ('${id(t,2)}','${t}','Conf','corporate'),('${id(t,3)}','${t}','Other','personal');
  INSERT INTO event_series (id,tenant_id,event_id,rrule,timezone,first_local_start,duration_minutes) VALUES ('${id(t,4)}','${t}','${id(t,2)}','FREQ=DAILY;COUNT=3','Africa/Lagos','2026-12-01 09:00',480),('${id(t,5)}','${t}','${id(t,3)}',NULL,'Africa/Lagos','2026-12-05 09:00',60);
  INSERT INTO event_occurrences (id,tenant_id,event_id,series_id,recurrence_local_start,timezone,local_start,starts_at,ends_at) VALUES
   ('${id(t,6)}','${t}','${id(t,2)}','${id(t,4)}','2026-12-01 09:00','Africa/Lagos','2026-12-01 09:00','2026-12-01 08:00Z','2026-12-01 16:00Z'),
   ('${id(t,7)}','${t}','${id(t,2)}','${id(t,4)}','2026-12-02 09:00','Africa/Lagos','2026-12-02 09:00','2026-12-02 08:00Z','2026-12-02 16:00Z'),
   ('${id(t,8)}','${t}','${id(t,3)}','${id(t,5)}','2026-12-05 09:00','Africa/Lagos','2026-12-05 09:00','2026-12-05 08:00Z','2026-12-05 09:00Z');
  INSERT INTO sessions (id,tenant_id,event_id,occurrence_id,title,timezone,local_start,starts_at,ends_at) VALUES ('${id(t,9)}','${t}','${id(t,2)}','${id(t,6)}','Talk','Africa/Lagos','2026-12-01 10:00','2026-12-01 09:00Z','2026-12-01 10:00Z');
  INSERT INTO guests (id,tenant_id,event_id,full_name) VALUES ('${id(t,10)}','${t}','${id(t,2)}','Fake Guest ${name}'),('${id(t,11)}','${t}','${id(t,3)}','Fake Other'),('${id(t,12)}','${t}','${id(t,2)}','Fake Second');
  INSERT INTO credentials (id,tenant_id,event_id,guest_id,kind) VALUES ('${id(t,13)}','${t}','${id(t,2)}','${id(t,10)}','qr'),('${id(t,14)}','${t}','${id(t,2)}','${id(t,12)}','qr');
  INSERT INTO audit_events (tenant_id,action,entity_type) VALUES ('${t}','seed','tenant');`);
};
await seed(A, 'alpha'); await seed(B, 'beta');
await db.exec(`INSERT INTO check_ins (tenant_id,event_id,occurrence_id,guest_id,credential_id,method,idempotency_key,scanned_at) VALUES ('${B}','${id(B,2)}','${id(B,6)}','${id(B,10)}','${id(B,13)}','qr',gen_random_uuid(),now())`);

const ctx = async (tenant, user) => { await db.exec(`RESET ROLE; SET ROLE hostpointe_app; SELECT set_config('app.tenant_id','${tenant ?? ''}',false), set_config('app.user_id','${user ?? ''}',false);`); };
const tables = ['tenants','memberships','events','event_series','event_occurrences','sessions','guests','credentials','check_ins','audit_events','users'];

await ctx(null, null);
for (const t of tables) ok(`no context: ${t} returns 0 rows`, (await q(`SELECT count(*)::int c FROM ${t}`))[0].c === 0);

await ctx(A, id(A,1));
for (const t of tables.filter(x => !['tenants','users'].includes(x))) {
  const rows = await q(`SELECT DISTINCT tenant_id FROM ${t}`);
  ok(`tenant A sees no tenant B rows: ${t}`, rows.every(r => r.tenant_id === A), `(${rows.length} tenant(s) visible)`);
}
ok('tenant A: tenants shows only A', (await q('SELECT id FROM tenants')).map(r => r.id).join() === A);
ok('tenant A: users shows only A members', (await q('SELECT id FROM users')).map(r => r.id).join() === id(A,1));
ok("tenant A cannot read B's guest by id", (await q(`SELECT * FROM guests WHERE id='${id(B,10)}'`)).length === 0);
const upd = await db.query(`UPDATE guests SET full_name='hacked' WHERE id='${id(B,10)}'`); ok("tenant A update of B's guest touches 0 rows", upd.affectedRows === 0);
const del = await db.query(`DELETE FROM guests WHERE tenant_id='${B}'`); ok("tenant A delete of B's guests touches 0 rows", del.affectedRows === 0);
await rejects('forged insert with tenant_id B refused', `INSERT INTO events (tenant_id,title,category) VALUES ('${B}','x','personal')`, undefined, /row-level security/);
await rejects('moving own row to tenant B refused', `UPDATE events SET tenant_id='${B}' WHERE id='${id(A,2)}'`, undefined, /row-level security|foreign key/);
await rejects('own guest pointing at B event refused', `INSERT INTO guests (tenant_id,event_id,full_name) VALUES ('${A}','${id(B,2)}','x')`, undefined, /foreign key/);

// Check-in invariant (AT-03).
const ci = (o, g, c, s = null, key = 'gen_random_uuid()') => `INSERT INTO check_ins (tenant_id,event_id,occurrence_id,session_id,guest_id,credential_id,method,idempotency_key,scanned_at) VALUES ('${A}','${id(A,2)}','${o}',${s ? `'${s}'` : 'NULL'},'${g}','${c}','qr',${key},now())`;
await db.exec(ci(id(A,6), id(A,10), id(A,13))); ok('Day 1 check-in accepted', true);
await rejects('second Day 1 check-in blocked', ci(id(A,6), id(A,10), id(A,13)), undefined, /check_ins_one_per_guest_occurrence_session/);
await db.exec(ci(id(A,7), id(A,10), id(A,13))); ok('Day 2 check-in accepted', true);
await db.exec(ci(id(A,6), id(A,10), id(A,13), id(A,9))); ok('session check-in accepted alongside the day', true);
await rejects('second session check-in blocked', ci(id(A,6), id(A,10), id(A,13), id(A,9)), undefined, /check_ins_one_per_guest_occurrence_session/);
const key = "'11111111-1111-4111-a111-111111111111'";
await db.exec(ci(id(A,6), id(A,12), id(A,14), null, key));
await rejects('retry with same idempotency key blocked', ci(id(A,7), id(A,12), id(A,14), null, key), undefined, /check_ins_idempotency_unique/);
await rejects('occurrence from another event refused', ci(id(A,8), id(A,10), id(A,13)), undefined, /foreign key/);
await rejects("another guest's credential refused", ci(id(A,7), id(A,12), id(A,13)), undefined, /foreign key/);
await rejects('session from another date refused', ci(id(A,7), id(A,10), id(A,13), id(A,9)), undefined, /foreign key/);
await rejects('non-staff check-in without credential refused', `INSERT INTO check_ins (tenant_id,event_id,occurrence_id,guest_id,method,idempotency_key,scanned_at) VALUES ('${A}','${id(A,3)}','${id(A,8)}','${id(A,11)}','qr',gen_random_uuid(),now())`, undefined, /check constraint/);
await db.exec(`INSERT INTO check_ins (tenant_id,event_id,occurrence_id,guest_id,method,idempotency_key,scanned_at) VALUES ('${A}','${id(A,3)}','${id(A,8)}','${id(A,11)}','staff_lookup',gen_random_uuid(),now())`); ok('staff lookup without credential accepted (AT-11)', true);

// Append-only and retention of attendance.
await rejects('check_ins cannot be updated', `UPDATE check_ins SET method='qr'`, undefined, /permission denied/);
await rejects('check_ins cannot be deleted', `DELETE FROM check_ins`, undefined, /permission denied/);
await rejects('audit_events cannot be updated', `UPDATE audit_events SET action='x'`, undefined, /permission denied/);
await rejects('audit_events cannot be deleted', `DELETE FROM audit_events`, undefined, /permission denied/);
await rejects('audit_events cannot be truncated', `TRUNCATE audit_events`, undefined, /permission denied/);
await rejects('occurrence with attendance cannot be deleted', `DELETE FROM event_occurrences WHERE id='${id(A,6)}'`, undefined, /foreign key/);
await rejects('second active qr for a guest refused', `INSERT INTO credentials (tenant_id,event_id,guest_id,kind) VALUES ('${A}','${id(A,2)}','${id(A,10)}','qr')`, undefined, /credentials_one_active_per_kind/);
await rejects('revoked without timestamp refused', `UPDATE credentials SET status='revoked' WHERE id='${id(A,13)}'`, undefined, /check constraint/);

// Moving and skipping a date (AT-06).
await db.exec(`UPDATE event_occurrences SET local_start='2026-12-03 09:00', starts_at='2026-12-03 08:00Z', ends_at='2026-12-03 16:00Z' WHERE id='${id(A,7)}'`);
const m = (await q(`SELECT local_date::text d, recurrence_local_start::text r FROM event_occurrences WHERE id='${id(A,7)}'`))[0];
ok('moved date keeps its identity, local_date follows', m.d === '2026-12-03' && m.r.startsWith('2026-12-02'), JSON.stringify(m));
const att = (await q(`SELECT count(*)::int c FROM check_ins WHERE occurrence_id='${id(A,7)}'`))[0].c;
ok('moved date keeps its attendance', att === 1);
// A local date differing from its UTC day: 00:30 in Lagos is 23:30 UTC the day before.
await db.exec(`INSERT INTO event_occurrences (tenant_id,event_id,series_id,recurrence_local_start,timezone,local_start,starts_at,ends_at) VALUES ('${A}','${id(A,2)}','${id(A,4)}','2026-12-10 00:30','Africa/Lagos','2026-12-10 00:30','2026-12-09 23:30Z','2026-12-10 01:30Z')`);
ok('local_date is local, not the UTC day', (await q(`SELECT local_date::text d FROM event_occurrences WHERE recurrence_local_start='2026-12-10 00:30'`))[0].d === '2026-12-10');

// Before a tenant is chosen.
await ctx(null, id(A,1));
ok('signed-in user with no tenant lists own memberships only', (await q('SELECT tenant_id FROM memberships')).map(r => r.tenant_id).join() === A);
ok('signed-in user with no tenant lists own tenants only', (await q('SELECT id FROM tenants')).map(r => r.id).join() === A);
ok('signed-in user with no tenant sees no events', (await q('SELECT id FROM events')).length === 0);
await rejects('user context alone cannot add a membership', `INSERT INTO memberships (tenant_id,user_id,role_key) VALUES ('${B}','${id(A,1)}','owner')`, undefined, /row-level security/);

// Sign-in provisioning through the definer function, as the app role.
await ctx(null, null);
const u1 = (await q(`SELECT app.upsert_user_from_identity('iss','new','new@example.test','New') id`))[0].id;
const u2 = (await q(`SELECT app.upsert_user_from_identity('iss','new','new2@example.test','New') id`))[0].id;
ok('sign-in provisioning is idempotent', u1 && u1 === u2);
await rejects('direct user insert refused', `INSERT INTO users (identity_issuer,identity_subject,email,display_name) VALUES ('i','s','e','d')`, undefined, /permission denied/);
await rejects('roles are read-only', `UPDATE roles SET description='x'`, undefined, /permission denied/);

// New tenant creation by the app role, and a malformed context failing closed.
const N = '00000000-0000-4000-a000-00000000000c';
await ctx(N, u1);
await db.exec(`INSERT INTO tenants (id,name,country_code,default_currency,default_timezone) VALUES ('${N}','New','GB','GBP','Europe/London'); INSERT INTO memberships (tenant_id,user_id,role_key) VALUES ('${N}','${u1}','owner');`);
ok('new tenant and owner membership can be created', (await q('SELECT count(*)::int c FROM memberships'))[0].c === 1);
await db.exec(`SELECT set_config('app.tenant_id','not-a-uuid',false)`);
await rejects('malformed tenant context fails closed', 'SELECT * FROM guests', undefined, /invalid input syntax/);

// Osaretin's conditions C-1 and C-2 (REVIEW-0001).
await ctx(A, id(A,1));
await rejects('audit metadata: unknown key refused', `INSERT INTO audit_events (tenant_id,action,entity_type,metadata) VALUES ('${A}','x','y','{"email":"a"}')`, undefined, /check constraint/);
await rejects('audit metadata: personal value refused', `INSERT INTO audit_events (tenant_id,action,entity_type,metadata) VALUES ('${A}','x','y','{"method":"Ada Obi"}')`, undefined, /check constraint/);
await rejects('audit metadata: nested value refused', `INSERT INTO audit_events (tenant_id,action,entity_type,metadata) VALUES ('${A}','x','y','{"method":{"a":"b"}}')`, undefined, /check constraint/);
await rejects('audit action: free text refused', `INSERT INTO audit_events (tenant_id,action,entity_type) VALUES ('${A}','Ada Obi left','y')`, undefined, /check constraint/);
await db.exec(`INSERT INTO audit_events (tenant_id,action,entity_type,metadata) VALUES ('${A}','check_in.created','check_in','{"method":"qr"}')`); ok('audit metadata: allowed key accepted', true);
await db.exec(`INSERT INTO credentials (tenant_id,event_id,guest_id,kind,lookup_hash) VALUES ('${A}','${id(A,2)}','${id(A,10)}','short_code','\\x01')`);
await db.exec(`UPDATE guests SET email='fake@example.test', phone='07700900000' WHERE id='${id(A,10)}'`);
const before = (await q(`SELECT count(*)::int c FROM check_ins WHERE guest_id='${id(A,10)}'`))[0].c;
ok('anonymise: returns true', (await q(`SELECT app.anonymise_guest('${id(A,10)}') r`))[0].r === true);
const ag = (await q(`SELECT full_name,email,phone,anonymised_at FROM guests WHERE id='${id(A,10)}'`))[0];
ok('anonymise: identifying fields gone', ag.full_name === 'Anonymised guest' && ag.email === null && ag.phone === null && ag.anonymised_at);
const ac = await q(`SELECT status,lookup_hash FROM credentials WHERE guest_id='${id(A,10)}'`);
ok('anonymise: credentials revoked, hashes gone', ac.length === 2 && ac.every(c => c.status === 'revoked' && c.lookup_hash === null));
ok('anonymise: check-ins kept', (await q(`SELECT count(*)::int c FROM check_ins WHERE guest_id='${id(A,10)}'`))[0].c === before && before > 0);
ok('anonymise: audit event written', (await q(`SELECT count(*)::int c FROM audit_events WHERE action='guest.anonymised' AND entity_id='${id(A,10)}'`))[0].c === 1);
ok('anonymise: second call returns false', (await q(`SELECT app.anonymise_guest('${id(A,10)}') r`))[0].r === false);
ok("anonymise: another tenant's guest untouched", (await q(`SELECT app.anonymise_guest('${id(B,10)}') r`))[0].r === false);
await rejects('anonymised guest cannot regain an email', `UPDATE guests SET email='x@example.test' WHERE id='${id(A,10)}'`, undefined, /check constraint/);
await db.exec(`RESET ROLE`);
ok("anonymise: B's guest name intact", (await q(`SELECT full_name FROM guests WHERE id='${id(B,10)}'`))[0].full_name !== 'Anonymised guest');

// Purge role.
const OLD = id(A,50), NEW = id(A,51);
await db.exec(`INSERT INTO audit_events (id,tenant_id,action,entity_type,occurred_at) VALUES ('${OLD}','${A}','old','x',now()-interval '25 months'),('${NEW}','${A}','recent','x',now()-interval '23 months')`);
await db.exec(`SET ROLE hostpointe_purge; SELECT set_config('app.tenant_id','${A}',false)`);
await rejects('purge: cannot read audit content', `SELECT action FROM audit_events`, undefined, /permission denied/);
await rejects('purge: cannot read guests', `SELECT * FROM guests`, undefined, /permission denied/);
await rejects('purge: cannot insert audit rows', `INSERT INTO audit_events (tenant_id,action,entity_type) VALUES ('${A}','x','y')`, undefined, /permission denied/);
const pr = await db.query(`DELETE FROM audit_events WHERE occurred_at < now()`);
ok('purge: deletes only rows older than 24 months, even with a tenant context set', pr.affectedRows === 1, `(${pr.affectedRows} deleted)`);
await db.exec('RESET ROLE');
const gone = (await q(`SELECT id FROM audit_events WHERE id IN ('${OLD}','${NEW}')`)).map(r => r.id);
ok('purge: old row gone, recent row kept', gone.join() === NEW);
await db.exec(`SET ROLE hostpointe_app; SELECT set_config('app.tenant_id','${A}',false)`);
await rejects('app role still cannot delete old audit rows', `DELETE FROM audit_events`, undefined, /permission denied/);
await db.exec('RESET ROLE');

// FORCE: the owner is also bound by the policies.
await db.exec(`RESET ROLE; SET ROLE migrator; SELECT set_config('app.tenant_id','',false), set_config('app.user_id','',false)`);
ok('table owner with no context sees 0 guests (FORCE)', (await q('SELECT count(*)::int c FROM guests'))[0].c === 0);
await db.exec('RESET ROLE');

console.log(`\n${pass} passed, ${fail} failed`);
console.log((await q('SELECT version()'))[0].version);
process.exit(fail ? 1 : 0);
