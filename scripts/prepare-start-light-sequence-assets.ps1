Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Get-WeightedCenter {
  param([System.Drawing.Bitmap]$Image)

  $sumW = 0.0
  $sumX = 0.0
  $sumY = 0.0

  for ($y = 0; $y -lt $Image.Height; $y += 4) {
    for ($x = 0; $x -lt $Image.Width; $x += 4) {
      $c = $Image.GetPixel($x, $y)
      $lum = ([double]$c.R + [double]$c.G + [double]$c.B) / 3.0
      $w = [Math]::Max(0.0, $lum - 52.0)
      if ($w -le 0.0) { continue }
      $sumW += $w
      $sumX += $x * $w
      $sumY += $y * $w
    }
  }

  if ($sumW -le 0.0) {
    return @{
      x = $Image.Width / 2.0
      y = $Image.Height / 2.0
    }
  }

  return @{
    x = $sumX / $sumW
    y = $sumY / $sumW
  }
}

function Convert-FrameToTransparent {
  param(
    [string]$SourcePath,
    [string]$OutPath
  )

  $src = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $mini = $null
  $soft = $null
  $gm = $null
  $gs = $null
  $out = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  try {
    # Blur away checkerboard artifacts by downsampling then upsampling.
    $downW = [Math]::Max(96, [int]($src.Width / 14))
    $downH = [Math]::Max(96, [int]($src.Height / 14))
    $mini = New-Object System.Drawing.Bitmap($downW, $downH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $gm = [System.Drawing.Graphics]::FromImage($mini)
    $gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    $gm.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gm.DrawImage($src, 0, 0, $downW, $downH)

    $soft = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $gs = [System.Drawing.Graphics]::FromImage($soft)
    $gs.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gs.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gs.DrawImage($mini, 0, 0, $src.Width, $src.Height)

    $center = Get-WeightedCenter -Image $soft
    $cx = [double]$center.x
    $cy = [double]$center.y
    $radius = [Math]::Max($src.Width, $src.Height) * 0.36

    for ($y = 0; $y -lt $src.Height; $y++) {
      for ($x = 0; $x -lt $src.Width; $x++) {
        $c = $soft.GetPixel($x, $y)
        $r = [double]$c.R
        $g = [double]$c.G
        $b = [double]$c.B

        $lum = ($r + $g + $b) / 3.0
        $warm = [Math]::Max(0.0, ($r + $g - 2.0 * $b))
        $max = [Math]::Max($r, [Math]::Max($g, $b))
        $min = [Math]::Min($r, [Math]::Min($g, $b))
        $sat = $max - $min

        $lumN = [Math]::Max(0.0, ($lum - 62.0) / 120.0)
        $warmN = [Math]::Max(0.0, ($warm - 10.0) / 102.0)
        $satN = [Math]::Max(0.0, ($sat - 6.0) / 80.0)

        $signal = [Math]::Max($lumN, [Math]::Max($warmN * 1.0, $satN * 0.68))

        $dx = [double]$x - $cx
        $dy = [double]$y - $cy
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        $rad = [Math]::Max(0.0, 1.0 - ($dist / $radius))
        $rad = [Math]::Pow($rad, 1.22)

        $alphaNorm = [Math]::Min(1.0, $signal * (0.24 + 1.02 * $rad))
        $alpha = [int][Math]::Round(255.0 * [Math]::Pow($alphaNorm, 1.16))
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        if ($alpha -lt 38) { $alpha = 0 }

        # Output a smooth warm light color to fully remove checkerboard imprint.
        $outR = [int][Math]::Min(255, [Math]::Round(172 + $warm * 0.36))
        $outG = [int][Math]::Min(255, [Math]::Round(136 + $warm * 0.22))
        $outB = [int][Math]::Min(255, [Math]::Round(86 + $warm * 0.08))
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $outR, $outG, $outB))
      }
    }

    $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Converted: $(Split-Path $SourcePath -Leaf) -> $(Split-Path $OutPath -Leaf)"
  }
  finally {
    if ($gm) { $gm.Dispose() }
    if ($gs) { $gs.Dispose() }
    if ($mini) { $mini.Dispose() }
    if ($soft) { $soft.Dispose() }
    if ($src) { $src.Dispose() }
    if ($out) { $out.Dispose() }
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$sequenceDir = Join-Path $projectRoot 'public\assets\ui\start\lights\sequence'
$cleanDir = Join-Path $sequenceDir 'clean'

if (!(Test-Path $sequenceDir)) {
  throw "Sequence folder not found: $sequenceDir"
}
if (!(Test-Path $cleanDir)) {
  New-Item -Path $cleanDir -ItemType Directory -Force | Out-Null
}

$sourceFrames = Get-ChildItem -Path $sequenceDir -File -Filter '*.png' |
  Sort-Object {
    $n = 0
    if ([int]::TryParse($_.BaseName, [ref]$n)) { $n } else { 1000000 }
  }, Name

if ($sourceFrames.Count -eq 0) {
  throw "No PNG sequence frames found in: $sequenceDir"
}

for ($i = 0; $i -lt $sourceFrames.Count; $i++) {
  $src = $sourceFrames[$i]
  $outName = '{0:D2}.png' -f ($i + 1)
  $outPath = Join-Path $cleanDir $outName
  Convert-FrameToTransparent -SourcePath $src.FullName -OutPath $outPath
}

Write-Output "Done. Clean sequence output: $cleanDir"
