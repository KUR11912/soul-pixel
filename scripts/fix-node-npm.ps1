param(
  [string]$ProjectPath = "e:\cc_test\soul-pixel",
  [switch]$InstallProjectDeps
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "[fix-node] $Message" -ForegroundColor Cyan
}

function Command-Exists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $combined = @($machinePath, $userPath) -join ";"

  $parts = $combined -split ";" | Where-Object { $_ -and $_.Trim().Length -gt 0 }
  $unique = [System.Collections.Generic.List[string]]::new()

  foreach ($p in $parts) {
    if (-not $unique.Contains($p)) {
      [void]$unique.Add($p)
    }
  }

  $env:Path = $unique -join ";"
}

function Ensure-UserPathContains {
  param([string]$Dir)

  if (-not (Test-Path $Dir)) {
    return $false
  }

  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $items = @()
  if ($current) {
    $items = $current -split ";"
  }

  if ($items -contains $Dir) {
    return $false
  }

  $newItems = @($items + $Dir | Where-Object { $_ -and $_.Trim().Length -gt 0 })
  [Environment]::SetEnvironmentVariable("Path", ($newItems -join ";"), "User")
  return $true
}

function Install-NodeWithWinget {
  if (-not (Command-Exists "winget")) {
    throw "winget not found. Install App Installer from Microsoft Store first."
  }

  $commonArgs = @(
    "install",
    "--id", "OpenJS.NodeJS.LTS",
    "--source", "winget",
    "--accept-source-agreements",
    "--accept-package-agreements",
    "--silent"
  )

  Write-Step "Installing Node.js LTS (winget, user scope)..."
  & winget @commonArgs --scope user
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Step "User-scope install failed, trying machine scope..."
  & winget @commonArgs --scope machine
  if ($LASTEXITCODE -ne 0) {
    throw "winget install failed (exit code: $LASTEXITCODE)."
  }
}

function Assert-NodeReady {
  if (-not (Command-Exists "node")) { throw "node is still unavailable." }
  if (-not (Command-Exists "npm")) { throw "npm is still unavailable." }
  if (-not (Command-Exists "npx")) { throw "npx is still unavailable." }
}

function Print-NodeVersions {
  Write-Host ("node: " + (node -v)) -ForegroundColor Green
  Write-Host ("npm : " + (npm -v)) -ForegroundColor Green
  Write-Host ("npx : " + (npx -v)) -ForegroundColor Green
}

Write-Step "Checking existing node/npm..."
if (Command-Exists "node" -and Command-Exists "npm" -and Command-Exists "npx") {
  Write-Step "Node.js is already available."
  Print-NodeVersions
} else {
  Install-NodeWithWinget

  $candidateDirs = @(
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:ProgramFiles\nodejs",
    "$env:ProgramW6432\nodejs"
  ) | Select-Object -Unique

  $pathUpdated = $false
  foreach ($dir in $candidateDirs) {
    if (Ensure-UserPathContains $dir) {
      $pathUpdated = $true
      Write-Step "Added to User PATH: $dir"
    }
  }

  if ($pathUpdated) {
    Write-Step "User PATH updated permanently."
  }

  Refresh-ProcessPath
  Assert-NodeReady
  Print-NodeVersions
}

if ($InstallProjectDeps) {
  if (-not (Test-Path $ProjectPath)) {
    throw "Project path not found: $ProjectPath"
  }

  Push-Location $ProjectPath
  try {
    Write-Step "Installing project dependencies..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed (exit code: $LASTEXITCODE)."
    }
  } finally {
    Pop-Location
  }
}

Write-Step "Done. Open a new terminal and run: npm run dev"
