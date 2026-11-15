# Installiert den Prüfbau, startet ihn zweimal (erste, neustart) und entfernt ihn wieder. Nur auf dem GitHub-Windows-Rechner.
# Vorbild Datei-Organizer Pro und BookLedgerPro windows/pruefung/installed.ps1.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Diese Probe läuft nur auf dem abgeschotteten GitHub-Rechner.' }
$appDir = Join-Path $env:LOCALAPPDATA 'Workflow Calculate Pro'
$exe = Join-Path $appDir 'workflow-calculate-pro.exe'
$env:WC_WINDOWS_TEST_EXE = $exe
$env:WC_WINDOWS_TEST_SAVE_FOLDER = Join-Path $env:RUNNER_TEMP 'wc-speichern-probe'
New-Item -ItemType Directory -Force $env:WC_WINDOWS_TEST_SAVE_FOLDER, 'windows/pruef-out' | Out-Null
$setup = (Get-ChildItem windows/src-tauri/target/release/bundle/nsis -Filter '*-setup.exe' | Select-Object -First 1).FullName
function Run-Setup($file) {
  $process = Start-Process -FilePath $file -ArgumentList '/S' -PassThru
  if (!$process.WaitForExit(180000)) { $process | Stop-Process -Force; throw 'Installer hängt.' }
  if ($process.ExitCode -ne 0) { throw "Installer fehlgeschlagen: $($process.ExitCode)" }
}
function Phase($name) {
  $app = Start-Process -FilePath $exe -PassThru
  node windows/pruefung/installed.mjs $name "windows/pruef-out/$name.json"
  $code = $LASTEXITCODE
  $java = @(Get-CimInstance Win32_Process -Filter "name='java.exe'" | Where-Object ParentProcessId -eq $app.Id | ForEach-Object ProcessId)
  $engineSeen = $java.Count -ge 1
  Get-Process workflow-calculate-pro -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 3
  if ($java.Count -and (Get-Process -Id $java -ErrorAction SilentlyContinue)) { throw 'Die Engine lief nach dem Schließen der App weiter.' }
  if ($code -ne 0) { throw "Abnahme fehlgeschlagen: $name" }
  if (!$engineSeen) { throw 'Die Java-Engine war nicht als Kindprozess der App zu sehen.' }
}
Run-Setup $setup
if (!(Test-Path $exe)) { throw "Programm nicht unter $exe installiert." }
if (!(Test-Path (Join-Path $appDir 'runtime/jre/bin/java.exe'))) { throw 'Die mitgelieferte Java-Laufzeit fehlt in der Installation.' }
Phase 'erste'
Phase 'neustart'
Run-Setup (Join-Path $appDir 'uninstall.exe')
# NSIS startet den Deinstaller als Kopie im Temp-Ordner: gewartet wird auf Programm UND Eintrag (Lehre aus BookLedgerPro).
$deadline = [DateTime]::UtcNow.AddSeconds(60)
while ((Test-Path $exe) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250 }
if (Test-Path $exe) { throw 'Die Deinstallation hat das Programm nicht entfernt.' }
if (!(Get-ChildItem $env:WC_WINDOWS_TEST_SAVE_FOLDER -Filter '*.csv')) { throw 'Die Deinstallation hat gespeicherte Dateien angefasst.' }
Write-Output 'PASS Installieren, zweimal starten, Angebot und Thema gemerkt, Speichern unter, Deinstallieren (gespeicherte Dateien bleiben)'
