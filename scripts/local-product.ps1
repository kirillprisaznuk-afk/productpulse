param([ValidateSet('start','stop')][string]$Action = 'start', [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$project = 'productpulse-local'
$envFile = Join-Path $root '.runtime/local.env'
try {
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    $dockerExecutable = if ($dockerCommand) { $dockerCommand.Source } else { $null }
    if (-not $dockerExecutable) {
        $candidates = @(
            (Join-Path $env:ProgramFiles 'Docker/Docker/resources/bin/docker.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe')
        )
        $dockerExecutable = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (-not $dockerExecutable) { throw 'Install Docker Desktop and open it, then try again.' }
    & $dockerExecutable info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not ready. Start Docker Desktop, then try again.' }
    & $dockerExecutable compose version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }
    if (-not (Test-Path -LiteralPath $envFile)) {
        if ($Action -eq 'stop') { Write-Host 'No ProductPulse launcher environment exists; nothing to stop.'; exit 0 }
        New-Item -ItemType Directory -Force -Path (Split-Path $envFile) | Out-Null
        $bytes = New-Object byte[] 24
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $password = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
        @("POSTGRES_USER=productpulse", "POSTGRES_PASSWORD=$password", 'POSTGRES_DB=productpulse', 'POSTGRES_PORT=5432', 'API_PORT=8000', 'FRONTEND_PORT=3000') | Set-Content -LiteralPath $envFile -Encoding ascii
    }
    $composeArgs = @('compose','--project-name',$project,'--env-file',$envFile,'--file',(Join-Path $root 'compose.yaml'))
    if ($Action -eq 'stop') {
        & $dockerExecutable @composeArgs stop
        if ($LASTEXITCODE -ne 0) { throw 'Could not stop ProductPulse. Inspect Docker Desktop.' }
        Write-Host 'ProductPulse stopped. Its database volume is preserved.'
        exit 0
    }
    Write-Host 'Starting ProductPulse. The first build downloads dependencies and initializes demo data.'
    & $dockerExecutable @composeArgs up --detach --build --wait --wait-timeout 240
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Check Docker Desktop, available ports and ProductPulse container logs. Existing data was not reset.' }
    $settings = Get-Content -LiteralPath $envFile | ConvertFrom-StringData
    $api = Invoke-RestMethod "http://localhost:$($settings.API_PORT)/health"
    if ($api.status -ne 'ok') { throw 'API health check failed.' }
    $url = "http://localhost:$($settings.FRONTEND_PORT)"
    $response = Invoke-WebRequest "$url/methodology" -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw 'Frontend readiness check failed.' }
    Write-Host "ProductPulse ready: $url"
    if (-not $NoBrowser) { Start-Process $url }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
