# Подготовка игровых ассетов из assets/raw в assets/scenes и assets/sprites.
# PowerShell + System.Drawing вместо Python + Pillow — на этой машине нет
# рабочего Python (в PATH только нерабочая заглушка Microsoft Store).
# Повторяемый скрипт: запускать заново при замене исходников в assets/raw.
#
# Запуск: powershell -File tools/prepare_assets.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$rawDir = Join-Path $root "assets/raw"
$outScenes = Join-Path $root "assets/scenes"
$outSprites = Join-Path $root "assets/sprites"
New-Item -ItemType Directory -Force -Path $outScenes, $outSprites | Out-Null

# ===================== ФОНЫ ЛОКАЦИЙ =====================
# Апскейл 2x (высота < 1500), без обрезки каймы (на сэмплах пикселей по краям
# кайма не подтвердилась). JSON-координаты остаются в системе исходника
# (848x1264), imageScale в manifest.json говорит движку, во сколько раз
# готовая картинка больше — координаты в JSON умножать не нужно, это делает движок.
# Каюта и Коридор — трапеция в исходнике (стены сужаются кверху), но по решению
# от 2026-09-21 это признано некритичным: используем как есть, разметка (JSON)
# просто повторяет реальную трапециевидную форму пола полигоном вместо прямоугольника.
$goodScenes = @("restaurant", "pool", "rome", "cabin", "corridor")
$manifest = @{}

foreach ($name in $goodScenes) {
  $srcPath = Join-Path $rawDir "scenes/$name.jfif"
  $src = [System.Drawing.Image]::FromFile($srcPath)
  $scale = if ($src.Height -lt 1500) { 2 } else { 1 }
  $w = $src.Width * $scale
  $h = $src.Height * $scale
  $dst = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $w, $h)
  $dstPath = Join-Path $outScenes "${name}_bg.png"
  $dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $manifest[$name] = @{ file = "${name}_bg.png"; sourceSize = @($src.Width, $src.Height); imageScale = $scale; stub = $false }
  Write-Output "[bg]   $name -> ${w}x${h} (scale x$scale)"
  $g.Dispose(); $dst.Dispose(); $src.Dispose()
}

# ===================== СПРАЙТ ГЕРОИНИ =====================
# Хромакей: чистый зелёный экран ~ (10,240,34). Работаем через LockBits
# (полное побайтовое чтение) — GetPixel/SetPixel на изображении 848x1264
# на порядки медленнее.

function Read-Argb($bmp) {
  $rect = New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $bmp.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  return @{ bytes = $bytes; stride = $data.Stride; w = $bmp.Width; h = $bmp.Height }
}

function Write-Argb($bytes, $stride, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $bmp.UnlockBits($data)
  return $bmp
}

# Хромакей одной ячейки (сетка BGRA) -> новый массив байт той же ячейки с альфой.
function Remove-GreenScreen($bytes, $stride, $x0, $y0, $w, $h) {
  $out = New-Object byte[] ($w * $h * 4)
  for ($y = 0; $y -lt $h; $y++) {
    $rowBase = ($y0 + $y) * $stride + $x0 * 4
    $outRowBase = $y * $w * 4
    for ($x = 0; $x -lt $w; $x++) {
      $i = $rowBase + $x * 4
      $o = $outRowBase + $x * 4
      $b = $bytes[$i]; $gCh = $bytes[$i + 1]; $r = $bytes[$i + 2]
      $maxRB = [Math]::Max($r, $b)
      $greenness = [int]$gCh - [int]$maxRB
      $alpha = 255
      if ($gCh -gt 100 -and $greenness -gt 60) {
        $alpha = 0
      } elseif ($gCh -gt 80 -and $greenness -gt 15) {
        $alpha = [int](255 * (1 - (($greenness - 15) / 45.0)))
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        $gCh = $maxRB # подавляем зелёный "ободок" на полупрозрачных краях
      }
      $out[$o] = $b
      $out[$o + 1] = $gCh
      $out[$o + 2] = $r
      $out[$o + 3] = [byte]$alpha
    }
  }
  return $out
}

