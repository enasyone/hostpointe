import { describe, test } from 'vitest';

describe('migration 0002 duplicate-contact behaviour', () => {
  test.todo('multiple guests in one event may share a normalised email address');
  test.todo('multiple guests in one event may share a normalised phone number');
});

describe('migration 0002 venues and personal invites', () => {
  test.todo('an occurrence accepts its tenant venue and rejects another tenant venue');
  test.todo('only a 32-byte invite hash is stored and only one live invite exists per guest');
  test.todo('revoking an invite permits reissue and anonymising the guest revokes the live invite');
  test.todo('deleting a deletable guest cascades its invite while consent history restricts guest deletion');
  test.todo('resolve_invite returns only tenant event and guest ids for a live unexpired hash');
  test.todo('resolve_invite gives the same empty result for unknown expired and revoked hashes');
});

describe('migration 0002 consent and suppression controls', () => {
  test.todo('consent requires an approved source and increasing seq determines current state');
  test.todo('application role can insert and read consent but cannot update or delete it');
  test.todo('application role can insert and read suppressions but cannot update or delete them');
});

describe('migration 0002 tenant isolation', () => {
  test.todo('tenant A cannot read or write tenant B venues invites consent records or suppressions');
});
