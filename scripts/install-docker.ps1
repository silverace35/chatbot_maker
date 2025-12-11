param()

Write-Host "[ChatbotMaker] Vérification de Docker..."

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host "Docker n'est pas installé ou pas dans le PATH."
  Write-Host "Merci d'installer Docker Desktop puis de relancer ce script."
  exit 1
}

try {
  docker info | Out-Null
} catch {
  Write-Host "Docker est installé mais ne répond pas. Assurez-vous que Docker Desktop est démarré."
  exit 1
}

Write-Host "Docker est installé et fonctionnel."
exit 0

