$ErrorActionPreference = 'SilentlyContinue'
$pidFile = Join-Path $PSScriptRoot '.site-server.pid'

if (Test-Path -LiteralPath $pidFile) {
  $serverProcessId = [int](Get-Content -Raw -LiteralPath $pidFile)
  $serverProcess = Get-Process -Id $serverProcessId -ErrorAction SilentlyContinue
  if ($serverProcess -and $serverProcess.ProcessName -eq 'node') {
    Stop-Process -Id $serverProcessId
  }
  Remove-Item -LiteralPath $pidFile -Force
}
