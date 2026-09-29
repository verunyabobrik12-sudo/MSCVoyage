# Фоны сцен (assets/scenes/*_bg.png) — несжатые PNG с альфой по 8-11 МБ каждый.
# На мобильном интернете такая картинка грузится очень долго, а во время
# загрузки экран просто чёрный (ни один DOM-элемент HUD ещё не создан).
# Канвас перед отрисовкой фона заливает кадр цветом #12191f (illustratedScene.js,
# draw()) — компонуем PNG на этот же цвет и сохраняем как непрозрачный JPEG,
# чтобы видимый результат не изменился, а вес упал в разы.
# Запуск: powershell -File tools/compress_scene_backgrounds.ps1

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'assets/scenes'
$bgColor = [System.Drawing.Color]::FromArgb(255, 0x12, 0x19, 0x1f)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = [System.Drawing.Imaging.EncoderParameters]::new(1)
$params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]87)

Get-ChildItem -Path $dir -Filter '*_bg.png' | ForEach-Object {
  $src = [System.Drawing.Bitmap]::new($_.FullName)
  $dst = [System.Drawing.Bitmap]::new($src.Width, $src.Height)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.Clear($bgColor)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g.Dispose()

  $jpgPath = Join-Path $dir ($_.BaseName + '.jpg')
  $dst.Save($jpgPath, $codec, $params)
  $dst.Dispose(); $src.Dispose()

  $oldSize = [math]::Round($_.Length / 1MB, 2)
  $newSize = [math]::Round((Get-Item $jpgPath).Length / 1MB, 2)
  Write-Output "$($_.Name): $oldSize MB -> $($_.BaseName + '.jpg'): $newSize MB"
}
