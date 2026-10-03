export function eligibleRelease(run, jobs, repository) {
  return run?.head_branch === 'main' && run.conclusion === 'success' &&
    ['push', 'workflow_dispatch'].includes(run.event) &&
    run.head_repository?.full_name === repository &&
    /^[a-f0-9]{40}$/.test(run.head_sha) &&
    jobs.some(job => job.name === 'publish' && job.status === 'completed' && job.conclusion === 'success');
}
