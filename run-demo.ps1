# run-demo.ps1
# One-shot demo: capture test output from your project, dispatch to Letta, view suggestion

param(
  [string]$LettaRepo = "C:\Users\ezary\OneDrive\Documents\Coding-Language\letta-code-event-manager",
  [string]$ProjectRepo = "C:\Users\ezary\OneDrive\Documents\Coding-Language\warisan-pahlawan-bakti-website\malaysia-member-card",
  [string]$TestCommand = "npm test"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LETTA DEMO - Real Project Integration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Letta repo:    $LettaRepo" -ForegroundColor Yellow
Write-Host "Project repo:  $ProjectRepo" -ForegroundColor Yellow
Write-Host "Test command:  $TestCommand" -ForegroundColor Yellow
Write-Host ""

# Ensure events folder exists
$eventsDir = Join-Path $LettaRepo "events"
if (-not (Test-Path $eventsDir)) {
  New-Item -ItemType Directory -Path $eventsDir | Out-Null
  Write-Host "Created events directory: $eventsDir" -ForegroundColor Green
}

# Create a timestamped event filename
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$eventFile = Join-Path $eventsDir "project_test_$stamp.log"

Write-Host ""
Write-Host "Step 1: Running tests in project..." -ForegroundColor Cyan
Write-Host "Output will be saved to: $eventFile" -ForegroundColor Gray

# Run the test command in the project and capture stdout+stderr
Push-Location $ProjectRepo
try {
  # Capture ALL output (stdout & stderr)
  $output = & cmd /c "$TestCommand 2>&1"
  $output | Out-File -FilePath $eventFile -Encoding utf8
  Write-Host "Test output captured successfully." -ForegroundColor Green
} catch {
  Write-Host "Test command exited with error; output saved to event file." -ForegroundColor Yellow
}
Pop-Location

# Show preview of captured output
Write-Host ""
Write-Host "---- TEST OUTPUT PREVIEW (first 20 lines) ----" -ForegroundColor Magenta
Get-Content $eventFile -TotalCount 20 | Write-Host

# Dispatch event to Letta
Write-Host ""
Write-Host "Step 2: Dispatching event to Letta..." -ForegroundColor Cyan
Push-Location $LettaRepo
node .\scripts\dispatch-cli.js $eventFile $ProjectRepo

# Find latest suggestion directory
$suggestionsRoot = Join-Path $LettaRepo "suggestions"
if (-not (Test-Path $suggestionsRoot)) {
  Write-Host "No suggestions folder found. Dispatch may have failed." -ForegroundColor Red
  Pop-Location
  exit 1
}

$latest = Get-ChildItem $suggestionsRoot -Directory | Sort-Object Name | Select-Object -Last 1
if (-not $latest) {
  Write-Host "No suggestion directories found." -ForegroundColor Red
  Pop-Location
  exit 1
}

Write-Host ""
Write-Host "Step 3: Reviewing Letta's suggestion..." -ForegroundColor Cyan
Write-Host "Suggestion folder: $($latest.FullName)" -ForegroundColor Green

Write-Host ""
Write-Host "======== AGENT RESPONSE ========" -ForegroundColor Yellow
$responsePath = Join-Path $latest.FullName "agent-response.txt"
if (Test-Path $responsePath) {
  Get-Content $responsePath | Write-Host
} else {
  Write-Host "(No response file found)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======== SUGGESTED PATCH ========" -ForegroundColor Yellow
$patchPath = Join-Path $latest.FullName "suggested.patch"
if (Test-Path $patchPath) {
  Get-Content $patchPath | Write-Host
} else {
  Write-Host "(No patch suggested)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======== BEST PRACTICES ========" -ForegroundColor Yellow
$bpPath = Join-Path $latest.FullName "best-practices.txt"
if (Test-Path $bpPath) {
  Get-Content $bpPath | Write-Host
} else {
  Write-Host "(No best practices noted)" -ForegroundColor Gray
}

# Open the folder in Explorer
Write-Host ""
Write-Host "Opening suggestion folder in Explorer..." -ForegroundColor Cyan
Start-Process explorer.exe $latest.FullName

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEMO COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review the agent response above"
Write-Host "  2. If there's a patch, copy it to your project:"
Write-Host "     Copy-Item '$patchPath' '$ProjectRepo\fix.patch'"
Write-Host "  3. Check the patch: git apply --check fix.patch"
Write-Host "  4. Apply if safe: git apply fix.patch"
Write-Host "  5. Run tests again: npm test"
Write-Host ""
