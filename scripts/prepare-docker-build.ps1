param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $root

$buildDir = Join-Path $root "build"
$dockerBuildDir = Join-Path $buildDir "docker"
$sourceDockerDir = Join-Path $root "docker"

New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
New-Item -ItemType Directory -Path $dockerBuildDir -Force | Out-Null

Copy-Item -Path (Join-Path $sourceDockerDir "docker-compose.runtime.yml") -Destination (Join-Path $dockerBuildDir "docker-compose.yml") -Force

$sourceDataDir = Join-Path $sourceDockerDir "data"
$destDataDir = Join-Path $dockerBuildDir "data"

if (Test-Path $sourceDataDir) {
  Write-Host "Copie de $sourceDataDir vers $destDataDir..."
  robocopy $sourceDataDir $destDataDir /E | Out-Null
} else {
  Write-Host "Aucun dossier de données Docker trouvé à $sourceDataDir, rien à copier."
}

Write-Host "Préparation Docker pour le packaging terminée."