function Get-AlphaBBox($bytes, $w, $h) {
  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $rowBase = $y * $w * 4
    for ($x = 0; $x -lt $w; $x++) {
      $a = $bytes[$rowBase + $x * 4 + 3]
      if ($a -gt 20) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0) { return $null }
  return @{ minX = $minX; maxX = $maxX; minY = $minY; maxY = $maxY }
}

$heroSrcPath = Join-Path $rawDir "hero_girl.jfif"
$heroSrc = [System.Drawing.Bitmap]::FromFile($heroSrcPath)
$cols = 4; $rows = 4
$cellW = [int]($heroSrc.Width / $cols)
$cellH = [int]($heroSrc.Height / $rows)
$inset = 5 # обрезка тёмных линий сетки между ячейками
$srcArgb = Read-Argb $heroSrc
$heroSrc.Dispose()

# Выходные ряды: 0=вниз, 1=влево, 2=вправо, 3=вверх. В исходнике боковые ряды
# перемешаны: вправо смотрят только ряд1 кадры 1-3 и ряд2 кадр 2, остальные —
# влево (а ряд2 кадр 3 — вообще смесь: лицо влево, корпус вправо). Нельзя
# смешивать в одном цикле настоящий кадр и отражённый: у отражения меняются
# местами пробор, ремни рюкзака, ближняя/дальняя рука — раз за цикл фигура
# «переворачивается». Поэтому: вправо = 4 настоящих правых кадра, влево = те же
# 4, отражённые все одинаково.
$rightCells = @(@(1, 1), @(1, 2), @(1, 3), @(2, 2)) # (srcRow, srcCol)
$cellSpec = @{} # "outRow,col" -> @(srcRow, srcCol, mirror)
for ($c = 0; $c -lt 4; $c++) {
  $cellSpec["0,$c"] = @(0, $c, $false)
  $cellSpec["3,$c"] = @(3, $c, $false)
  $cellSpec["2,$c"] = @($rightCells[$c][0], $rightCells[$c][1], $false)
  $cellSpec["1,$c"] = @($rightCells[$c][0], $rightCells[$c][1], $true)
}

$cellsKeyed = @{} # "row,col" -> @{bytes; w; h; bbox}
for ($outRow = 0; $outRow -lt $rows; $outRow++) {
  for ($col = 0; $col -lt $cols; $col++) {
    $spec = $cellSpec["$outRow,$col"]
    $srcRow = $spec[0]; $srcCol = $spec[1]
    $x0 = $srcCol * $cellW + $inset
    $y0 = $srcRow * $cellH + $inset
    $w = $cellW - $inset * 2
    $h = $cellH - $inset * 2
    $keyed = Remove-GreenScreen $srcArgb.bytes $srcArgb.stride $x0 $y0 $w $h
    if ($spec[2]) {
      $flipped = New-Object byte[] ($w * $h * 4)
      for ($y = 0; $y -lt $h; $y++) {
        $rowBase = $y * $w * 4
        for ($x = 0; $x -lt $w; $x++) {
          $srcI = $rowBase + $x * 4
          $dstI = $rowBase + ($w - 1 - $x) * 4
          $flipped[$dstI] = $keyed[$srcI]
          $flipped[$dstI + 1] = $keyed[$srcI + 1]
          $flipped[$dstI + 2] = $keyed[$srcI + 2]
          $flipped[$dstI + 3] = $keyed[$srcI + 3]
        }
      }
      $keyed = $flipped
    }
    $bbox = Get-AlphaBBox $keyed $w $h
    $cellsKeyed["$outRow,$col"] = @{ bytes = $keyed; w = $w; h = $h; bbox = $bbox }
  }
}

# Единый размер кадра по максимальному bbox + отступы, точка "под ногами" —
# нижняя точка bbox по X-центру bbox.
$maxBboxW = 0; $maxBboxH = 0
foreach ($cell in $cellsKeyed.Values) {
  if ($null -eq $cell.bbox) { continue }
  $bw = $cell.bbox.maxX - $cell.bbox.minX + 1
  $bh = $cell.bbox.maxY - $cell.bbox.minY + 1
  if ($bw -gt $maxBboxW) { $maxBboxW = $bw }
  if ($bh -gt $maxBboxH) { $maxBboxH = $bh }
}
$padX = 12; $padBottom = 6; $padTop = 12
$frameW = $maxBboxW + $padX * 2
$frameH = $maxBboxH + $padTop + $padBottom
$feetFrameX = [int]($frameW / 2)
$feetFrameY = $frameH - $padBottom

