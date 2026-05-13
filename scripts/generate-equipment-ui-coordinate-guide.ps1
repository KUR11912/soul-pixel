param(
  [string]$OutFileName = 'eq_items_coordinate_guide.png'
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
    [double]$MaxW,
    [double]$MaxH
  )
  $scale = [Math]::Min($MaxW / $Image.Width, $MaxH / $Image.Height)
  $drawW = [single]($Image.Width * $scale)
  $drawH = [single]($Image.Height * $scale)
  $x = [single]($CenterX - $drawW / 2.0)
  $y = [single]($CenterY - $drawH / 2.0)
  $Graphics.DrawImage($Image, $x, $y, $drawW, $drawH)
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$uiDir = Join-Path $projectRoot 'public\assets\ui\equipment'
$itemsDir = Join-Path $uiDir 'items'
$outPath = Join-Path $uiDir $OutFileName

$frameW = 2763
$frameH = 1347
$uiCenterX = $frameW / 2.0
$uiCenterY = $frameH / 2.0

$layout = @{
  titleOffsetX = 0
  titleOffsetY = -575
  profileOffsetX = -885
  profileOffsetY = 56
  bagOffsetX = 7
  bagOffsetY = 65
  bagW = 1073
  bagH = 1108
  slotsOffsetX = 872
  slotsOffsetY = 95
  slotsW = 547
  slotsH = 982
}

$bagGrid = @{
  cols = 6
  rows = 5
  startX = 118
  startY = 331
  cellW = 118
  cellH = 118
  gapX = 25
  gapY = 15
}

$slotRects = [ordered]@{
  head = @{ x = 38; y = 34; w = 130; h = 130 }
  body = @{ x = 365; y = 34; w = 130; h = 130 }
  gun = @{ x = 53; y = 320; w = 442; h = 120 }
  sidearm = @{ x = 53; y = 545; w = 442; h = 120 }
  item1 = @{ x = 45; y = 800; w = 130; h = 130 }
  item2 = @{ x = 365; y = 800; w = 130; h = 130 }
}

$itemIcons = @(
  'gas_mask',
  'field_coat',
  'service_rifle',
  'trench_club',
  'supply_bag',
  'first_aid',
  'ammo_crate',
  'ration_can',
  'bandage_roll',
  'wire_pliers'
)

$slotIconByName = @{
  head = 'gas_mask'
  body = 'field_coat'
  gun = 'service_rifle'
  sidearm = 'trench_club'
  item1 = 'supply_bag'
  item2 = 'first_aid'
}

