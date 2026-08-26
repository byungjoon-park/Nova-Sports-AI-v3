$ErrorActionPreference = "Stop"

$project = "D:\Nova-Sports-AI-v3\frontend"
$backup = Join-Path $project "_nova_backup_before_restore"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$files = @(
  "app\page.tsx",
  "app\medical\page.tsx",
  "app\settings-context.tsx"
)

foreach ($f in $files) {
  $src = Join-Path $PSScriptRoot $f
  $dst = Join-Path $project $f
  if (Test-Path $dst) {
    Copy-Item $dst (Join-Path $backup ($f -replace "\\","_")) -Force
  }
  Copy-Item $src $dst -Force
}

$next = Join-Path $project ".next"
if (Test-Path $next) {
  Remove-Item $next -Recurse -Force
}

Write-Host ""
Write-Host "NOVA dashboard/medical restore complete."
Write-Host "Backup: $backup"
Write-Host "Now run: npm run dev"
