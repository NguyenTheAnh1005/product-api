import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { eligibleRelease } from './local-cd-policy.js';

const repository = process.env.GITHUB_REPOSITORY;
const namespace = process.env.DOCKERHUB_NAMESPACE;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '') ||
    !/^[a-z0-9][a-z0-9_-]*$/.test(namespace || '')) {
  throw new Error('Set GITHUB_REPOSITORY and DOCKERHUB_NAMESPACE in .env');
}
const interval = Number(process.env.CD_POLL_SECONDS || 300);
if (!Number.isInteger(interval) || interval < 60) throw new Error('CD_POLL_SECONDS must be an integer >= 60');
const statePath = '.cache/local-deploy-state.json';
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const headers = { 'User-Agent': 'product-api-local-cd', Accept: 'application/vnd.github+json' };
// Optional for private repositories; never write this token to logs or state.
if (process.env.GITHUB_READ_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_READ_TOKEN}`;
async function api(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}
const docker = (...args) => execFileSync('docker', args, { stdio: 'inherit', env: process.env });

async function poll() {
  const runs = await api('/actions/workflows/test-productci-prod.yml/runs?branch=main&status=completed&per_page=10');
  const candidate = runs.workflow_runs.find(run => run.conclusion === 'success' &&
    ['push', 'workflow_dispatch'].includes(run.event) && run.head_repository?.full_name === repository);
  if (!candidate) { console.log('No successful release workflow yet; no deployment performed'); return; }
  if (state.repository === repository && state.sha === candidate.head_sha) return;
  const { jobs } = await api(`/actions/runs/${candidate.id}/jobs?per_page=100`);
  if (!eligibleRelease(candidate, jobs, repository)) {
    console.log('Publish job did not succeed; no deployment performed'); return;
  }
  const image = `${namespace}/product-api:${candidate.head_sha}`;
  docker('pull', image);
  const digest = execFileSync('docker', ['image', 'inspect', image, '--format', '{{index .RepoDigests 0}}'], { encoding: 'utf8' }).trim();
  if (!digest.startsWith(`${namespace}/product-api@sha256:`) || !/@sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error('Unexpected registry digest');
  }
  process.env.PRODUCT_IMAGE = digest;
  const compose = (...args) => docker('compose', '-f', 'docker-compose-prod.yaml', ...args);
  compose('pull');
  compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120');
  compose('exec', '-T', 'api', 'node', 'scripts/health.js');
  Object.assign(state, { repository, sha: candidate.head_sha, image: digest, run: candidate.html_url });
  mkdirSync('.cache', { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  console.log(`Local CD healthy: ${digest}; workflow ${candidate.html_url}`);
}

do {
  try { await poll(); }
  catch (error) {
    console.error(`Local CD failed: ${error.message}`);
    if (process.argv.includes('--once')) { process.exitCode = 1; break; }
  }
  if (process.argv.includes('--once')) break;
  await new Promise(resolve => setTimeout(resolve, interval * 1000));
} while (true);
