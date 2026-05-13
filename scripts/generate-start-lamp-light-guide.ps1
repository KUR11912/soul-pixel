param(
  [string]$OutFileName = 'start_lamp_light_ranges.png'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Get-RequiredBitmap {
  param([string]$Path)
  if (!(Test-Path $Path)) {
    throw "Required image not found: $Path"
  }
  return [System.Drawing.Bitmap]::FromFile($Path)
}

function Draw-CenteredBitmap {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Bitmap]$Image,
    [double]$CenterX,
    [double]$CenterY
  )
  $x = [single]($CenterX - $Image.Width / 2.0)
  $y = [single]($CenterY - $Image.Height / 2.0)
  $Graphics.DrawImage($Image, $x, $y, $Image.Width, $Image.Height)
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$startDir = Join-Path $projectRoot 'public\assets\ui\start'
$debugDir = Join-Path $projectRoot 'public\assets\debug\ui\start'
if (!(Test-Path $debugDir)) {
  New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
}
$outPath = Join-Path $debugDir $OutFileName

$frameW = 2760
$frameH = 1504
$uiCenterX = $frameW / 2.0
$uiCenterY = $frameH / 2.0

$layout = @{
  buttonStartOffsetY = -115
  buttonStepY = 122
  buttonOffsetX = 0
  lampRefX = 2625
  lampRefY = 57
  lampFlameRefX = 2609
  lampFlameRefY = 18
  lampFlameRefW = 80
  lampFlameRefH = 128
}

$buttonDefs = @(
  @{ key = 'START'; path = 'start_btn_start.png' }
  @{ key = 'CONTINUE'; path = 'start_btn_continue.png' }
  @{ key = 'ARCHIVES'; path = 'start_btn_archives.png' }
  @{ key = 'OPTIONS'; path = 'start_btn_options.png' }
  @{ key = 'EXIT'; path = 'start_btn_exit.png' }
)

$lightZones = @(
  @{ id = 1; x = 2119; y = 0; w = 640; h = 857; fill = [System.Drawing.Color]::FromArgb(54, 255, 234, 168); stroke = [System.Drawing.Color]::FromArgb(245, 255, 236, 184) }
  @{ id = 2; x = 2096; y = 0; w = 663; h = 857; fill = [System.Drawing.Color]::FromArgb(44, 255, 201, 120); stroke = [System.Drawing.Color]::FromArgb(225, 255, 210, 142) }
  @{ id = 3; x = 1576; y = 0; w = 1184; h = 1156; fill = [System.Drawing.Color]::FromArgb(34, 242, 162, 88); stroke = [System.Drawing.Color]::FromArgb(210, 246, 176, 100) }
  @{ id = 4; x = 1316; y = 0; w = 1442; h = 1442; fill = [System.Drawing.Color]::FromArgb(28, 214, 136, 70); stroke = [System.Drawing.Color]::FromArgb(188, 220, 152, 82) }
)

