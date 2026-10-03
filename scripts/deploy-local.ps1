param([Parameter(Mandatory=$true)][string]$Image)
$ErrorActionPreference = 'Stop'
if ($Image -notmatch '^[a-z0-9][a-z0-9._/-]+(@sha256:[a-f0-9]{64}|:[a-f0-9]{40})$') {
  throw 'Use a Docker Hub image pinned to a full commit SHA or sha256 digest.'
}
$env:PRODUCT_IMAGE = $Image
$composeFile = Join-Path $PSScriptRoot '..\docker-compose-prod.yaml'
$engineType = docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker Engine unavailable' }
if ($engineType -ne 'linux') { throw 'Docker Engine must run Linux containers' }
docker compose -f $composeFile config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Invalid Compose configuration' }
docker compose -f $composeFile pull
if ($LASTEXITCODE -ne 0) { throw 'Image pull failed' }
docker compose -f $composeFile up -d --no-build --wait --wait-timeout 120
if ($LASTEXITCODE -ne 0) { throw 'Deployment did not become healthy' }
docker compose -f $composeFile exec -T api node scripts/health.js
if ($LASTEXITCODE -ne 0) { throw 'Post-deployment health check failed' }
docker compose -f $composeFile ps
if ($LASTEXITCODE -ne 0) { throw 'Container inspection failed' }
