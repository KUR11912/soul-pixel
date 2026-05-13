param(
  [string]$InputPath = '',
  [int]$FrameWidth = 50,
  [int]$FrameHeight = 80,
  [int]$Cols = 6,
  [int]$Rows = 4
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($InputPath)) {
  $InputPath = Join-Path $projectRoot 'public\assets\art\characters\player\player_sheet.png'
}

if (!(Test-Path $InputPath)) {
  throw "Input image not found: $InputPath"
}

$outDir = Join-Path $projectRoot 'public\assets\debug\characters\player'
if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$overlayOut = Join-Path $outDir 'player_sheet_alignment_overlay.png'
$axesOut = Join-Path $outDir 'player_sheet_alignment_axes.png'

$src = [System.Drawing.Bitmap]::FromFile($InputPath)
try {
  $imgW = $src.Width
  $imgH = $src.Height
  $gridW = $FrameWidth * $Cols
  $gridH = $FrameHeight * $Rows

  if ($gridW -gt $imgW -or $gridH -gt $imgH) {
    throw "Grid ${gridW}x${gridH} exceeds image size ${imgW}x${imgH}."
  }

  $overlayBmp = New-Object System.Drawing.Bitmap($imgW, $imgH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $axesBmp = New-Object System.Drawing.Bitmap($imgW, $imgH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  try {
    $go = $null
    $ga = $null
    $gridPen = $null
    $frameBorderPen = $null
    $centerPen = $null
    $baselinePen = $null
    $marginPen = $null
    $fontSmall = $null
    $fontTitle = $null
    $textBrush = $null
    $panelBrush = $null
    $frameLabelBrush = $null
    $frameLabelTextBrush = $null
    $tickFont = $null

    $go = [System.Drawing.Graphics]::FromImage($overlayBmp)
    $ga = [System.Drawing.Graphics]::FromImage($axesBmp)
    try {
      $go.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $go.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
      $ga.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $ga.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

      $go.DrawImage($src, 0, 0, $imgW, $imgH)

      $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 99, 102, 241), 1.5)
      $frameBorderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 250, 204, 21), 1)
      $centerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 59, 130, 246), 1.2)
      $baselinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 16, 185, 129), 1.2)
      $marginPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 148, 163, 184), 1)

      $centerPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dot
      $baselinePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
      $marginPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dot

      $fontSmall = New-Object System.Drawing.Font('Consolas', 8, [System.Drawing.FontStyle]::Bold)
      $fontTitle = New-Object System.Drawing.Font('Consolas', 10, [System.Drawing.FontStyle]::Bold)
      $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 245, 245))
      $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 12, 18, 30))
      $frameLabelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 20, 24, 38))
      $frameLabelTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

      $painters = @($go, $ga)

      foreach ($g in $painters) {
        # Main frame grid bounds.
        $g.DrawRectangle($gridPen, 0, 0, $gridW, $gridH)

        # Column/row separators.
        for ($c = 1; $c -lt $Cols; $c++) {
          $x = $c * $FrameWidth
          $g.DrawLine($gridPen, $x, 0, $x, $gridH)
        }
        for ($r = 1; $r -lt $Rows; $r++) {
          $y = $r * $FrameHeight
          $g.DrawLine($gridPen, 0, $y, $gridW, $y)
        }

        # Remaining area marker (if image is wider than the actual frame grid).
        if ($imgW -gt $gridW) {
          $g.DrawRectangle($marginPen, $gridW, 0, $imgW - $gridW - 1, $imgH - 1)
        }
      }

      $rowNames = @('IDLE', 'RUN', 'DODGE', 'JUMP')
      for ($r = 0; $r -lt $Rows; $r++) {
        for ($c = 0; $c -lt $Cols; $c++) {
          $x0 = $c * $FrameWidth
          $y0 = $r * $FrameHeight
          $centerX = $x0 + [int]($FrameWidth / 2)
          $baselineY = $y0 + ($FrameHeight - 5)
          $frameIndex = $r * $Cols + $c

          foreach ($g in $painters) {
            $g.DrawRectangle($frameBorderPen, $x0 + 0.5, $y0 + 0.5, $FrameWidth - 1, $FrameHeight - 1)
            $g.DrawLine($centerPen, $centerX, $y0, $centerX, $y0 + $FrameHeight)
            $g.DrawLine($baselinePen, $x0, $baselineY, $x0 + $FrameWidth, $baselineY)
          }

          # Frame id label.
          $lbl = "F$frameIndex"
          $lblSize = $go.MeasureString($lbl, $fontSmall)
          $go.FillRectangle($frameLabelBrush, $x0 + 2, $y0 + 2, $lblSize.Width + 4, $lblSize.Height + 2)
          $go.DrawString($lbl, $fontSmall, $frameLabelTextBrush, $x0 + 4, $y0 + 3)
          $ga.FillRectangle($frameLabelBrush, $x0 + 2, $y0 + 2, $lblSize.Width + 4, $lblSize.Height + 2)
          $ga.DrawString($lbl, $fontSmall, $frameLabelTextBrush, $x0 + 4, $y0 + 3)
        }

        # Row label in first frame.
        $rowLabel = if ($r -lt $rowNames.Count) { $rowNames[$r] } else { "ROW$r" }
        $ry = $r * $FrameHeight + 16
        $go.FillRectangle($panelBrush, 2, $ry, 46, 14)
        $go.DrawString($rowLabel, $fontSmall, $textBrush, 4, $ry + 1)
        $ga.FillRectangle($panelBrush, 2, $ry, 46, 14)
        $ga.DrawString($rowLabel, $fontSmall, $textBrush, 4, $ry + 1)
      }

      # Top legend.
      $legend = "Guide: frame=${FrameWidth}x${FrameHeight}, cols=$Cols, rows=$Rows, centerX=25, baselineY=75"
      $legendW = [Math]::Min($imgW - 4, 640)
      $go.FillRectangle($panelBrush, 2, 2, $legendW, 16)
      $go.DrawString($legend, $fontTitle, $textBrush, 4, 3)
      $ga.FillRectangle($panelBrush, 2, 2, $legendW, 16)
      $ga.DrawString($legend, $fontTitle, $textBrush, 4, 3)

      # Outer coordinate ticks every 10 px.
      $tickFont = New-Object System.Drawing.Font('Consolas', 7, [System.Drawing.FontStyle]::Regular)
      for ($x = 0; $x -le $gridW; $x += 10) {
        $lab = "$x"
        if ($x % 50 -eq 0) {
          $go.DrawString($lab, $tickFont, $textBrush, $x + 1, $imgH - 12)
          $ga.DrawString($lab, $tickFont, $textBrush, $x + 1, $imgH - 12)
        }
      }
      for ($y = 0; $y -le $gridH; $y += 10) {
        if ($y % 40 -eq 0) {
          $lab = "$y"
          $go.DrawString($lab, $tickFont, $textBrush, $imgW - 26, $y + 1)
          $ga.DrawString($lab, $tickFont, $textBrush, $imgW - 26, $y + 1)
        }
      }

      $overlayBmp.Save($overlayOut, [System.Drawing.Imaging.ImageFormat]::Png)
      $axesBmp.Save($axesOut, [System.Drawing.Imaging.ImageFormat]::Png)

      Write-Output "Generated: $overlayOut"
      Write-Output "Generated: $axesOut"
      Write-Output "Sheet: ${imgW}x${imgH}"
      Write-Output "Grid: ${gridW}x${gridH}"
    }
    finally {
      if ($gridPen) { $gridPen.Dispose() }
      if ($frameBorderPen) { $frameBorderPen.Dispose() }
      if ($centerPen) { $centerPen.Dispose() }
      if ($baselinePen) { $baselinePen.Dispose() }
      if ($marginPen) { $marginPen.Dispose() }
      if ($fontSmall) { $fontSmall.Dispose() }
      if ($fontTitle) { $fontTitle.Dispose() }
      if ($textBrush) { $textBrush.Dispose() }
      if ($panelBrush) { $panelBrush.Dispose() }
      if ($frameLabelBrush) { $frameLabelBrush.Dispose() }
      if ($frameLabelTextBrush) { $frameLabelTextBrush.Dispose() }
      if ($tickFont) { $tickFont.Dispose() }
      if ($go) { $go.Dispose() }
      if ($ga) { $ga.Dispose() }
    }
  }
  finally {
    if ($overlayBmp) { $overlayBmp.Dispose() }
    if ($axesBmp) { $axesBmp.Dispose() }
  }
}
finally {
  if ($src) { $src.Dispose() }
}
