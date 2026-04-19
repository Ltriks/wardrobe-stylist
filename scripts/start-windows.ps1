param(
  [int]$Port = 3000,
  [string]$HostName = "0.0.0.0",
  [switch]$OpenBrowser
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

function Start-BrowserWhenReady {
  param([string]$Url)

  return Start-Job -ScriptBlock {
    param($TargetUrl)

    $deadline = (Get-Date).AddSeconds(20)

    while ((Get-Date) -lt $deadline) {
      try {
        $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -Method Head -TimeoutSec 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
          Start-Process $TargetUrl
          return
        }
      } catch {
      }

      Start-Sleep -Milliseconds 700
    }

    Start-Process $TargetUrl
  } -ArgumentList $Url
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

$browserJob = $null
$browserUrl = "http://localhost:$Port"

if ($OpenBrowser) {
  Write-Step "The browser will open automatically when the app is ready"
  $browserJob = Start-BrowserWhenReady -Url $browserUrl
}

try {
  & npm run start
} finally {
  if ($browserJob) {
    Stop-Job -Job $browserJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue | Out-Null
  }
}
