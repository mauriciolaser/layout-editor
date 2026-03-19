param(
  [string]$branch = 'main'
)

# Requiere GitHub CLI (`gh`) instalado
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Error "GitHub CLI ('gh') no esta instalado o no esta en PATH. Instalala desde https://cli.github.com/ y reintenta."
  exit 1
}

# Verifica que estés autenticado en GH CLI
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh auth login
}

Write-Host "🔄 Lanzando workflow de despliegue para rama '$branch'..."
gh workflow run 'Deploy' --ref $branch