$sheetW = $frameW * $cols
$sheetH = $frameH * $rows
$sheetBytes = New-Object byte[] ($sheetW * $sheetH * 4) # всё уже 0 = прозрачно

# Точка привязки по X — ОДНА на весь ряд (направление), не на кадр. Руки/ноги
# в шаге смещают центр силуэта кадр от кадра; если центрировать каждый кадр
# отдельно, герой при ходьбе "дрожит"/дёргается влево-вправо вместо ровного
# шага на месте. Берём среднее по ряду — горизонталь стабильна, меняется
# только поза.
$rowFeetX = @{}
for ($outRow = 0; $outRow -lt $rows; $outRow++) {
  $sum = 0; $count = 0
  for ($col = 0; $col -lt $cols; $col++) {
    $cell = $cellsKeyed["$outRow,$col"]
    if ($null -eq $cell.bbox) { continue }
    $sum += ($cell.bbox.minX + $cell.bbox.maxX) / 2
    $count++
  }
  $rowFeetX[$outRow] = if ($count -gt 0) { [int]($sum / $count) } else { 0 }
}

for ($outRow = 0; $outRow -lt $rows; $outRow++) {
  for ($col = 0; $col -lt $cols; $col++) {
    $cell = $cellsKeyed["$outRow,$col"]
    if ($null -eq $cell.bbox) { continue }
    $bw = $cell.bbox.maxX - $cell.bbox.minX + 1
    $bh = $cell.bbox.maxY - $cell.bbox.minY + 1
    $feetX = $rowFeetX[$outRow]
    $feetY = $cell.bbox.maxY
    $destOriginX = ($col * $frameW) + $feetFrameX - ($feetX - $cell.bbox.minX)
    $destOriginY = ($outRow * $frameH) + $feetFrameY - ($feetY - $cell.bbox.minY) - $bh + $bh # base row start
    $destTopY = ($outRow * $frameH) + $feetFrameY - ($cell.bbox.maxY - $cell.bbox.minY)
    for ($y = 0; $y -lt $bh; $y++) {
      $srcRowBase = ($cell.bbox.minY + $y) * $cell.w * 4
      $dstY = $destTopY + $y
      if ($dstY -lt 0 -or $dstY -ge $sheetH) { continue }
      $dstRowBase = $dstY * $sheetW * 4
      for ($x = 0; $x -lt $bw; $x++) {
        $srcI = $srcRowBase + ($cell.bbox.minX + $x) * 4
        $dstX = $destOriginX + $x
        if ($dstX -lt 0 -or $dstX -ge $sheetW) { continue }
        $dstI = $dstRowBase + $dstX * 4
        $a = $cell.bytes[$srcI + 3]
        if ($a -eq 0) { continue }
        $sheetBytes[$dstI] = $cell.bytes[$srcI]
        $sheetBytes[$dstI + 1] = $cell.bytes[$srcI + 1]
        $sheetBytes[$dstI + 2] = $cell.bytes[$srcI + 2]
        $sheetBytes[$dstI + 3] = $a
      }
    }
  }
}

$sheetBmp = Write-Argb $sheetBytes ($sheetW * 4) $sheetW $sheetH
$sheetPath = Join-Path $outSprites "hero_girl.png"
$sheetBmp.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sheetBmp.Dispose()

$heroJson = @{
  file = "hero_girl.png"
  cols = $cols
  rows = $rows
  frameWidth = $frameW
  frameHeight = $frameH
  feet = @($feetFrameX, $feetFrameY)
  directions = @{ down = 0; left = 1; right = 2; up = 3 }
  framesPerRow = $cols
} | ConvertTo-Json
Set-Content -Path (Join-Path $outSprites "hero_girl.json") -Value $heroJson -Encoding UTF8

Write-Output "[hero] frame ${frameW}x${frameH}, sheet ${sheetW}x${sheetH}, feet=($feetFrameX,$feetFrameY)"

$manifestJson = $manifest | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path $outScenes "manifest.json") -Value $manifestJson -Encoding UTF8

Write-Output "Готово."
