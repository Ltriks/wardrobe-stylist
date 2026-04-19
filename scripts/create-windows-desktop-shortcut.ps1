param(
  [string]$ShortcutName = "Wardrobe Stylist",
  [int]$Port = 3000
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
$startScript = Join-Path $repoRoot "scripts\start-windows.ps1"

Require-Path -Path $startScript -InstallHint "The start script is missing."

$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "$ShortcutName.lnk"
$powershellExe = (Get-Command powershell -ErrorAction Stop).Source
$arguments = "-ExecutionPolicy Bypass -File `"$startScript`" -Port $Port -OpenBrowser"

Write-Step "Creating desktop shortcut"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellExe
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $repoRoot
$shortcut.WindowStyle = 1
$shortcut.Description = "Start Wardrobe Stylist and open the local browser"
$shortcut.IconLocation = "$powershellExe,0"
$shortcut.Save()

Write-Host "Shortcut created:"
Write-Host "  $shortcutPath"
Write-Host ""
Write-Host "Double-clicking it will:"
Write-Host "  1. Start the app server"
Write-Host "  2. Open http://localhost:$Port in your browser"
Write-Host "  3. Stop the server when you close the PowerShell window"
