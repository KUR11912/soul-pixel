param(
  [switch]$AxesOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$scenePath = Join-Path $projectRoot 'src\game\scenes\Level01Scene.ts'
$bgPath = Join-Path $projectRoot 'public\assets\debug\panoramas\level01_panorama.png'
$outDir = Join-Path $projectRoot 'public\assets\debug\collision_regions'
$outFileName = if ($AxesOnly) { 'level01_axes_only.png' } else { 'level01_collision_regions_with_axes.png' }
$outPath = Join-Path $outDir $outFileName

if (!(Test-Path $scenePath)) { throw "Scene file not found: $scenePath" }
if (!(Test-Path $bgPath)) { throw "Background image not found: $bgPath" }
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$sceneText = Get-Content -Raw -Path $scenePath

$refMatch = [regex]::Match(
  $sceneText,
  "const\s+LEVEL01_WORLD_REFERENCE\s*=\s*\{\s*width:\s*(\d+(?:\.\d+)?)\s*,\s*height:\s*(\d+(?:\.\d+)?)\s*\}"
)
if (-not $refMatch.Success) { throw 'Failed to locate LEVEL01_WORLD_REFERENCE in Level01Scene.ts' }
$referenceWidth = [double]$refMatch.Groups[1].Value
$referenceHeight = [double]$refMatch.Groups[2].Value

$rects = @()
if (-not $AxesOnly) {
  $blockMatch = [regex]::Match(
    $sceneText,
    "const\s+LEVEL01_COLLISION_RECTS_WORLD[\s\S]*?=\s*\[(?<block>[\s\S]*?)\]\s*`r?`nconst\s+LEVEL01_WORLD_REFERENCE",
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )
  if (-not $blockMatch.Success) { throw 'Failed to locate LEVEL01_COLLISION_RECTS_WORLD block in Level01Scene.ts' }

  $blockText = $blockMatch.Groups['block'].Value
  $rectRegex = [regex]"\{[^{}]*x:\s*(-?\d+(?:\.\d+)?)\s*,\s*y:\s*(-?\d+(?:\.\d+)?)\s*,\s*w:\s*(-?\d+(?:\.\d+)?)\s*,\s*h:\s*(-?\d+(?:\.\d+)?)[^{}]*\}"
  $rectMatches = $rectRegex.Matches($blockText)
  if ($rectMatches.Count -eq 0) { throw 'No level01 collision rectangles found.' }

  foreach ($m in $rectMatches) {
    $rects += [pscustomobject]@{
      X = [double]$m.Groups[1].Value
      Y = [double]$m.Groups[2].Value
      W = [double]$m.Groups[3].Value
      H = [double]$m.Groups[4].Value
    }
  }
}

$bitmap = [System.Drawing.Bitmap]::FromFile($bgPath)
try {
  $w = [double]$bitmap.Width
  $h = [double]$bitmap.Height
  $scaleX = $w / $referenceWidth
  $scaleY = $h / $referenceHeight

  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $minorGridPen = $null
    $majorGridPen = $null
    $axisPen = $null
    $fontAxis = $null
    $fontTitle = $null
    $fontRect = $null
    $axisBrush = $null
    $titleBg = $null
    $rectFillBrush = $null
    $rectPen = $null
    $rectLabelBg = $null
    $rectLabelBrush = $null

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $minorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 80, 190, 255), 1)
    $majorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 80, 190, 255), 1.5)
    $axisPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 230, 120), 2)

    $minorStepWorld = 64
    $majorStepWorld = 256
    $labelStepWorld = 128
    $fontAxis = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font('Consolas', 18, [System.Drawing.FontStyle]::Bold)
    $fontRect = New-Object System.Drawing.Font('Consolas', 11, [System.Drawing.FontStyle]::Bold)
    $axisBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 230, 245, 255))

    for ($xWorld = 0; $xWorld -le $referenceWidth; $xWorld += $minorStepWorld) {
      $x = [single]($xWorld * $scaleX)
      $pen = if (($xWorld % $majorStepWorld) -eq 0) { $majorGridPen } else { $minorGridPen }
      $g.DrawLine($pen, $x, 0, $x, [single]$h)
    }
    for ($yWorld = 0; $yWorld -le $referenceHeight; $yWorld += $minorStepWorld) {
      $y = [single]($yWorld * $scaleY)
      $pen = if (($yWorld % $majorStepWorld) -eq 0) { $majorGridPen } else { $minorGridPen }
      $g.DrawLine($pen, 0, $y, [single]$w, $y)
    }

    $g.DrawLine($axisPen, 0, 0, [single]$w, 0)
    $g.DrawLine($axisPen, 0, 0, 0, [single]$h)

    for ($xWorld = 0; $xWorld -le $referenceWidth; $xWorld += $labelStepWorld) {
      $x = [single]($xWorld * $scaleX)
      $g.DrawString("$xWorld", $fontAxis, $axisBrush, $x + 2, 2)
      $g.DrawString("$xWorld", $fontAxis, $axisBrush, $x + 2, [single]($h - 20))
    }
    for ($yWorld = 0; $yWorld -le $referenceHeight; $yWorld += $labelStepWorld) {
      $y = [single]($yWorld * $scaleY)
      $g.DrawString("$yWorld", $fontAxis, $axisBrush, 2, $y + 2)
      $g.DrawString("$yWorld", $fontAxis, $axisBrush, [single]($w - 56), $y + 2)
    }

    $g.DrawString("(0,0)", $fontAxis, $axisBrush, 6, 22)
    $g.DrawString("($([int]$referenceWidth),0)", $fontAxis, $axisBrush, [single]($w - 172), 6)
    $g.DrawString("(0,$([int]$referenceHeight))", $fontAxis, $axisBrush, 6, [single]($h - 38))
    $g.DrawString("($([int]$referenceWidth),$([int]$referenceHeight))", $fontAxis, $axisBrush, [single]($w - 240), [single]($h - 38))

    $titleBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $g.FillRectangle($titleBg, 10, 8, 900, 40)
    $titleText = if ($AxesOnly) {
      "Level01 Detailed Axes (no collision regions, scaled to $([int]$w)x$([int]$h))"
    } else {
      "Level01 Collision Regions + Detailed Axes (scaled to $([int]$w)x$([int]$h))"
    }
    $g.DrawString($titleText, $fontTitle, $axisBrush, 18, 12)

    if (-not $AxesOnly) {
      $rectFillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 239, 68, 68))
      $rectPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 130, 130), 2)
      $rectLabelBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 10, 12, 16))
      $rectLabelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

      for ($i = 0; $i -lt $rects.Count; $i++) {
        $r = $rects[$i]
        $x = [single]($r.X * $scaleX)
        $y = [single]($r.Y * $scaleY)
        $rw = [single]($r.W * $scaleX)
        $rh = [single]($r.H * $scaleY)
        $g.FillRectangle($rectFillBrush, $x, $y, $rw, $rh)
        $g.DrawRectangle($rectPen, $x, $y, $rw, $rh)

        $label = "C$($i + 1) ($([int]$r.X),$([int]$r.Y),$([int]$r.W),$([int]$r.H))"
        $size = $g.MeasureString($label, $fontRect)
        $lx = [single]([Math]::Max(2, [Math]::Min($w - $size.Width - 2, $x + 4)))
        $ly = [single]([Math]::Max(2, [Math]::Min($h - $size.Height - 2, $y - $size.Height - 2)))
        $g.FillRectangle($rectLabelBg, $lx, $ly, $size.Width + 6, $size.Height + 2)
        $g.DrawString($label, $fontRect, $rectLabelBrush, $lx + 3, $ly + 1)
      }
    }

    $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Generated: $outPath"
    Write-Output "Rects: $($rects.Count)"
    Write-Output "Image: $($bitmap.Width)x$($bitmap.Height)"
    Write-Output "Reference: $([int]$referenceWidth)x$([int]$referenceHeight)"
  } finally {
    if ($axisBrush) { $axisBrush.Dispose() }
    if ($titleBg) { $titleBg.Dispose() }
    if ($rectFillBrush) { $rectFillBrush.Dispose() }
    if ($rectLabelBg) { $rectLabelBg.Dispose() }
    if ($rectLabelBrush) { $rectLabelBrush.Dispose() }
    if ($minorGridPen) { $minorGridPen.Dispose() }
    if ($majorGridPen) { $majorGridPen.Dispose() }
    if ($axisPen) { $axisPen.Dispose() }
    if ($rectPen) { $rectPen.Dispose() }
    if ($fontAxis) { $fontAxis.Dispose() }
    if ($fontTitle) { $fontTitle.Dispose() }
    if ($fontRect) { $fontRect.Dispose() }
    if ($g) { $g.Dispose() }
  }
} finally {
  if ($bitmap) { $bitmap.Dispose() }
}
