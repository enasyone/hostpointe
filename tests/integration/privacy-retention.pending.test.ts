import { describe, test } from 'vitest';

describe('guest anonymisation through hostpointe_app', () => {
  test.todo('anonymise_guest removes identifying fields and records anonymised_at for the current tenant');
  test.todo('anonymise_guest revokes credentials and clears every credential lookup hash');
  test.todo('anonymise_guest preserves all check-ins and writes one allowed audit event');
  test.todo('a repeated anonymise_guest call returns false and makes no further changes');
  test.todo('tenant A cannot anonymise or otherwise change tenant B guest data');
});

describe('24-month audit retention through hostpointe_purge', () => {
  test.todo('purge role has no superuser, ownership or BYPASSRLS privileges');
  test.todo('purge role deletes only audit rows strictly older than 24 months across tenants');
  test.todo('recent and exact-24-month-boundary audit rows remain even when tenant context is set');
  test.todo('purge role can select occurred_at but cannot read audit content columns');
  test.todo('purge role cannot insert, update or truncate audit events or access application tables');
});

describe('audit metadata allow-list', () => {
  test.todo('empty metadata and allowed keys with lower-case token values are accepted');
  test.todo('unknown or identifying metadata keys are rejected');
  test.todo('email-like, name-like, uppercase, spaced, punctuated and overlong values are rejected');
  test.todo('non-string, array and nested metadata values are rejected');
});

describe('D-017 pilot deletion rehearsal', () => {
  test.todo('representative fake pilot data is deleted or anonymised to the approved scope and a deletion record is produced');
});
