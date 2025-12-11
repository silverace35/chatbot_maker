param(
  [string]$InstallDir
)

$ErrorActionPreference = "Stop"

Write-Host "[ChatbotMaker] Démarrage de la stack Docker..."

if (-not $InstallDir) {
  $InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $InstallDir = Split-Path -Parent $InstallDir
}

$scriptsDir = Join-Path $InstallDir "scripts"
$dockerDir  = Join-Path $InstallDir "docker"

& "$scriptsDir\install-docker.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker indisponible, impossible de démarrer la stack."
  exit 1
}

Push-Location $dockerDir
try {
  docker compose up -d
} finally {
  Pop-Location
}

Write-Host "[ChatbotMaker] Stack Docker démarrée."
exit 0

