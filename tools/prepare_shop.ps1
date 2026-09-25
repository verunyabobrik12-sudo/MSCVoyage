# Картинки экскурсий для «Магазина» (раздел 3.7): кадры 640x480 из уже
# нарисованного арта игры — дальний и средний слои раннера (Колизей, купол
# собора Святого Петра, римские дома) и еда из ресторанной мини-игры.
# Запуск: powershell -File tools/prepare_shop.ps1

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'assets/shop'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = [System.Drawing.Imaging.EncoderParameters]::new(1)
$params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]86)
$cream = [System.Drawing.Color]::FromArgb(255, 250, 238, 214)
$sky = [System.Drawing.Color]::FromArgb(255, 200, 230, 245)

function New-Canvas($bg) {
  $bmp = [System.Drawing.Bitmap]::new(640, 480)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($bg)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return @{ bmp = $bmp; g = $g }
}
function Save-Canvas($c, $name) {
  $c.g.Dispose()
  $path = Join-Path $out "$name.jpg"
  $c.bmp.Save($path, $codec, $params)
  $c.bmp.Dispose()
  Write-Output "[shop] $name -> $path"
}

# кадры из слоёв раннера: (x, y, w, h) в пикселях слоя, 4:3
$crops = @(
  @{ id = 'colosseum'; layer = 'far'; rect = @(420, 110, 400, 300); bg = $sky },
  @{ id = 'vatican';   layer = 'far'; rect = @(0, 100, 400, 300);   bg = $sky },
  @{ id = 'oldrome';   layer = 'mid'; rect = @(150, 20, 500, 375);  bg = $cream }
)
foreach ($c in $crops) {
  $src = [System.Drawing.Image]::FromFile((Join-Path $root "assets/minigames/runner/$($c.layer).png"))
  $cv = New-Canvas $c.bg
  $r = $c.rect
  $cv.g.DrawImage($src, [System.Drawing.Rectangle]::new(0, 0, 640, 480), [System.Drawing.Rectangle]::new($r[0], $r[1], $r[2], $r[3]), [System.Drawing.GraphicsUnit]::Pixel)
  $src.Dispose()
  Save-Canvas $cv $c.id
}

# гастрономический тур: паста, пицца и тирамису на кремовом фоне
$cv = New-Canvas $cream
$items = @(
  @{ name = 'pasta_italian';    x = 30;  y = 150; h = 260 },
  @{ name = 'pizza_italian';    x = 330; y = 40;  h = 230 },
  @{ name = 'tiramisu_italian'; x = 350; y = 250; h = 200 }
)
foreach ($it in $items) {
  $img = [System.Drawing.Image]::FromFile((Join-Path $root "assets/minigames/catch/items/$($it.name).png"))
  $w = [int]($img.Width * $it.h / $img.Height)
  $cv.g.DrawImage($img, $it.x, $it.y, $w, $it.h)
  $img.Dispose()
}
Save-Canvas $cv 'food'
