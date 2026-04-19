param(
  [string]$ServiceName = "WardrobeStylist",
  [int]$Port = 3000,
  [string]$HostName = "0.0.0.0",
  [string]$NssmPath = "nssm"
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

function Require-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name was not found in PATH. $InstallHint"
  }

  return $command.Source
}

function Resolve-Executable {
  param(
    [string]$Value,
    [string]$InstallHint
  )

  if (Test-Path $Value) {
    return (Resolve-Path $Value).Path
  }

  return Require-Command -Name $Value -InstallHint $InstallHint
}

function Run-Nssm {
  param([string[]]$Arguments)

  & $script:NssmExecutable @Arguments
  if ($LASTEXITCODE -ne 0) {
    $joinedArgs = $Arguments -join " "
    throw "nssm command failed: $script:NssmExecutable $joinedArgs"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Require-Path -Path (Join-Path $repoRoot "scripts\start-windows.ps1") -InstallHint "The start script is missing."
Require-Path -Path (Join-Path $repoRoot ".venv-rembg\Scripts\python.exe") -InstallHint "Run .\scripts\setup-windows.ps1 first."
Require-Path -Path (Join-Path $repoRoot ".next") -InstallHint "Run .\scripts\setup-windows.ps1 first."

Write-Step "Resolving required executables"
$powershellExe = Require-Command -Name "powershell" -InstallHint "PowerShell was not found."
$script:NssmExecutable = Resolve-Executable -Value $NssmPath -InstallHint "Install NSSM and add it to PATH, or pass -NssmPath with the full path to nssm.exe."

$startScript = Join-Path $repoRoot "scripts\start-windows.ps1"
$appParameters = "-ExecutionPolicy Bypass -File `"$startScript`" -Port $Port -HostName `"$HostName`""

Write-Step "Installing or updating service $ServiceName"
Run-Nssm -Arguments @("install", $ServiceName, $powershellExe, $appParameters)
Run-Nssm -Arguments @("set", $ServiceName, "AppDirectory", $repoRoot)
Run-Nssm -Arguments @("set", $ServiceName, "DisplayName", $ServiceName)
Run-Nssm -Arguments @("set", $ServiceName, "Description", "Wardrobe Stylist Next.js service")
Run-Nssm -Arguments @("set", $ServiceName, "Start", "SERVICE_AUTO_START")
Run-Nssm -Arguments @("set", $ServiceName, "AppExit", "Default", "Restart")

Write-Step "Restarting service"
& $script:NssmExecutable stop $ServiceName | Out-Null
& $script:NssmExecutable start $ServiceName
if ($LASTEXITCODE -ne 0) {
  throw "Unable to start service $ServiceName."
}

Write-Step "Service ready"
Write-Host "Service name: $ServiceName"
Write-Host "URL: http://localhost:$Port"
Write-Host "Manage with:"
Write-Host "  nssm start $ServiceName"
Write-Host "  nssm stop $ServiceName"
Write-Host "  nssm remove $ServiceName confirm"
