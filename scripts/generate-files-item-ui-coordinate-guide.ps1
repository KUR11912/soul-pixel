param(
  [string]$OutFileName = 'ITEM_coordinate_guide.png'
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

function Draw-CenteredBitmapScaled {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Bitmap]$Image,
    [double]$CenterX,
    [double]$CenterY,
    [double]$DrawW,
    [double]$DrawH
  )
  $x = [single]($CenterX - $DrawW / 2.0)
  $y = [single]($CenterY - $DrawH / 2.0)
  $Graphics.DrawImage($Image, $x, $y, [single]$DrawW, [single]$DrawH)
}

function PanelLocalToWorld {
  param(
    [double]$PanelCenterX,
    [double]$PanelCenterY,
    [double]$PanelW,
    [double]$PanelH,
    [double]$LocalX,
    [double]$LocalY
  )
  return @{
    x = $PanelCenterX + ($LocalX - $PanelW / 2.0)
    y = $PanelCenterY + ($LocalY - $PanelH / 2.0)
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$filesDir = Join-Path $projectRoot 'public\assets\ui\files'
$pagesDir = Join-Path $filesDir 'pages'
$outPath = Join-Path $pagesDir $OutFileName

$frameW = 2763
$frameH = 1347
$uiCenterX = $frameW / 2.0
$uiCenterY = $frameH / 2.0

$layout = @{
  titleOffsetX = 0
  titleOffsetY = -575
  bgOffsetX = 0
  bgOffsetY = 65
  panelOffsetX = 0
  panelOffsetY = 38
  panelW = 1616
  panelH = 1026
}

$docList = @{
  startX = 140
  startY = 165
  rowW = 540
  rowH = 175
  rowGap = 18
  maxRows = 4
}

$rightPage = @{
  x = 790
  y = 150
  w = 660
  h = 730
}

$tabs = [ordered]@{
  folder = @{ x = 1548; y = 260; w = 24; h = 120 } # R1
  item = @{ x = 1547; y = 421; w = 25; h = 121 }   # R2
  weapon = @{ x = 1548; y = 583; w = 23; h = 120 } # R3
  misc = @{ x = 1548; y = 713; w = 23; h = 120 }   # R4
}

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
  $panelPen = $null
  $docPen = $null
  $docFill = $null
  $activeTabFill = $null
  $activeTabPen = $null
  $tabPen = $null
  $rightPagePen = $null
  $rightPageFill = $null
  $textBrush = $null
  $panelBrush = $null
  $fontAxis = $null
  $fontLabel = $null
  $fontTitle = $null

  try {
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 14, 24))
    $g.FillRectangle($bgBrush, 0, 0, $frameW, $frameH)

    $bgFull = Get-RequiredBitmap (Join-Path $filesDir 'files_bg_full.png')
    $pageItem = Get-RequiredBitmap (Join-Path $pagesDir 'ITEM.png')
    $frameOuter = Get-RequiredBitmap (Join-Path $filesDir 'files_frame_outer.png')
    $titleText = Get-RequiredBitmap (Join-Path $filesDir 'files_text_title.png')
    $btnEquip = Get-RequiredBitmap (Join-Path $filesDir 'files_button_idle.png')
    $btnMap = Get-RequiredBitmap (Join-Path $filesDir 'files_button_idle_alt.png')
    $btnFiles = Get-RequiredBitmap (Join-Path $filesDir 'files_button_active.png')
    $txtEquip = Get-RequiredBitmap (Join-Path $filesDir 'files_text_equip.png')
    $txtMap = Get-RequiredBitmap (Join-Path $filesDir 'files_text_map.png')
    $txtFiles = Get-RequiredBitmap (Join-Path $filesDir 'files_text_files.png')

    $loadedImages += @(
      $bgFull, $pageItem, $frameOuter, $titleText,
      $btnEquip, $btnMap, $btnFiles, $txtEquip, $txtMap, $txtFiles
    )

    $panelCenterX = $uiCenterX + $layout.panelOffsetX
    $panelCenterY = $uiCenterY + $layout.panelOffsetY

    Draw-CenteredBitmap -Graphics $g -Image $bgFull -CenterX ($uiCenterX + $layout.bgOffsetX) -CenterY ($uiCenterY + $layout.bgOffsetY)
    Draw-CenteredBitmapScaled -Graphics $g -Image $pageItem -CenterX $panelCenterX -CenterY $panelCenterY -DrawW $layout.panelW -DrawH $layout.panelH
    Draw-CenteredBitmap -Graphics $g -Image $frameOuter -CenterX $uiCenterX -CenterY $uiCenterY
    Draw-CenteredBitmap -Graphics $g -Image $titleText -CenterX ($uiCenterX + $layout.titleOffsetX) -CenterY ($uiCenterY + $layout.titleOffsetY)

    # Bottom buttons to match Archive scene composition.
    $btnY = $uiCenterY + 776
    Draw-CenteredBitmap -Graphics $g -Image $btnEquip -CenterX ($uiCenterX - 568) -CenterY $btnY
    Draw-CenteredBitmap -Graphics $g -Image $btnMap -CenterX ($uiCenterX + 2) -CenterY $btnY
    Draw-CenteredBitmap -Graphics $g -Image $btnFiles -CenterX ($uiCenterX + 572) -CenterY $btnY
    Draw-CenteredBitmap -Graphics $g -Image $txtEquip -CenterX ($uiCenterX - 568) -CenterY $btnY
    Draw-CenteredBitmap -Graphics $g -Image $txtMap -CenterX ($uiCenterX + 2) -CenterY $btnY
    Draw-CenteredBitmap -Graphics $g -Image $txtFiles -CenterX ($uiCenterX + 572) -CenterY $btnY

    $minorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 106, 170, 255), 1)
    $majorGridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 106, 170, 255), 1.5)
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

    $panelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 244, 220, 170), 2)
    $docPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 177, 224, 255), 1.5)
    $docFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(58, 157, 211, 255))
    $activeTabFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 255, 236, 184))
    $activeTabPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 255, 244, 218), 2)
    $tabPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 204, 255, 233), 1.4)
    $rightPagePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 178, 190), 1.8)
    $rightPageFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 255, 153, 169))
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 243, 248, 255))
    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 12, 17, 28))
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

    $g.FillRectangle($panelBrush, 10, 8, 1170, 56)
    $g.DrawString("Files ITEM UI + Coordinate System  (Ref: ${frameW}x${frameH}, origin top-left)", $fontTitle, $textBrush, 18, 16)
    $g.DrawString("UI Center=($([int]$uiCenterX),$([int]$uiCenterY))  Panel Center=($([int]$panelCenterX),$([int]$panelCenterY))", $fontAxis, $textBrush, 18, 38)

    # Panel bounds.
    $panelX = $panelCenterX - $layout.panelW / 2.0
    $panelY = $panelCenterY - $layout.panelH / 2.0
    $g.DrawRectangle($panelPen, [single]$panelX, [single]$panelY, [single]$layout.panelW, [single]$layout.panelH)
    $g.DrawString("panel @($([int]$panelX),$([int]$panelY),$($layout.panelW),$($layout.panelH))", $fontAxis, $textBrush, [single]($panelX + 4), [single]($panelY + 4))

    # Left document list rows.
    for ($i = 0; $i -lt $docList.maxRows; $i++) {
      $localX = $docList.startX
      $localY = $docList.startY + $i * ($docList.rowH + $docList.rowGap)
      $p = PanelLocalToWorld -PanelCenterX $panelCenterX -PanelCenterY $panelCenterY -PanelW $layout.panelW -PanelH $layout.panelH -LocalX $localX -LocalY $localY
      $g.FillRectangle($docFill, [single]$p.x, [single]$p.y, [single]$docList.rowW, [single]$docList.rowH)
      $g.DrawRectangle($docPen, [single]$p.x, [single]$p.y, [single]$docList.rowW, [single]$docList.rowH)
      $docLabel = "DOC{0} @({1},{2},{3},{4})" -f ($i + 1), [int]$p.x, [int]$p.y, $docList.rowW, $docList.rowH
      $g.DrawString($docLabel, $fontLabel, $textBrush, [single]($p.x + 3), [single]($p.y + 3))
    }

    # Right page text area.
    $rp = PanelLocalToWorld -PanelCenterX $panelCenterX -PanelCenterY $panelCenterY -PanelW $layout.panelW -PanelH $layout.panelH -LocalX $rightPage.x -LocalY $rightPage.y
    $g.FillRectangle($rightPageFill, [single]$rp.x, [single]$rp.y, [single]$rightPage.w, [single]$rightPage.h)
    $g.DrawRectangle($rightPagePen, [single]$rp.x, [single]$rp.y, [single]$rightPage.w, [single]$rightPage.h)
    $g.DrawString("RIGHT_PAGE @($([int]$rp.x),$([int]$rp.y),$($rightPage.w),$($rightPage.h))", $fontAxis, $textBrush, [single]($rp.x + 4), [single]($rp.y + 4))

    # Tabs: item active.
    foreach ($name in $tabs.Keys) {
      $tab = $tabs[$name]
      $tp = PanelLocalToWorld -PanelCenterX $panelCenterX -PanelCenterY $panelCenterY -PanelW $layout.panelW -PanelH $layout.panelH -LocalX $tab.x -LocalY $tab.y
      $isActive = $name -eq 'item'
      if ($isActive) {
        $g.FillRectangle($activeTabFill, [single]$tp.x, [single]$tp.y, [single]$tab.w, [single]$tab.h)
        $g.DrawRectangle($activeTabPen, [single]$tp.x, [single]$tp.y, [single]$tab.w, [single]$tab.h)
      } else {
        $g.DrawRectangle($tabPen, [single]$tp.x, [single]$tp.y, [single]$tab.w, [single]$tab.h)
      }
      $g.DrawString("$name @($([int]$tp.x),$([int]$tp.y),$($tab.w),$($tab.h))", $fontLabel, $textBrush, [single]($tp.x - 58), [single]($tp.y + 3))
    }

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
    if ($panelPen) { $panelPen.Dispose() }
    if ($docPen) { $docPen.Dispose() }
    if ($docFill) { $docFill.Dispose() }
    if ($activeTabFill) { $activeTabFill.Dispose() }
    if ($activeTabPen) { $activeTabPen.Dispose() }
    if ($tabPen) { $tabPen.Dispose() }
    if ($rightPagePen) { $rightPagePen.Dispose() }
    if ($rightPageFill) { $rightPageFill.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($panelBrush) { $panelBrush.Dispose() }
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
