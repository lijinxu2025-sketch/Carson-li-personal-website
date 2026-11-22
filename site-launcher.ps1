param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$sitePort = 4173
$siteUrl = "http://127.0.0.1:$sitePort/"
$pidFile = Join-Path $PSScriptRoot '.site-server.pid'

function Test-SiteReady {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $siteUrl -TimeoutSec 2
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Show-LaunchError {
  param([string]$Message)
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show($Message, '网站启动失败', 'OK', 'Error') | Out-Null
}

try {
  if (-not (Test-SiteReady)) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }

    if (-not (Test-Path -LiteralPath $nodePath)) {
      Show-LaunchError '未找到 Node.js。请安装 Node.js 后再次双击“启动网站.bat”。'
      exit 1
    }

    $serverProcess = Start-Process `
      -FilePath $nodePath `
      -ArgumentList 'server.js' `
      -WorkingDirectory $PSScriptRoot `
      -WindowStyle Hidden `
      -PassThru

    [IO.File]::WriteAllText($pidFile, [string]$serverProcess.Id)

    $ready = $false
    for ($attempt = 0; $attempt -lt 50; $attempt++) {
      Start-Sleep -Milliseconds 200
      if (Test-SiteReady) {
        $ready = $true
        break
      }
    }

    if (-not $ready) {
      Show-LaunchError '本地服务器未能在预期时间内启动。请检查防火墙设置后重试。'
      exit 1
    }
  }

  if (-not $NoBrowser) {
    Start-Process $siteUrl
  }
}
catch {
  Show-LaunchError $_.Exception.Message
  exit 1
}
