# Auslieferungsbau ohne Prüf-Schnittstelle: installieren, starten, Fenster da, keine Prüf-Schnittstelle offen, entfernen.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Nur auf dem GitHub-Rechner.' }
Remove-Item Env:WC_WINDOWS_TEST_SAVE_FOLDER -ErrorAction SilentlyContinue
$setup = (Get-ChildItem windows/src-tauri/target/release/bundle/nsis -Filter '*-setup.exe' | Select-Object -First 1).FullName
$appDir = Join-Path $env:LOCALAPPDATA 'Workflow Calculate Pro'
$exe = Join-Path $appDir 'workflow-calculate-pro.exe'
function Install($path) {
  $process = Start-Process -FilePath $path -ArgumentList '/S' -PassThru
  if (!$process.WaitForExit(180000)) { $process | Stop-Process -Force; throw 'Installer hängt.' }
  if ($process.ExitCode -ne 0) { throw 'Installer fehlgeschlagen.' }
}
function DebugPortOpen {
  $client = [System.Net.Sockets.TcpClient]::new()
  try { $task = $client.ConnectAsync('127.0.0.1',9223); return $task.Wait(500) -and $client.Connected } catch { return $false } finally { $client.Dispose() }
}
if (DebugPortOpen) { throw 'Eine Prüf-Schnittstelle läuft noch.' }
Install $setup
$app = Start-Process -FilePath $exe -PassThru
try {
  for ($i=0; $i -lt 60; $i++) { Start-Sleep -Milliseconds 500; $app.Refresh(); if ($app.HasExited) { throw 'Die App beendete sich beim Start.' }; if ($app.MainWindowHandle -ne 0) { break } }
  if ($app.MainWindowHandle -eq 0) { throw 'Kein Fenster.' }
  Start-Sleep -Seconds 5
  if (DebugPortOpen) { throw 'Der Auslieferungsbau öffnet eine Prüf-Schnittstelle.' }
  $java = @(Get-CimInstance Win32_Process -Filter "name='java.exe'" | Where-Object ParentProcessId -eq $app.Id)
  if ($java.Count -lt 1) { throw 'Die Engine läuft nicht.' }
} finally { Get-Process workflow-calculate-pro -ErrorAction SilentlyContinue | Stop-Process -Force }
Install (Join-Path $appDir 'uninstall.exe')
Write-Output 'PASS Auslieferungsbau startet mit Engine, ohne Prüf-Schnittstelle'
