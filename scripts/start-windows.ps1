param(
  [int]$Port = 3000,
  [string]$HostName = "0.0.0.0"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Path {
  param(
    [string]$Path,
    [string]$InstallHint
  )

  if (-not (Test-Path $Path)) {
    throw "$Path was not found. $InstallHint"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Require-Path -Path (Join-Path $repoRoot "node_modules") -InstallHint "Run .\scripts\setup-windows.ps1 first."
Require-Path -Path (Join-Path $repoRoot ".next") -InstallHint "Run .\scripts\setup-windows.ps1 first."
Require-Path -Path (Join-Path $repoRoot ".venv-rembg\Scripts\python.exe") -InstallHint "Run .\scripts\setup-windows.ps1 first."
Require-Path -Path (Join-Path $repoRoot "prisma\dev.db") -InstallHint "Run .\scripts\setup-windows.ps1 first."

$env:NODE_ENV = "production"
$env:HOSTNAME = $HostName
$env:PORT = "$Port"
$env:REMBG_PYTHON = Join-Path $repoRoot ".venv-rembg\Scripts\python.exe"

Write-Step "Starting Wardrobe Stylist"
Write-Host "Repo root: $repoRoot"
Write-Host "URL: http://localhost:$Port"
Write-Host "LAN URL: http://<your-windows-ip>:$Port"
Write-Host "REMBG_PYTHON: $env:REMBG_PYTHON"

& npm run start
