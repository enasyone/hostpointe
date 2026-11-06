import { describe, test } from 'vitest';

describe('P0-07 PostgreSQL row-level security proof', () => {
  test.todo('application role with tenant A context cannot select tenant B rows on tenant-owned tables');
  test.todo('application role with tenant A context cannot insert, update or delete tenant B rows');
  test.todo('application role with no tenant context sees no tenant-owned rows');
  test.todo('malformed tenant context fails closed');
  test.todo('transaction-local tenant context does not leak through a reused pooled connection');
  test.todo('application role has neither superuser, table-owner nor BYPASSRLS privileges');
});

describe('AT-03 PostgreSQL duplicate check-in invariants', () => {
  test.todo('Day 1 and Day 2 check-ins succeed while a second Day 1 check-in is rejected and Day 3 stays empty');
  test.todo('reusing a device idempotency key cannot create another check-in');
  test.todo('cross-tenant and cross-event occurrence, session, guest and credential combinations are rejected');
});
