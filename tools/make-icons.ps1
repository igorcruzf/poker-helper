# Gera os PNGs do PWA a partir do mesmo desenho do public/icon.svg.
#
# Por que PNG, se o SVG já existe: o Chrome no Android só monta um WebAPK (o
# app "de verdade", com ícone e janela próprios) se o manifest tiver um ícone
# raster de 192px ou mais. Só com SVG ele instala um atalho comum e passa a
# mostrar aquela notificação fixa "Toque para copiar o URL do site".
#
# Uso (fora do npm, só quando o desenho mudar):
#   powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1

[CmdletBinding()]
param(
  [string] $OutDir
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
if (-not $OutDir) {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  $OutDir = Join-Path $here '..\public'
}
$OutDir = (Resolve-Path $OutDir).Path

function New-Color([string] $hex, [int] $alpha = 255) {
  $c = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
}

# Os 16 tracinhos dourados da borda da ficha, direto do SVG (espaço 512x512).
$ticks = @(
  @(210.97,24.34, 301.03,24.34, 293.78,61.64, 218.22,61.64),
  @(303.05,24.74, 386.26,59.20, 365.28,90.89, 295.47,61.97),
  @(387.97,60.35, 451.65,124.03, 420.15,145.28, 366.72,91.85),
  @(452.80,125.74, 487.26,208.95, 450.03,216.53, 421.11,146.72),
  @(487.66,210.97, 487.66,301.03, 450.36,293.78, 450.36,218.22),
  @(487.26,303.05, 452.80,386.26, 421.11,365.28, 450.03,295.47),
  @(451.65,387.97, 387.97,451.65, 366.72,420.15, 420.15,366.72),
  @(386.26,452.80, 303.05,487.26, 295.47,450.03, 365.28,421.11),
  @(301.03,487.66, 210.97,487.66, 218.22,450.36, 293.78,450.36),
  @(208.95,487.26, 125.74,452.80, 146.72,421.11, 216.53,450.03),
  @(124.03,451.65, 60.35,387.97, 91.85,366.72, 145.28,420.15),
  @(59.20,386.26, 24.74,303.05, 61.97,295.47, 90.89,365.28),
  @(24.34,301.03, 24.34,210.97, 61.64,218.22, 61.64,293.78),
  @(24.74,208.95, 59.20,125.74, 90.89,146.72, 61.97,216.53),
  @(60.35,124.03, 124.03,60.35, 145.28,91.85, 91.85,145.28),
  @(125.74,59.20, 208.95,24.74, 216.53,61.97, 146.72,90.89)
)

# Naipe de espadas: as mesmas curvas do SVG, com a translação (256,250) já
# embutida para não empilhar transformações no Graphics. Cada linha é uma curva
# de Bézier — x0,y0, c1x,c1y, c2x,c2y, x1,y1 — no sistema de coordenadas do SVG.
$spadeCurves = @(
  @(  0,-72,  38,-36,  62, -6,  62, 26),
  @( 62, 26,  62, 54,  40, 72,  14, 72),
  @( 14, 72,   7, 72,   2, 70,   0, 68),
  @(  0, 68,  -2, 70,  -7, 72, -14, 72),
  @(-14, 72, -40, 72, -62, 54, -62, 26),
  @(-62, 26, -62, -6, -38,-36,   0,-72)
)
$spadeStem = @(0,54, -20,98, 20,98)

function New-SpadePath {
  $ox = 256.0
  $oy = 250.0
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath

  $p.StartFigure()
  foreach ($c in $spadeCurves) {
    $p.AddBezier(
      (New-Object System.Drawing.PointF([float]($c[0] + $ox), [float]($c[1] + $oy))),
      (New-Object System.Drawing.PointF([float]($c[2] + $ox), [float]($c[3] + $oy))),
      (New-Object System.Drawing.PointF([float]($c[4] + $ox), [float]($c[5] + $oy))),
      (New-Object System.Drawing.PointF([float]($c[6] + $ox), [float]($c[7] + $oy)))
    )
  }
  $p.CloseFigure()

  $p.StartFigure()
  $p.AddPolygon([System.Drawing.PointF[]] @(
    (New-Object System.Drawing.PointF([float]($spadeStem[0] + $ox), [float]($spadeStem[1] + $oy))),
    (New-Object System.Drawing.PointF([float]($spadeStem[2] + $ox), [float]($spadeStem[3] + $oy))),
    (New-Object System.Drawing.PointF([float]($spadeStem[4] + $ox), [float]($spadeStem[5] + $oy)))
  ))
  $p.CloseFigure()
  return $p
}

# Desenha a ficha inteira dentro de um quadrado de lado 512 no espaço atual.
function Draw-Chip([System.Drawing.Graphics] $g) {
  # corpo externo
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (New-Color '#2F2C1E')), 20, 20, 472, 472)

  # tracinhos ao redor
  $gold = New-Object System.Drawing.SolidBrush (New-Color '#E8C34A')
  foreach ($tk in $ticks) {
    $pts = [System.Drawing.PointF[]] @(
      (New-Object System.Drawing.PointF([float]$tk[0], [float]$tk[1])),
      (New-Object System.Drawing.PointF([float]$tk[2], [float]$tk[3])),
      (New-Object System.Drawing.PointF([float]$tk[4], [float]$tk[5])),
      (New-Object System.Drawing.PointF([float]$tk[6], [float]$tk[7]))
    )
    $g.FillPolygon($gold, $pts)
  }
  $gold.Dispose()

  # corpo principal com o degradê radial (claro no alto à esquerda)
  $body = New-Object System.Drawing.Drawing2D.GraphicsPath
  $body.AddEllipse(42, 42, 428, 428)
  $radial = New-Object System.Drawing.Drawing2D.PathGradientBrush($body)
  $radial.CenterPoint = New-Object System.Drawing.PointF(191.8, 170.4)
  $radial.CenterColor = New-Color '#1F3A29'
  $radial.SurroundColors = @((New-Color '#122019'))
  $g.FillPath($radial, $body)
  $radial.Dispose(); $body.Dispose()

  # anéis dourados
  $ringBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(80, 80)),
    (New-Object System.Drawing.PointF(432, 432)),
    (New-Color '#E8C34A'), (New-Color '#B8933F'))
  $penOuter = New-Object System.Drawing.Pen($ringBrush, [float]6)
  $g.DrawEllipse($penOuter, 80, 80, 352, 352)
  $penOuter.Dispose()

  $ringBrushSoft = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(80, 80)),
    (New-Object System.Drawing.PointF(432, 432)),
    (New-Color '#E8C34A' 204), (New-Color '#B8933F' 204))
  $penInner = New-Object System.Drawing.Pen($ringBrushSoft, [float]3)
  $g.DrawEllipse($penInner, 98, 98, 316, 316)
  $penInner.Dispose(); $ringBrush.Dispose(); $ringBrushSoft.Dispose()

  # naipe central
  $spade = New-SpadePath
  $cream = New-Object System.Drawing.SolidBrush (New-Color '#F1E9C3')
  $g.FillPath($cream, $spade)
  $cream.Dispose(); $spade.Dispose()
}

# $Inset: quanto a ficha encolhe dentro do quadrado (maskable precisa de folga
# porque o Android recorta o ícone num círculo/squircle).
function Save-Icon([string] $file, [int] $size, [string] $background, [double] $inset) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  if ($background) {
    $g.Clear((New-Color $background))
  } else {
    $g.Clear([System.Drawing.Color]::Transparent)
  }

  $scale = ($size / 512.0) * (1.0 - 2 * $inset)
  $offset = $size * $inset
  $g.TranslateTransform([float]$offset, [float]$offset)
  $g.ScaleTransform([float]$scale, [float]$scale)
  Draw-Chip $g

  $path = Join-Path $OutDir $file
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "gerado: $path ($size x $size)"
}

# "any": a ficha ocupa tudo, fundo transparente.
Save-Icon 'icon-192.png' 192 $null 0.0
Save-Icon 'icon-512.png' 512 $null 0.0
# "maskable": fundo cheio e ficha dentro da zona segura (80% do lado).
Save-Icon 'icon-maskable-512.png' 512 '#0E211B' 0.11
# iOS não aplica máscara nem lida bem com transparência: fundo sólido.
Save-Icon 'apple-touch-icon.png' 180 '#0E211B' 0.06
