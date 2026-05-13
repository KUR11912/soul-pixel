Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Get-MedianValue {
  param([double[]]$Values)
  if ($Values.Count -eq 0) { return 0.0 }
  $sorted = $Values | Sort-Object
  $mid = [int]($sorted.Count / 2)
  if (($sorted.Count % 2) -eq 1) {
    return [double]$sorted[$mid]
  }
  return ([double]$sorted[$mid - 1] + [double]$sorted[$mid]) / 2.0
}

function Get-EdgeBackgroundColor {
  param([System.Drawing.Bitmap]$Image)

  $rs = New-Object System.Collections.Generic.List[double]
  $gs = New-Object System.Collections.Generic.List[double]
  $bs = New-Object System.Collections.Generic.List[double]

  $step = [Math]::Max(2, [int]([Math]::Min($Image.Width, $Image.Height) / 256))
  $lastX = $Image.Width - 1
  $lastY = $Image.Height - 1

  for ($x = 0; $x -lt $Image.Width; $x += $step) {
    $top = $Image.GetPixel($x, 0)
    $bottom = $Image.GetPixel($x, $lastY)
    $rs.Add([double]$top.R); $gs.Add([double]$top.G); $bs.Add([double]$top.B)
    $rs.Add([double]$bottom.R); $gs.Add([double]$bottom.G); $bs.Add([double]$bottom.B)
  }

  for ($y = 0; $y -lt $Image.Height; $y += $step) {
    $left = $Image.GetPixel(0, $y)
    $right = $Image.GetPixel($lastX, $y)
    $rs.Add([double]$left.R); $gs.Add([double]$left.G); $bs.Add([double]$left.B)
    $rs.Add([double]$right.R); $gs.Add([double]$right.G); $bs.Add([double]$right.B)
  }

  return @{
    r = Get-MedianValue -Values $rs.ToArray()
    g = Get-MedianValue -Values $gs.ToArray()
    b = Get-MedianValue -Values $bs.ToArray()
  }
}

function Convert-DustLayerToTransparent {
  param(
    [string]$SourcePath,
    [string]$OutPath,
    [double]$ThresholdLow,
    [double]$ThresholdHigh,
    [double]$Gamma,
    [double]$Boost,
    [int]$CutoffAlpha
  )

  $src = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $out = New-Object System.Drawing.Bitmap(
    $src.Width,
    $src.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  try {
    $bg = Get-EdgeBackgroundColor -Image $src
    $bgLum = ([double]$bg.r + [double]$bg.g + [double]$bg.b) / 3.0
    $range = [Math]::Max(1.0, $ThresholdHigh - $ThresholdLow)

    for ($y = 0; $y -lt $src.Height; $y++) {
      for ($x = 0; $x -lt $src.Width; $x++) {
        $c = $src.GetPixel($x, $y)

        $dr = [double]$c.R - [double]$bg.r
        $dg = [double]$c.G - [double]$bg.g
        $db = [double]$c.B - [double]$bg.b
        $diff = [Math]::Sqrt($dr * $dr + $dg * $dg + $db * $db)

        $lum = ([double]$c.R + [double]$c.G + [double]$c.B) / 3.0
        $brightDelta = [Math]::Max(0.0, $lum - $bgLum)
        $darkDelta = [Math]::Max(0.0, $bgLum - $lum)

        $signal = $diff + $brightDelta * 0.55 + $darkDelta * 0.35
        $alphaNorm = ($signal - $ThresholdLow) / $range
        if ($alphaNorm -lt 0.0) { $alphaNorm = 0.0 }
        if ($alphaNorm -gt 1.0) { $alphaNorm = 1.0 }

        $alphaNorm = [Math]::Pow($alphaNorm, $Gamma) * $Boost
        if ($alphaNorm -gt 1.0) { $alphaNorm = 1.0 }

        $alpha = [int][Math]::Round(255.0 * $alphaNorm)
        if ($alpha -lt $CutoffAlpha) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }

        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B))
      }
    }

    $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Converted: $(Split-Path $SourcePath -Leaf) -> $(Split-Path $OutPath -Leaf)"
  }
  finally {
    if ($src) { $src.Dispose() }
    if ($out) { $out.Dispose() }
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$layerDir = Join-Path $projectRoot 'public\assets\ui\start\particles\dust_layers'
$cleanDir = Join-Path $layerDir 'clean'

if (!(Test-Path $layerDir)) {
  throw "Dust layer folder not found: $layerDir"
}
if (!(Test-Path $cleanDir)) {
  New-Item -Path $cleanDir -ItemType Directory -Force | Out-Null
}

$configs = @(
  @{ name = 'A1'; low = 8.0; high = 52.0; gamma = 1.16; boost = 1.18; cutoff = 10 },
  @{ name = 'A2'; low = 7.0; high = 44.0; gamma = 1.13; boost = 1.14; cutoff = 9 },
  @{ name = 'A3'; low = 3.0; high = 24.0; gamma = 1.08; boost = 1.06; cutoff = 6 }
)

foreach ($cfg in $configs) {
  $sourcePath = Join-Path $layerDir ("{0}.png" -f $cfg.name)
  if (!(Test-Path $sourcePath)) {
    throw "Missing source layer: $sourcePath"
  }

  $outPath = Join-Path $cleanDir ("{0}.png" -f $cfg.name)
  Convert-DustLayerToTransparent `
    -SourcePath $sourcePath `
    -OutPath $outPath `
    -ThresholdLow ([double]$cfg.low) `
    -ThresholdHigh ([double]$cfg.high) `
    -Gamma ([double]$cfg.gamma) `
    -Boost ([double]$cfg.boost) `
    -CutoffAlpha ([int]$cfg.cutoff)
}

Write-Output "Done. Clean transparent layers output: $cleanDir"
