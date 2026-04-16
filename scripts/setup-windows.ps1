$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
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

  return $command
}

function Get-PythonCommand {
  $pyCommand = Get-Command py -ErrorAction SilentlyContinue
  if ($pyCommand) {
    return @("py", "-3")
  }

  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    return @("python")
  }

  throw "Python 3 was not found in PATH. Install Python 3.9-3.11 and enable 'Add python.exe to PATH'."
}

function Get-CommandParts {
  param([string[]]$CommandParts)

  if ($CommandParts.Length -le 1) {
    return @()
  }

  return $CommandParts[1..($CommandParts.Length - 1)]
}

function Run-Command {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    $joinedArgs = $Arguments -join " "
    throw "Command failed: $FilePath $joinedArgs"
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Step "Checking required tools"
Require-Command -Name "node" -InstallHint "Install Node.js 20+ from https://nodejs.org/"
Require-Command -Name "npm" -InstallHint "Install Node.js 20+ from https://nodejs.org/"
$pythonCommand = Get-PythonCommand

Write-Host "Repo root: $repoRoot"
Write-Host "Node: $(node --version)"
Write-Host "npm: $(npm --version)"

Write-Step "Checking Python version"
$pythonArgs = Get-CommandParts -CommandParts $pythonCommand
$pythonVersionOutput = & $pythonCommand[0] @($pythonArgs + @("--version")) 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Unable to read Python version."
}
Write-Host "Python: $pythonVersionOutput"

$venvPython = Join-Path $repoRoot ".venv-rembg\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Step "Creating .venv-rembg"
  Run-Command -FilePath $pythonCommand[0] -Arguments ($pythonArgs + @("-m", "venv", ".venv-rembg"))
} else {
  Write-Step "Reusing existing .venv-rembg"
}

Write-Step "Upgrading pip in .venv-rembg"
Run-Command -FilePath $venvPython -Arguments @("-m", "pip", "install", "--upgrade", "pip")

Write-Step "Installing rembg dependencies"
Run-Command -FilePath $venvPython -Arguments @("-m", "pip", "install", "rembg")

Write-Step "Installing Node dependencies"
Run-Command -FilePath "npm" -Arguments @("install")

Write-Step "Generating Prisma client"
Run-Command -FilePath "npx" -Arguments @("prisma", "generate")

Write-Step "Applying Prisma schema"
Run-Command -FilePath "npx" -Arguments @("prisma", "db", "push")

Write-Step "Building production bundle"
Run-Command -FilePath "npm" -Arguments @("run", "build")

Write-Step "Setup complete"
Write-Host "Next step:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1"