$bitmap = New-Object System.Drawing.Bitmap($frameW, $frameH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = $null
$loadedImages = @()

try {
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bgBrush = $null
  $minorGridPen = $null
  $majorGridPen = $null
  $axisPen = $null
  $centerPen = $null
  $panelBrush = $null
  $textBrush = $null
  $accentBrush = $null
  $zoneFonts = @()
  $zonePens = @()
  $zoneBrushes = @()
  $zoneBadgeBrushes = @()
  $lampPen = $null
  $lampFill = $null
  $fontAxis = $null
  $fontLabel = $null
  $fontTitle = $null

  try {
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 7, 11, 18))
    $g.FillRectangle($bgBrush, 0, 0, $frameW, $frameH)

    $startBg = Get-RequiredBitmap (Join-Path $startDir 'start_bg_full.png')
    $loadedImages += $startBg
    Draw-CenteredBitmap -Graphics $g -Image $startBg -CenterX $uiCenterX -CenterY $uiCenterY

    $buttonImages = @()
    foreach ($buttonDef in $buttonDefs) {
      $img = Get-RequiredBitmap (Join-Path $startDir $buttonDef.path)
      $buttonImages += [PSCustomObject]@{
        Key = $buttonDef.key
        Image = $img
      }
      $loadedImages += $img
    }

    $buttonX = $uiCenterX + $layout.buttonOffsetX
    for ($i = 0; $i -lt $buttonImages.Count; $i++) {
      $centerY = $uiCenterY + $layout.buttonStartOffsetY + $i * $layout.buttonStepY
      Draw-CenteredBitmap -Graphics $g -Image $buttonImages[$i].Image -CenterX $buttonX -CenterY $centerY
    }

    $minorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 106, 170, 255), 1)
    $majorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(82, 106, 170, 255), 1.4)
    $axisPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 228, 130), 2)
    $centerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(164, 255, 188, 109), 1.6)
    $centerPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

    $minorStep = 64
    $majorStep = 256
    $labelStep = 128

    for ($x = 0; $x -le $frameW; $x += $minorStep) {
      $pen = if (($x % $majorStep) -eq 0) { $majorGridPen } else { $minorGridPen }
      $g.DrawLine($pen, [single]$x, 0, [single]$x, [single]$frameH)
    }
    for ($y = 0; $y -le $frameH; $y += $minorStep) {
      $pen = if (($y % $majorStep) -eq 0) { $majorGridPen } else { $minorGridPen }
      $g.DrawLine($pen, 0, [single]$y, [single]$frameW, [single]$y)
    }

    $g.DrawLine($axisPen, 0, 0, [single]$frameW, 0)
    $g.DrawLine($axisPen, 0, 0, 0, [single]$frameH)
    $g.DrawLine($centerPen, [single]$uiCenterX, 0, [single]$uiCenterX, [single]$frameH)
    $g.DrawLine($centerPen, 0, [single]$uiCenterY, [single]$frameW, [single]$uiCenterY)

    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(188, 12, 17, 28))
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 243, 248, 255))
    $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 215, 140))
    $lampPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 141, 203, 255), 2)
    $lampFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(68, 101, 163, 255))
    $fontAxis = New-Object System.Drawing.Font('Consolas', 9, [System.Drawing.FontStyle]::Bold)
    $fontLabel = New-Object System.Drawing.Font('Consolas', 8, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font('Consolas', 14, [System.Drawing.FontStyle]::Bold)

    for ($x = 0; $x -le $frameW; $x += $labelStep) {
      $g.DrawString("$x", $fontAxis, $textBrush, [single]($x + 2), 2)
      $g.DrawString("$x", $fontAxis, $textBrush, [single]($x + 2), [single]($frameH - 18))
    }
    for ($y = 0; $y -le $frameH; $y += $labelStep) {
      $g.DrawString("$y", $fontAxis, $textBrush, 2, [single]($y + 2))
      $g.DrawString("$y", $fontAxis, $textBrush, [single]($frameW - 52), [single]($y + 2))
    }

    $g.FillRectangle($panelBrush, 10, 8, 1460, 76)
    $g.DrawString(
      "Start UI + Lamp Light Range Guide  (Ref: ${frameW}x${frameH}, origin top-left)",
      $fontTitle,
      $textBrush,
      18,
      16
    )
    $g.DrawString(
      "Light zones currently used in StartScene.ts  |  Zone1 strongest -> Zone4 weakest",
      $fontAxis,
      $textBrush,
      18,
      42
    )
    $g.DrawString(
      "LampRef=($($layout.lampRefX),$($layout.lampRefY))  FlameRef=($($layout.lampFlameRefX),$($layout.lampFlameRefY),$($layout.lampFlameRefW),$($layout.lampFlameRefH))",
      $fontAxis,
      $textBrush,
      18,
      58
    )

    foreach ($zone in $lightZones) {
      $fillBrush = New-Object System.Drawing.SolidBrush($zone.fill)
      $strokePen = New-Object System.Drawing.Pen($zone.stroke, 2)
      $strokePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
      $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 24, 28, 36))
      $zoneBrushes += $fillBrush
      $zonePens += $strokePen
      $zoneBadgeBrushes += $badgeBrush

      $g.FillRectangle($fillBrush, [single]$zone.x, [single]$zone.y, [single]$zone.w, [single]$zone.h)
      $g.DrawRectangle($strokePen, [single]$zone.x, [single]$zone.y, [single]$zone.w, [single]$zone.h)

      $badgeW = 268
      $badgeH = 40
      $badgeX = [single]($zone.x + 8)
      $badgeY = [single](($zone.y + 8) + (($zone.id - 1) * 44))
      $g.FillRectangle($badgeBrush, $badgeX, $badgeY, $badgeW, $badgeH)
      $label = "Zone {0}  @({1},{2},{3},{4})" -f $zone.id, $zone.x, $zone.y, $zone.w, $zone.h
      $g.DrawString($label, $fontLabel, $textBrush, [single]($badgeX + 8), [single]($badgeY + 12))
    }

    $lampMarkerR = 14
    $lampMarkerX = [single]$layout.lampRefX
    $lampMarkerY = [single]$layout.lampRefY
    $g.FillEllipse($lampFill, $lampMarkerX - $lampMarkerR, $lampMarkerY - $lampMarkerR, $lampMarkerR * 2, $lampMarkerR * 2)
    $g.DrawEllipse($lampPen, $lampMarkerX - $lampMarkerR, $lampMarkerY - $lampMarkerR, $lampMarkerR * 2, $lampMarkerR * 2)
    $g.DrawLine($lampPen, $lampMarkerX - 26, $lampMarkerY, $lampMarkerX + 26, $lampMarkerY)
    $g.DrawLine($lampPen, $lampMarkerX, $lampMarkerY - 26, $lampMarkerX, $lampMarkerY + 26)
    $g.DrawString("LampRef", $fontAxis, $accentBrush, $lampMarkerX - 18, $lampMarkerY + 18)

    $flamePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 255, 214, 96), 2)
    $flamePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $zonePens += $flamePen
    $g.DrawRectangle(
      $flamePen,
      [single]$layout.lampFlameRefX,
      [single]$layout.lampFlameRefY,
      [single]$layout.lampFlameRefW,
      [single]$layout.lampFlameRefH
    )
    $g.DrawString(
      "FlameRef @($($layout.lampFlameRefX),$($layout.lampFlameRefY),$($layout.lampFlameRefW),$($layout.lampFlameRefH))",
      $fontAxis,
      $accentBrush,
      [single]($layout.lampFlameRefX - 220),
      [single]($layout.lampFlameRefY + $layout.lampFlameRefH + 8)
    )

    $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Generated: $outPath"
    Write-Output "Image: $($bitmap.Width)x$($bitmap.Height)"
  }
  finally {
    if ($bgBrush) { $bgBrush.Dispose() }
    if ($minorGridPen) { $minorGridPen.Dispose() }
    if ($majorGridPen) { $majorGridPen.Dispose() }
    if ($axisPen) { $axisPen.Dispose() }
    if ($centerPen) { $centerPen.Dispose() }
    if ($panelBrush) { $panelBrush.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($accentBrush) { $accentBrush.Dispose() }
    if ($lampPen) { $lampPen.Dispose() }
    if ($lampFill) { $lampFill.Dispose() }
    if ($fontAxis) { $fontAxis.Dispose() }
    if ($fontLabel) { $fontLabel.Dispose() }
    if ($fontTitle) { $fontTitle.Dispose() }
    foreach ($brush in $zoneBrushes) {
      if ($brush) { $brush.Dispose() }
    }
    foreach ($brush in $zoneBadgeBrushes) {
      if ($brush) { $brush.Dispose() }
    }
    foreach ($pen in $zonePens) {
      if ($pen) { $pen.Dispose() }
    }
    foreach ($font in $zoneFonts) {
      if ($font) { $font.Dispose() }
    }
  }
}
finally {
  foreach ($img in $loadedImages) {
    if ($img) { $img.Dispose() }
  }
  if ($g) { $g.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }
}
