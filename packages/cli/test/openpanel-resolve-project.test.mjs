import { test } from 'node:test';
import assert from 'node:assert';
import { resolveProjectId } from '../src/sources/openpanel/client.mjs';

function fakeClient(impl) {
  return { request: impl };
}

test('returns explicit source.project_id when set, skips list call', async () => {
  let called = false;
  const client = fakeClient(async () => {
    called = true;
    return { data: [] };
  });
  const id = await resolveProjectId(client, { project_id: 'proj_explicit' });
  assert.equal(id, 'proj_explicit');
  assert.equal(called, false, 'should not call /manage/projects when project_id is set');
});

test('auto-derives single project from /manage/projects array shape', async () => {
  const client = fakeClient(async (path) => {
    assert.equal(path, '/manage/projects');
    return [{ id: 'proj_only', name: 'My Site' }];
  });
  const id = await resolveProjectId(client, {});
  assert.equal(id, 'proj_only');
});

test('auto-derives from .data wrapper shape', async () => {
  const client = fakeClient(async () => ({ data: [{ id: 'proj_wrapped', slug: 'site' }] }));
  const id = await resolveProjectId(client, {});
  assert.equal(id, 'proj_wrapped');
});

test('throws clear error on zero projects', async () => {
  const client = fakeClient(async () => ({ data: [] }));
  await assert.rejects(
    () => resolveProjectId(client, {}),
    /this client has no project access/,
  );
});

test('throws disambiguation error with summary on multiple projects', async () => {
  const client = fakeClient(async () => [
    { id: 'proj_a', slug: 'alpha' },
    { id: 'proj_b', slug: 'beta' },
  ]);
  await assert.rejects(
    () => resolveProjectId(client, {}),
    /access to 2 projects.*proj_a \(alpha\).*proj_b \(beta\)/,
  );
});

test('wraps underlying request errors with hint', async () => {
  const client = fakeClient(async () => {
    throw new Error('OpenPanel 401 GET /manage/projects: Unauthorized');
  });
  await assert.rejects(
    () => resolveProjectId(client, {}),
    /could not list projects for auto-discovery.*Set source.project_id/s,
  );
});
