# NahaLabs Free AutoPost — local, no paid scheduler, no developer API setup
$ErrorActionPreference = "Stop"

$AutoSocialPath = "C:\Users\nahat\AutoSocial"
$RepoUrl = "https://github.com/Katzca/AutoSocial.git"

Write-Host "=== NahaLabs Free AutoPost ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 18+ is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required." }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required." }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw "FFmpeg is required." }

if (-not (Test-Path $AutoSocialPath)) {
  git clone $RepoUrl $AutoSocialPath
}

Set-Location $AutoSocialPath
npm ci
npx playwright install chromium
npm run doctor

$envFile = Join-Path $AutoSocialPath ".env"
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $AutoSocialPath ".env.example") $envFile
}

$envText = Get-Content $envFile -Raw
$settings = @(
  @{ key = "TZ"; value = "Africa/Johannesburg" },
  @{ key = "INSTAGRAM_CRON_EXPRESSION"; value = "*/1 * * * *" },
  @{ key = "YOUTUBE_CRON_EXPRESSION"; value = "*/1 * * * *" },
  @{ key = "CRON_EXPRESSION"; value = "*/1 * * * *" },
  @{ key = "HEADLESS"; value = "false" },
  @{ key = "DASHBOARD_HOST"; value = "127.0.0.1" },
  @{ key = "DASHBOARD_PORT"; value = "3000" }
)
foreach ($setting in $settings) {
  $pattern = "(?m)^" + [regex]::Escape($setting.key) + "=.*$"
  $replacement = $setting.key + "=" + $setting.value
  if ($envText -match $pattern) {
    $envText = [regex]::Replace($envText, $pattern, $replacement)
  } else {
    $envText += [Environment]::NewLine + $replacement
  }
}
Set-Content -Path $envFile -Value $envText -Encoding UTF8

Start-Process -FilePath "npm.cmd" -ArgumentList "run","dashboard" -WorkingDirectory $AutoSocialPath | Out-Null

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/setup/health" -TimeoutSec 3
    if ($health) { $ready = $true; break }
  } catch {}
}
if (-not $ready) { throw "AutoSocial dashboard did not become ready." }

try {
  Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/accounts/add" -Method Post -ContentType "application/json" -Body '{"name":"nahalabs"}' | Out-Null
} catch {}
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/accounts/select" -Method Post -ContentType "application/json" -Body '{"accountId":"nahalabs"}' | Out-Null
} catch {}

$testRoot = Join-Path $AutoSocialPath "queue\nahalabs"
$platforms = @("instagram","tiktok","youtube")
foreach ($platform in $platforms) {
  $pending = Join-Path $testRoot "$platform\pending"
  New-Item -ItemType Directory -Force -Path $pending | Out-Null
  $video = Join-Path $pending "nahalabs-autopost-proof.mp4"
  if (-not (Test-Path $video)) {
    ffmpeg -y -f lavfi -i "color=c=black:s=1080x1920:d=5:r=30" -vf "drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='NahaLabs AutoPost Test':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart $video | Out-Null
  }
  Set-Content -Path (Join-Path $pending "nahalabs-autopost-proof.description") -Value "NahaLabs free AutoPost proof. Local open-source publishing test." -Encoding UTF8
}

Start-Process "http://127.0.0.1:3000"
Write-Host ""
Write-Host "AUTOPOST ENGINE IS RUNNING." -ForegroundColor Green
Write-Host "Open AutoSocial > Accounts and log in once to your own accounts." -ForegroundColor Yellow
Write-Host "After login, the proof video is queued for the next minute." -ForegroundColor Green
