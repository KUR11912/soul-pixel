param(
  [string]$OutFileName = 'start_title_burn_ranges.png'
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

$projectRoot = Split-Path -Parent $PSScriptRoot
$debugDir = Join-Path $projectRoot 'public\assets\debug\ui\start'
if (!(Test-Path $debugDir)) {
  New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
}

$baseGuidePath = Join-Path $debugDir 'start_coordinate_guide.png'
$outPath = Join-Path $debugDir $OutFileName

$titleRect = @{
  x = 716
  y = 214
  w = 1396
  h = 320
}

$burnBand = @{
  x = 1720
  y = 214
  w = 392
  h = 320
}

$smokeEnvelope = @{
  x = 1388
  y = 34
  w = 486
  h = 270
}

$bitmap = $null
$g = $null
$loadedImages = @()

try {
  $baseGuide = Get-RequiredBitmap $baseGuidePath
  $loadedImages += $baseGuide
  $bitmap = New-Object System.Drawing.Bitmap($baseGuide.Width, $baseGuide.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.DrawImage($baseGuide, 0, 0, $baseGuide.Width, $baseGuide.Height)

  $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(206, 12, 17, 28))
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 246, 248, 252))
  $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 226, 158))
  $titleFont = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font('Consolas', 9, [System.Drawing.FontStyle]::Bold)
  $smallFont = New-Object System.Drawing.Font('Consolas', 8, [System.Drawing.FontStyle]::Bold)

  $burnFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(46, 255, 156, 82))
  $burnPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(238, 255, 192, 124), 2.2)
  $burnPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

  $bandFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(66, 255, 106, 42))
  $bandPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(246, 255, 228, 160), 2.2)

  $smokeFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(44, 214, 220, 226))
  $smokePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(198, 228, 233, 240), 2)
  $smokePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

  $arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 212, 106), 4)
  $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round

  $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 24, 28, 36))

  try {
    $g.FillRectangle($burnFill, [single]$titleRect.x, [single]$titleRect.y, [single]$titleRect.w, [single]$titleRect.h)
    $g.DrawRectangle($burnPen, [single]$titleRect.x, [single]$titleRect.y, [single]$titleRect.w, [single]$titleRect.h)

    $g.FillRectangle($bandFill, [single]$burnBand.x, [single]$burnBand.y, [single]$burnBand.w, [single]$burnBand.h)
    $g.DrawRectangle($bandPen, [single]$burnBand.x, [single]$burnBand.y, [single]$burnBand.w, [single]$burnBand.h)

    $g.FillEllipse($smokeFill, [single]$smokeEnvelope.x, [single]$smokeEnvelope.y, [single]$smokeEnvelope.w, [single]$smokeEnvelope.h)
    $g.DrawEllipse($smokePen, [single]$smokeEnvelope.x, [single]$smokeEnvelope.y, [single]$smokeEnvelope.w, [single]$smokeEnvelope.h)

    $arrowY = [single]($titleRect.y - 32)
    $g.DrawLine(
      $arrowPen,
      [single]($titleRect.x + $titleRect.w - 24),
      $arrowY,
      [single]($titleRect.x + 116),
      $arrowY
    )

    $g.FillRectangle($badgeBrush, 14, 84, 1120, 96)
    $g.DrawString('Start Title Burn Range Guide', $titleFont, $textBrush, 24, 96)
    $g.DrawString(
      "Burn bounds @($($titleRect.x),$($titleRect.y),$($titleRect.w),$($titleRect.h))  |  ignition sweeps right -> left",
      $bodyFont,
      $textBrush,
      24,
      122
    )
    $g.DrawString(
      "Current active hot/ash band (approx) @($($burnBand.x),$($burnBand.y),$($burnBand.w),$($burnBand.h))  |  smoke envelope above title",
      $smallFont,
      $textBrush,
      24,
      146
    )

    $g.FillRectangle($badgeBrush, [single]($titleRect.x + 14), [single]($titleRect.y + 14), 330, 26)
    $g.DrawString(
      "Title burn bounds @($($titleRect.x),$($titleRect.y),$($titleRect.w),$($titleRect.h))",
      $smallFont,
      $accentBrush,
      [single]($titleRect.x + 20),
      [single]($titleRect.y + 19)
    )

    $g.FillRectangle($badgeBrush, [single]($burnBand.x + 16), [single]($burnBand.y + 48), 300, 24)
    $g.DrawString(
      "Active burn band (hot + ash)",
      $smallFont,
      $accentBrush,
      [single]($burnBand.x + 24),
      [single]($burnBand.y + 53)
    )

    $g.FillRectangle($badgeBrush, [single]($smokeEnvelope.x + 76), [single]($smokeEnvelope.y + 28), 246, 24)
    $g.DrawString(
      "Smoke envelope (approx)",
      $smallFont,
      $accentBrush,
      [single]($smokeEnvelope.x + 84),
      [single]($smokeEnvelope.y + 33)
    )

    $g.FillRectangle($badgeBrush, [single]($titleRect.x + $titleRect.w - 296), [single]($titleRect.y - 70), 282, 24)
    $g.DrawString(
      'Burn direction  ->  left sweep',
      $smallFont,
      $accentBrush,
      [single]($titleRect.x + $titleRect.w - 286),
      [single]($titleRect.y - 65)
    )

    $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Generated: $outPath"
    Write-Output "Image: $($bitmap.Width)x$($bitmap.Height)"
  }
  finally {
    if ($panelBrush) { $panelBrush.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($accentBrush) { $accentBrush.Dispose() }
    if ($titleFont) { $titleFont.Dispose() }
    if ($bodyFont) { $bodyFont.Dispose() }
    if ($smallFont) { $smallFont.Dispose() }
    if ($burnFill) { $burnFill.Dispose() }
    if ($burnPen) { $burnPen.Dispose() }
    if ($bandFill) { $bandFill.Dispose() }
    if ($bandPen) { $bandPen.Dispose() }
    if ($smokeFill) { $smokeFill.Dispose() }
    if ($smokePen) { $smokePen.Dispose() }
    if ($arrowPen) { $arrowPen.Dispose() }
    if ($badgeBrush) { $badgeBrush.Dispose() }
  }
}
finally {
  foreach ($img in $loadedImages) {
    if ($img) { $img.Dispose() }
  }
  if ($g) { $g.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }
}
