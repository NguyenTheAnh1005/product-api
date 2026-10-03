import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibleRelease } from '../scripts/local-cd-policy.js';
const repository = 'owner/product-api';
const run = { head_branch: 'main', conclusion: 'success', event: 'push',
  head_repository: { full_name: repository }, head_sha: 'a'.repeat(40) };
const jobs = [{ name: 'publish', status: 'completed', conclusion: 'success' }];
test('Local CD accepts only successful main release from configured repository', () => {
  assert.equal(eligibleRelease(run, jobs, repository), true);
  for (const patch of [ { event: 'pull_request' }, { head_branch: 'feature' }, { conclusion: 'failure' },
    { head_repository: { full_name: 'fork/product-api' } }, { head_sha: 'not-a-commit' } ]) {
    assert.equal(eligibleRelease({ ...run, ...patch }, jobs, repository), false);
  }
});
test('Skipped, pending or failed publish never permits deployment', () => {
  for (const conclusion of ['skipped', 'failure', null]) {
    assert.equal(eligibleRelease(run, [{ ...jobs[0], conclusion }], repository), false);
  }
  assert.equal(eligibleRelease(run, [], repository), false);
  assert.equal(eligibleRelease(run, [{ ...jobs[0], status: 'in_progress' }], repository), false);
});
