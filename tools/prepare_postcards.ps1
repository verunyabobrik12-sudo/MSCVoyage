# Открытки для альбома (раздел 3.9): горизонтальные кадры 640x480 из готовых
# иллюстраций локаций. Полные фоны сцен (assets/scenes) весят по ~9 МБ — для
# превью в альбоме слишком тяжело, поэтому отдельные лёгкие jpg.
# Запуск: powershell -File tools/prepare_postcards.ps1

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'assets/postcards'
New-Item -ItemType Directory -Force -Path $out | Out-Null

# id -> исходник и область кадра (x, y, w, h в пикселях исходника), 4:3
$cards = @(
  @{ id = 'cabin';      src = 'assets/raw/scenes/cabin.jfif';      rect = @(0, 60, 848, 636) },
  @{ id = 'rome';       src = 'assets/raw/scenes/rome.jfif';       rect = @(0, 0, 848, 636) },
  @{ id = 'restaurant'; src = 'assets/raw/scenes/restaurant.jfif'; rect = @(0, 0, 848, 636) },
  @{ id = 'pool';       src = 'assets/raw/scenes/pool.jfif';       rect = @(0, 120, 848, 636) },
  @{ id = 'trevi';      src = 'assets/minigames/runner/obstacles/fountain_finish.png'; rect = @(0, 40, 985, 739) }
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = [System.Drawing.Imaging.EncoderParameters]::new(1)
$params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]86)

foreach ($c in $cards) {
  $src = [System.Drawing.Image]::FromFile((Join-Path $root $c.src))
  $dst = [System.Drawing.Bitmap]::new(640, 480)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  # прозрачный фон у фонтана — тёплый кремовый, в тон интерфейса
  $g.Clear([System.Drawing.Color]::FromArgb(255, 250, 238, 214))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $r = $c.rect
  $g.DrawImage($src, [System.Drawing.Rectangle]::new(0, 0, 640, 480), [System.Drawing.Rectangle]::new($r[0], $r[1], $r[2], $r[3]), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $path = Join-Path $out ($c.id + '.jpg')
  $dst.Save($path, $codec, $params)
  $dst.Dispose(); $src.Dispose()
  Write-Output "[postcard] $($c.id) -> $path"
}
