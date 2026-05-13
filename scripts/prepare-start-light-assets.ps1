Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function Get-WarmPeak {
  param([System.Drawing.Bitmap]$Image)

  $bestScore = [double]::NegativeInfinity
  $bestX = 0
  $bestY = 0

  for ($y = 0; $y -lt $Image.Height; $y += 2) {
    for ($x = 0; $x -lt $Image.Width; $x += 2) {
      $c = $Image.GetPixel($x, $y)
      $score = ([double]$c.R + [double]$c.G - 2.0 * [double]$c.B)
      if ($score -gt $bestScore) {
        $bestScore = $score
        $bestX = $x
        $bestY = $y
      }
    }
  }

  return @{
    x = $bestX
    y = $bestY
    score = $bestScore
  }
}

function Convert-LightLayerToTransparent {
  param(
    [string]$SourcePath,
    [string]$OutPath,
    [double]$Radius
  )

  if (!(Test-Path $SourcePath)) {
    throw "Source not found: $SourcePath"
  }

  $src = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $out = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  try {
    $peak = Get-WarmPeak -Image $src
    $px = [double]$peak.x
    $py = [double]$peak.y

    for ($y = 0; $y -lt $src.Height; $y++) {
      for ($x = 0; $x -lt $src.Width; $x++) {
        $c = $src.GetPixel($x, $y)
        $r = [double]$c.R
        $g = [double]$c.G
        $b = [double]$c.B

        $max = [Math]::Max($r, [Math]::Max($g, $b))
        $min = [Math]::Min($r, [Math]::Min($g, $b))
        $sat = $max - $min
        $lum = ($r + $g + $b) / 3.0
        $warm = [Math]::Max(0.0, ($r + $g - 2.0 * $b))

        $warmN = [Math]::Max(0.0, ($warm - 8.0) / 150.0)
        $satN = [Math]::Max(0.0, ($sat - 6.0) / 95.0)
        $lumN = [Math]::Max(0.0, ($lum - 188.0) / 68.0)
        $signal = [Math]::Max($warmN, [Math]::Max($satN, $lumN))

        $dx = [double]$x - $px
        $dy = [double]$y - $py
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        $rad = [Math]::Max(0.0, 1.0 - ($dist / $Radius))
        $rad = [Math]::Pow($rad, 0.72)

        $aNorm = [Math]::Min(1.0, $signal * $rad * 1.45)
        $alpha = [int][Math]::Round(255.0 * [Math]::Pow($aNorm, 0.92))
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        if ($alpha -lt 22) { $alpha = 0 }

        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, [int]$r, [int]$g, [int]$b))
      }
    }

    $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Converted light layer: $OutPath (peak=$($peak.x),$($peak.y))"
  }
  finally {
    if ($src) { $src.Dispose() }
    if ($out) { $out.Dispose() }
  }
}

function Convert-NoiseToTransparent {
  param(
    [string]$SourcePath,
    [string]$OutPath
  )

  if (!(Test-Path $SourcePath)) {
    throw "Source not found: $SourcePath"
  }

  $src = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $out = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  try {
    for ($y = 0; $y -lt $src.Height; $y++) {
      for ($x = 0; $x -lt $src.Width; $x++) {
        $c = $src.GetPixel($x, $y)
        $lum = (([double]$c.R + [double]$c.G + [double]$c.B) / 3.0)

        # Keep denser cloud zones and fade flat gray floor to transparency.
        $aNorm = [Math]::Max(0.0, ($lum - 132.0) / 96.0)
        $alpha = [int][Math]::Round([Math]::Min(255.0, 255.0 * [Math]::Pow($aNorm, 1.15)))
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        if ($alpha -lt 12) { $alpha = 0 }

        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
      }
    }

    $out.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Converted noise: $OutPath"
  }
  finally {
    if ($src) { $src.Dispose() }
    if ($out) { $out.Dispose() }
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$lightsDir = Join-Path $projectRoot 'public\assets\ui\start\lights'

$coreSrc = Join-Path $lightsDir 'light_core.png.png'
$haloSrc = Join-Path $lightsDir 'light_halo.png.png'
$noiseSrc = Join-Path $lightsDir 'light_noise.png.png'

$coreOut = Join-Path $lightsDir 'light_core.png'
$haloOut = Join-Path $lightsDir 'light_halo.png'
$noiseOut = Join-Path $lightsDir 'light_noise.png'

Convert-LightLayerToTransparent -SourcePath $coreSrc -OutPath $coreOut -Radius 980
Convert-LightLayerToTransparent -SourcePath $haloSrc -OutPath $haloOut -Radius 1280
Convert-NoiseToTransparent -SourcePath $noiseSrc -OutPath $noiseOut

Write-Output 'Done: transparent light assets generated.'