$bitmap = New-Object System.Drawing.Bitmap($frameW, $frameH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = $null
$loadedImages = @()
$iconBitmaps = @{}

try {
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bgBrush = $null
  $minorGridPen = $null
  $majorGridPen = $null
  $axisPen = $null
  $centerPen = $null
  $bagFill = $null
  $bagPen = $null
  $slotFill = $null
  $slotPen = $null
  $textBrush = $null
  $panelBrush = $null
  $fontAxis = $null
  $fontCell = $null
  $fontTitle = $null

  try {
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 9, 15, 24))
    $g.FillRectangle($bgBrush, 0, 0, $frameW, $frameH)

    $panelBase = Get-RequiredBitmap (Join-Path $uiDir 'eq_panel_base.png')
    $frameOuter = Get-RequiredBitmap (Join-Path $uiDir 'eq_frame_outer.png')
    $panelProfile = Get-RequiredBitmap (Join-Path $uiDir 'eq_panel_profile.png')
    $panelBackpack = Get-RequiredBitmap (Join-Path $uiDir 'eq_panel_backpack.png')
    $panelSlots = Get-RequiredBitmap (Join-Path $uiDir 'eq_panel_slots.png')
    $slotLabels = Get-RequiredBitmap (Join-Path $uiDir 'eq_labels_slots.png')
    $titleText = Get-RequiredBitmap (Join-Path $uiDir 'eq_text_title.png')

    $loadedImages += @($panelBase, $frameOuter, $panelProfile, $panelBackpack, $panelSlots, $slotLabels, $titleText)

    Draw-CenteredBitmap -Graphics $g -Image $panelBase -CenterX ($uiCenterX + 0) -CenterY ($uiCenterY + 56)
    Draw-CenteredBitmap -Graphics $g -Image $frameOuter -CenterX $uiCenterX -CenterY $uiCenterY
    Draw-CenteredBitmap -Graphics $g -Image $panelProfile -CenterX ($uiCenterX + $layout.profileOffsetX) -CenterY ($uiCenterY + $layout.profileOffsetY)
    Draw-CenteredBitmap -Graphics $g -Image $panelBackpack -CenterX ($uiCenterX + $layout.bagOffsetX) -CenterY ($uiCenterY + $layout.bagOffsetY)
    Draw-CenteredBitmap -Graphics $g -Image $panelSlots -CenterX ($uiCenterX + $layout.slotsOffsetX) -CenterY ($uiCenterY + $layout.slotsOffsetY)
    Draw-CenteredBitmap -Graphics $g -Image $slotLabels -CenterX ($uiCenterX + $layout.slotsOffsetX) -CenterY ($uiCenterY - 45)
    Draw-CenteredBitmap -Graphics $g -Image $titleText -CenterX ($uiCenterX + $layout.titleOffsetX) -CenterY ($uiCenterY + $layout.titleOffsetY)

    foreach ($iconId in $itemIcons) {
      $iconPath = Join-Path $itemsDir "$iconId.png"
      if (Test-Path $iconPath) {
        $iconBmp = [System.Drawing.Bitmap]::FromFile($iconPath)
        $iconBitmaps[$iconId] = $iconBmp
        $loadedImages += $iconBmp
      }
    }

    $bagCenterX = $uiCenterX + $layout.bagOffsetX
    $bagCenterY = $uiCenterY + $layout.bagOffsetY

    for ($i = 0; $i -lt $itemIcons.Count; $i++) {
      $col = $i % $bagGrid.cols
      $row = [Math]::Floor($i / $bagGrid.cols)
      $cellX = $bagCenterX + (-$layout.bagW / 2.0 + $bagGrid.startX + $col * ($bagGrid.cellW + $bagGrid.gapX))
      $cellY = $bagCenterY + (-$layout.bagH / 2.0 + $bagGrid.startY + $row * ($bagGrid.cellH + $bagGrid.gapY))
      $cx = $cellX + $bagGrid.cellW / 2.0
      $cy = $cellY + $bagGrid.cellH / 2.0
      $iconId = $itemIcons[$i]
      if ($iconBitmaps.ContainsKey($iconId)) {
        Draw-CenteredBitmapScaled -Graphics $g -Image $iconBitmaps[$iconId] -CenterX $cx -CenterY $cy -MaxW ($bagGrid.cellW * 0.74) -MaxH ($bagGrid.cellH * 0.74)
      }
    }

    $slotsCenterX = $uiCenterX + $layout.slotsOffsetX
    $slotsCenterY = $uiCenterY + $layout.slotsOffsetY

    foreach ($slotName in $slotRects.Keys) {
      if (-not $slotIconByName.ContainsKey($slotName)) { continue }
      $iconId = $slotIconByName[$slotName]
      if (-not $iconBitmaps.ContainsKey($iconId)) { continue }

      $local = $slotRects[$slotName]
      $rx = $slotsCenterX + (-$layout.slotsW / 2.0 + $local.x)
      $ry = $slotsCenterY + (-$layout.slotsH / 2.0 + $local.y)
      $rw = [double]$local.w
      $rh = [double]$local.h
      $smallSlot = ($slotName -eq 'head' -or $slotName -eq 'body' -or $slotName -eq 'item1' -or $slotName -eq 'item2')
      $maxWScale = if ($smallSlot) { 0.76 } else { 0.88 }
      $maxHScale = if ($smallSlot) { 0.76 } else { 0.82 }
      $maxW = $rw * $maxWScale
      $maxH = $rh * $maxHScale
      Draw-CenteredBitmapScaled -Graphics $g -Image $iconBitmaps[$iconId] -CenterX ($rx + $rw / 2.0) -CenterY ($ry + $rh / 2.0) -MaxW $maxW -MaxH $maxH
    }

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

    $bagFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 242, 184, 108))
    $bagPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(215, 255, 229, 180), 1.2)
    $slotFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 164, 243, 197))
    $slotPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 204, 255, 233), 1.8)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 243, 248, 255))
    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(185, 12, 17, 28))
    $fontAxis = New-Object System.Drawing.Font('Consolas', 9, [System.Drawing.FontStyle]::Bold)
    $fontCell = New-Object System.Drawing.Font('Consolas', 7, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font('Consolas', 14, [System.Drawing.FontStyle]::Bold)

    for ($x = 0; $x -le $frameW; $x += $labelStep) {
      $g.DrawString("$x", $fontAxis, $textBrush, [single]($x + 2), 2)
      $g.DrawString("$x", $fontAxis, $textBrush, [single]($x + 2), [single]($frameH - 18))
    }
    for ($y = 0; $y -le $frameH; $y += $labelStep) {
      $g.DrawString("$y", $fontAxis, $textBrush, 2, [single]($y + 2))
      $g.DrawString("$y", $fontAxis, $textBrush, [single]($frameW - 52), [single]($y + 2))
    }

    $titlePanelW = 1110
    $titlePanelH = 56
    $g.FillRectangle($panelBrush, 10, 8, $titlePanelW, $titlePanelH)
    $g.DrawString(
      "Equipment Item UI + Coordinate System  (Ref: ${frameW}x${frameH}, origin top-left)",
      $fontTitle,
      $textBrush,
      18,
      16
    )
    $g.DrawString("UI Center=($([int]$uiCenterX),$([int]$uiCenterY))", $fontAxis, $textBrush, 18, 38)

    for ($i = 0; $i -lt ($bagGrid.cols * $bagGrid.rows); $i++) {
      $col = $i % $bagGrid.cols
      $row = [Math]::Floor($i / $bagGrid.cols)
      $x = $bagCenterX + (-$layout.bagW / 2.0 + $bagGrid.startX + $col * ($bagGrid.cellW + $bagGrid.gapX))
      $y = $bagCenterY + (-$layout.bagH / 2.0 + $bagGrid.startY + $row * ($bagGrid.cellH + $bagGrid.gapY))
      $w = [double]$bagGrid.cellW
      $h = [double]$bagGrid.cellH
      $g.FillRectangle($bagFill, [single]$x, [single]$y, [single]$w, [single]$h)
      $g.DrawRectangle($bagPen, [single]$x, [single]$y, [single]$w, [single]$h)
      $label = "B{0:D2}@({1},{2})" -f ($i + 1), [int]$x, [int]$y
      $g.DrawString($label, $fontCell, $textBrush, [single]($x + 2), [single]($y + 2))
    }

    foreach ($slotName in $slotRects.Keys) {
      $local = $slotRects[$slotName]
      $x = $slotsCenterX + (-$layout.slotsW / 2.0 + $local.x)
      $y = $slotsCenterY + (-$layout.slotsH / 2.0 + $local.y)
      $w = [double]$local.w
      $h = [double]$local.h
      $g.FillRectangle($slotFill, [single]$x, [single]$y, [single]$w, [single]$h)
      $g.DrawRectangle($slotPen, [single]$x, [single]$y, [single]$w, [single]$h)
      $label = "$slotName @($([int]$x),$([int]$y),$([int]$w),$([int]$h))"
      $g.DrawString($label, $fontAxis, $textBrush, [single]($x + 3), [single]($y + 3))
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
    if ($bagFill) { $bagFill.Dispose() }
    if ($bagPen) { $bagPen.Dispose() }
    if ($slotFill) { $slotFill.Dispose() }
    if ($slotPen) { $slotPen.Dispose() }
    if ($textBrush) { $textBrush.Dispose() }
    if ($panelBrush) { $panelBrush.Dispose() }
    if ($fontAxis) { $fontAxis.Dispose() }
    if ($fontCell) { $fontCell.Dispose() }
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
