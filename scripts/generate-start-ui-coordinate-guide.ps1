param(
  [string]$OutFileName = 'start_coordinate_guide.png'
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
}

$buttonDefs = @(
  @{ key = 'START'; path = 'start_btn_start.png' }
  @{ key = 'CONTINUE'; path = 'start_btn_continue.png' }
  @{ key = 'ARCHIVES'; path = 'start_btn_archives.png' }
  @{ key = 'OPTIONS'; path = 'start_btn_options.png' }
  @{ key = 'EXIT'; path = 'start_btn_exit.png' }
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
  $buttonFill = $null
  $buttonPen = $null
  $lampPen = $null
  $lampFill = $null
  $panelBrush = $null
  $textBrush = $null
  $accentBrush = $null
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

    $minorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(36, 106, 170, 255), 1)
    $majorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(88, 106, 170, 255), 1.4)
    $axisPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 228, 130), 2)
    $centerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(175, 255, 188, 109), 1.6)
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

    $buttonFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 255, 214, 153))
    $buttonPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(225, 255, 234, 188), 1.8)
    $lampPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 141, 203, 255), 2)
    $lampFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(68, 101, 163, 255))
    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(188, 12, 17, 28))
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 243, 248, 255))
    $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 215, 140))
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

    $g.FillRectangle($panelBrush, 10, 8, 1240, 58)
    $g.DrawString(
      "Start UI + Coordinate System  (Ref: ${frameW}x${frameH}, origin top-left)",
      $fontTitle,
      $textBrush,
      18,
      16
    )
    $g.DrawString(
      "UI Center=($([int]$uiCenterX),$([int]$uiCenterY))  LampRef=($($layout.lampRefX),$($layout.lampRefY))",
      $fontAxis,
      $textBrush,
      18,
      39
    )

    for ($i = 0; $i -lt $buttonImages.Count; $i++) {
      $img = $buttonImages[$i].Image
      $centerY = $uiCenterY + $layout.buttonStartOffsetY + $i * $layout.buttonStepY
      $x = $buttonX - $img.Width / 2.0
      $y = $centerY - $img.Height / 2.0
      $g.FillRectangle($buttonFill, [single]$x, [single]$y, [single]$img.Width, [single]$img.Height)
      $g.DrawRectangle($buttonPen, [single]$x, [single]$y, [single]$img.Width, [single]$img.Height)
      $label = "{0} @({1},{2},{3},{4})" -f $buttonImages[$i].Key, [int]$x, [int]$y, $img.Width, $img.Height
      $g.DrawString($label, $fontLabel, $textBrush, [single]($x + 4), [single]($y + 4))
    }

    $lampMarkerR = 14
    $lampMarkerX = [single]$layout.lampRefX
    $lampMarkerY = [single]$layout.lampRefY
    $g.FillEllipse($lampFill, $lampMarkerX - $lampMarkerR, $lampMarkerY - $lampMarkerR, $lampMarkerR * 2, $lampMarkerR * 2)
    $g.DrawEllipse($lampPen, $lampMarkerX - $lampMarkerR, $lampMarkerY - $lampMarkerR, $lampMarkerR * 2, $lampMarkerR * 2)
    $g.DrawLine($lampPen, $lampMarkerX - 26, $lampMarkerY, $lampMarkerX + 26, $lampMarkerY)
    $g.DrawLine($lampPen, $lampMarkerX, $lampMarkerY - 26, $lampMarkerX, $lampMarkerY + 26)
    $g.DrawString("LampRef @($($layout.lampRefX),$($layout.lampRefY))", $fontAxis, $accentBrush, $lampMarkerX - 152, $lampMarkerY + 18)

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
    if ($buttonFill) { $buttonFill.Dispose() }
    if ($buttonPen) { $buttonPen.Dispose() }
    if ($lampPen) { $lampPen.Dispose() }
    if ($lampFill) { $lampFill.Dispose() }
    if ($panelBrush) { $panelBrush.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($accentBrush) { $accentBrush.Dispose() }
    if ($fontAxis) { $fontAxis.Dispose() }
    if ($fontLabel) { $fontLabel.Dispose() }
    if ($fontTitle) { $fontTitle.Dispose() }
  }
}
finally {
  foreach ($img in $loadedImages) {
    if ($img) { $img.Dispose() }
  }
  if ($g) { $g.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }
}
