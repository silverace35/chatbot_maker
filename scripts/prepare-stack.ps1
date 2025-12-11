param(
  [string]$InstallDir
)

$ErrorActionPreference = "Stop"

Write-Host "[ChatbotMaker] Préparation de la stack Docker..."

if (-not $InstallDir) {
  $InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $InstallDir = Split-Path -Parent $InstallDir
}

$scriptsDir = Join-Path $InstallDir "scripts"
$dockerDir  = Join-Path $InstallDir "docker"
$imagesDir  = Join-Path $dockerDir "images"

# Vérification Docker
& "$scriptsDir\install-docker.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker indisponible, arrêt de la préparation."
  exit 1
}

if (Test-Path $imagesDir) {
  Get-ChildItem -Path $imagesDir -Filter "*.tar" | ForEach-Object {
    Write-Host "Import de l'image Docker : $($_.FullName)"
    docker load -i $_.FullName
  }
} else {
  Write-Host "Aucun répertoire d'images Docker trouvé ($imagesDir). Passage de l'import d'images."
}

Write-Host "[ChatbotMaker] Préparation terminée."
exit 0

