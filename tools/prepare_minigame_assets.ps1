# Подготовка ассетов трёх мини-игр (этап 3, раздел 1) из assets/raw в
# assets/minigames. PowerShell + System.Drawing вместо Python + Pillow — на
# этой машине нет рабочего Python (см. tools/prepare_assets.ps1, та же причина).
# Повторяемый скрипт: запускать заново при замене исходников в assets/raw.
#
# Запуск: powershell -File tools/prepare_minigame_assets.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$rawDir = Join-Path $root "assets/raw"
$outDir = Join-Path $root "assets/minigames"
$reportDir = Join-Path $root "tools/_asset_report"
New-Item -ItemType Directory -Force -Path $outDir, $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outDir "catch"), (Join-Path $outDir "catch/items"), (Join-Path $outDir "ball"), (Join-Path $outDir "ball/sprites"), (Join-Path $outDir "runner"), (Join-Path $outDir "runner/obstacles") | Out-Null

# ===================== ОБЩИЕ ФУНКЦИИ (LockBits, быстрее GetPixel/SetPixel) =====================

function Read-Argb($bmp) {
  $rect = New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $bmp.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  return @{ bytes = $bytes; stride = $data.Stride; w = $bmp.Width; h = $bmp.Height }
}

function Write-Argb($bytes, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $bmp.UnlockBits($data)
  return $bmp
}

# Хромакей + despill одной прямоугольной области источника -> новый массив
# байт (BGRA) того же размера. Пороги подобраны в tools/prepare_assets.ps1
# на этом же стиле арта (chroma ~ (10,240,34)) — переиспользуем как есть.
function Remove-GreenScreen($srcBytes, $srcStride, $x0, $y0, $w, $h) {
  $out = New-Object byte[] ($w * $h * 4)
  for ($y = 0; $y -lt $h; $y++) {
    $rowBase = ($y0 + $y) * $srcStride + $x0 * 4
    $outRowBase = $y * $w * 4
    for ($x = 0; $x -lt $w; $x++) {
      $i = $rowBase + $x * 4
      $o = $outRowBase + $x * 4
      $b = $srcBytes[$i]; $gCh = $srcBytes[$i + 1]; $r = $srcBytes[$i + 2]
      $maxRB = [Math]::Max($r, $b)
      $greenness = [int]$gCh - [int]$maxRB
      $alpha = 255
      if ($gCh -gt 100 -and $greenness -gt 60) {
        $alpha = 0
      } elseif ($gCh -gt 80 -and $greenness -gt 15) {
        $alpha = [int](255 * (1 - (($greenness - 15) / 45.0)))
        if ($alpha -lt 0) { $alpha = 0 }
        if ($alpha -gt 255) { $alpha = 255 }
        $gCh = $maxRB
      }
      $out[$o] = $b
      $out[$o + 1] = $gCh
      $out[$o + 2] = $r
      $out[$o + 3] = [byte]$alpha
    }
  }
  return $out
}

function Get-AlphaBBox($bytes, $w, $h, [int]$threshold = 20) {
  $minX = $w; $maxX = -1; $minY = $h; $maxY = -1
  for ($y = 0; $y -lt $h; $y++) {
    $rowBase = $y * $w * 4
    for ($x = 0; $x -lt $w; $x++) {
      $a = $bytes[$rowBase + $x * 4 + 3]
      if ($a -gt $threshold) {
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

# Обрезка BGRA-массива по bbox + паддинг -> новый (bytes,w,h).
function Crop-Argb($bytes, $w, $h, $bbox, [int]$pad = 4) {
  $x0 = [Math]::Max(0, $bbox.minX - $pad)
  $y0 = [Math]::Max(0, $bbox.minY - $pad)
  $x1 = [Math]::Min($w - 1, $bbox.maxX + $pad)
  $y1 = [Math]::Min($h - 1, $bbox.maxY + $pad)
  $cw = $x1 - $x0 + 1
  $ch = $y1 - $y0 + 1
  $out = New-Object byte[] ($cw * $ch * 4)
  for ($y = 0; $y -lt $ch; $y++) {
    $srcRowBase = ($y0 + $y) * $w * 4 + $x0 * 4
    $dstRowBase = $y * $cw * 4
    [Array]::Copy($bytes, $srcRowBase, $out, $dstRowBase, $cw * 4)
  }
  return @{ bytes = $out; w = $cw; h = $ch }
}

function Save-ArgbPng($argb, $path) {
  $bmp = Write-Argb $argb.bytes $argb.w $argb.h
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# Контрольный лист: сетка подписанных превью на сером шахматном фоне
# (чтобы была видна прозрачность), для визуальной проверки перед продолжением.
function New-ContactSheet($items, $outPath, [int]$cols = 4, [int]$cellSize = 220) {
  $rows = [Math]::Ceiling($items.Count / $cols)
  $labelH = 26
  $sheetW = $cols * $cellSize
  $sheetH = $rows * ($cellSize + $labelH)
  $bmp = New-Object System.Drawing.Bitmap($sheetW, $sheetH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 235, 235, 235))
  $checkA = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 210, 210, 210))
  $font = New-Object System.Drawing.Font("Consolas", 11)
  $brushText = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::Black)
  for ($idx = 0; $idx -lt $items.Count; $idx++) {
    $col = $idx % $cols
    $row = [Math]::Floor($idx / $cols)
    $cellX = $col * $cellSize
    $cellY = $row * ($cellSize + $labelH)
    # шахматка для наглядности альфы
    for ($cy = 0; $cy -lt $cellSize; $cy += 16) {
      for ($cx = 0; $cx -lt $cellSize; $cx += 16) {
        if ((([int]($cx / 16)) + ([int]($cy / 16))) % 2 -eq 0) {
          $g.FillRectangle($checkA, $cellX + $cx, $cellY + $cx * 0 + $cy, 16, 16)
        }
      }
    }
    $item = $items[$idx]
    if ($null -ne $item.bmp) {
      $iw = $item.bmp.Width; $ih = $item.bmp.Height
      $scale = [Math]::Min(($cellSize - 10) / [double]$iw, ($cellSize - 10) / [double]$ih)
      if ($scale -gt 1) { $scale = 1 }
      $dw = [int]($iw * $scale); $dh = [int]($ih * $scale)
      $dx = $cellX + [int](($cellSize - $dw) / 2)
      $dy = $cellY + [int](($cellSize - $dh) / 2)
      $g.DrawImage($item.bmp, $dx, $dy, $dw, $dh)
    }
    $g.DrawString($item.label, $font, $brushText, $cellX + 4, $cellY + $cellSize + 4)
    $g.DrawRectangle([System.Drawing.Pens]::Gray, $cellX, $cellY, $cellSize - 1, $cellSize + $labelH - 1)
  }
  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Write-Output "=== Подготовка ассетов мини-игр ==="

$report = @()

# Универсальная нарезка листа cols x rows на именованные PNG с прозрачностью.
# names — плоский массив длины cols*rows в порядке чтения (слева-направо,
# сверху-вниз), $null пропускает ячейку. inset обрезает возможные тонкие
# линии сетки/паддинг между ячейками до хромакея.
function Split-Grid($srcPath, $cols, $rows, $names, $outDirPath, [int]$inset = 6, [int]$pad = 4) {
  $src = [System.Drawing.Bitmap]::FromFile($srcPath)
  $argb = Read-Argb $src
  $src.Dispose()
  $cellW = [int]($argb.w / $cols)
  $cellH = [int]($argb.h / $rows)
  $results = @()
  for ($row = 0; $row -lt $rows; $row++) {
    for ($col = 0; $col -lt $cols; $col++) {
      $idx = $row * $cols + $col
      $name = $names[$idx]
      if ($null -eq $name) { continue }
      $x0 = $col * $cellW + $inset
      $y0 = $row * $cellH + $inset
      $w = $cellW - $inset * 2
      $h = $cellH - $inset * 2
      $keyed = Remove-GreenScreen $argb.bytes $argb.stride $x0 $y0 $w $h
      $bbox = Get-AlphaBBox $keyed $w $h
      if ($null -eq $bbox) {
        Write-Output "  [!] $name (row=$row,col=$col): пусто после хромакея — пропущено"
        continue
      }
      $cropped = Crop-Argb $keyed $w $h $bbox $pad
      $outPath = Join-Path $outDirPath "$name.png"
      Save-ArgbPng $cropped $outPath
      $bmpForSheet = [System.Drawing.Bitmap]::FromFile($outPath)
      $results += @{ label = "$name (${row},${col})"; bmp = $bmpForSheet; w = $cropped.w; h = $cropped.h; name = $name }
    }
  }
  return $results
}

# Находит верхнюю границу стола внизу фона: построчная средняя яркость нижних
# 45% картинки, ищем строку с максимальным скачком яркости (деревянный пол ->
# светлая скатерть) — программно, не на глаз по превью.
function Find-BottomCutoff($srcPath, [double]$searchFrom = 0.55) {
  $src = [System.Drawing.Bitmap]::FromFile($srcPath)
  $argb = Read-Argb $src
  $src.Dispose()
  $y0 = [int]($argb.h * $searchFrom)
  $rowAvg = @{}
  for ($y = $y0; $y -lt $argb.h; $y++) {
    $sum = 0; $n = 0
    $rowBase = $y * $argb.stride
    for ($x = 0; $x -lt $argb.w; $x += 4) {
      $i = $rowBase + $x * 4
      $sum += ($argb.bytes[$i] + $argb.bytes[$i + 1] + $argb.bytes[$i + 2])
      $n++
    }
    $rowAvg[$y] = $sum / $n
  }
  $bestY = $y0; $bestDiff = 0
  for ($y = $y0 + 1; $y -lt $argb.h; $y++) {
    $diff = [Math]::Abs($rowAvg[$y] - $rowAvg[$y - 1])
    if ($diff -gt $bestDiff) { $bestDiff = $diff; $bestY = $y }
  }
  return @{ y = $bestY; h = $argb.h; w = $argb.w; diff = $bestDiff }
}

function Crop-TopBand($srcPath, [int]$cutY, $outPath) {
  $src = [System.Drawing.Bitmap]::FromFile($srcPath)
  $dst = New-Object System.Drawing.Bitmap($src.Width, $cutY)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $src.Width, $cutY)), (New-Object System.Drawing.Rectangle(0, 0, $src.Width, $cutY)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $dst.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $dst.Dispose(); $src.Dispose()
}

# ===================== «ПОЙМАЙ ИТАЛЬЯНСКОЕ» =====================
Write-Output "`n--- catch ---"
$catchDir = Join-Path $rawDir "catch"
$catchOut = Join-Path $outDir "catch"

$cut = Find-BottomCutoff (Join-Path $catchDir "catch bg.jfif")
Crop-TopBand (Join-Path $catchDir "catch bg.jfif") $cut.y (Join-Path $catchOut "bg.png")
Write-Output "  [bg] обрезано по y=$($cut.y) из $($cut.h) (перепад яркости $([Math]::Round($cut.diff,1))) -> убран стол внизу"
$report += "catch/bg.png: обрезано снизу по программно найденной границе стола (y=$($cut.y) из $($cut.h))"

# 3 колонки x 4 строки, порядок чтения слева-направо/сверху-вниз.
$itemNames = @(
  "pizza_italian", "pasta_italian", "parmesan_italian",
  "olives_italian", "tiramisu_italian", "tomato_italian",
  "sushi_asian", "espresso_italian", "basil_italian",
  "ramen_asian", "dimsum_asian", "chopsticks_asian"
)
$itemResults = Split-Grid (Join-Path $catchDir "items.jfif") 3 4 $itemNames (Join-Path $catchOut "items")
Write-Output "  [items] нарезано $($itemResults.Count) из 12"
New-ContactSheet $itemResults (Join-Path $reportDir "contact_catch_items.png") 3 200
$report += "catch/player.jfif: НЕ использован — на листе мужчина-официант, а не героиня (см. отчёт); код рисует героиню из hero_girl + поднос процедурно, как fallback из ТЗ"

# ===================== «НЕ УРОНИ МЯЧ» =====================
Write-Output "`n--- ball ---"
$ballDir = Join-Path $rawDir "ball"
$ballOut = Join-Path $outDir "ball"

$ballBgSrc = [System.Drawing.Bitmap]::FromFile((Join-Path $ballDir "ball bg.jfif"))
$ballBgSrc.Save((Join-Path $ballOut "bg.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ballBgSrc.Dispose()
Write-Output "  [bg] сохранён как есть (пустой центр, бассейн внизу — уже соответствует ТЗ)"

# 4 колонки x 3 строки. Помечаю extra_* то, что не входит в её список
# бонусов/ловушек раздела 2.2 — решить, использовать ли, в отчёте.
$ballNames = @(
  "ball_main", "paddle", "bonus_star", "bonus_coin",
  "bonus_heart", "trap_splash", "trap_drop", "trap_urchin",
  "extra_ball_alt1", "extra_chest_locked", "extra_ball_alt2", "extra_trap_urchin_dup"
)
$ballResults = Split-Grid (Join-Path $ballDir "sprites.jfif") 4 3 $ballNames (Join-Path $ballOut "sprites")
Write-Output "  [sprites] нарезано $($ballResults.Count) из 12"
New-ContactSheet $ballResults (Join-Path $reportDir "contact_ball_sprites.png") 4 200
$report += "ball/sprites: extra_ball_alt1, extra_ball_alt2 — два доп. варианта мяча, не описанные в ТЗ (используется только ball_main); extra_chest_locked — сундук с замком, роли в разделе 2.2 нет; extra_trap_urchin_dup — второй экземпляр морского ежа"

# ===================== «МОНЕТКИ ТРЕВИ» (раннер) =====================
Write-Output "`n--- runner ---"
$runnerDir = Join-Path $rawDir "runner"
$runnerOut = Join-Path $outDir "runner"

# Бесшовная склейка краёв "offset & blend": каждый пиксель на расстоянии
# distFromEdge < band от левого/правого края подмешивает пиксель с
# противоположного края с весом (1 - distFromEdge/band) — оба края тем самым
# сходятся к одному и тому же смешанному цвету и совпадают при тайле.
# Работает и с альфой (после хромакея), и без неё (opaque far-слой).
function Add-SeamBlend($argb, [int]$band) {
  $w = $argb.w; $h = $argb.h
  $out = [byte[]]$argb.bytes.Clone()
  for ($y = 0; $y -lt $h; $y++) {
    $rowBase = $y * $w * 4
    for ($d = 0; $d -lt $band; $d++) {
      $wt = 1.0 - ($d / [double]$band) # вес противоположного края на этом расстоянии
      foreach ($x in @($d, ($w - 1 - $d))) {
        $mirrorX = if ($x -eq $d) { $w - 1 - $d } else { $d }
        $i = $rowBase + $x * 4
        $m = $rowBase + $mirrorX * 4
        for ($c = 0; $c -lt 4; $c++) {
          $orig = $argb.bytes[$i + $c]
          $opp = $argb.bytes[$m + $c]
          $out[$i + $c] = [byte]([Math]::Round($orig * (1 - $wt) + $opp * $wt))
        }
      }
    }
  }
  return @{ bytes = $out; w = $w; h = $h }
}

function Save-TiledPreview($pngPath, $outPreviewPath, [int]$repeats = 3) {
  $img = [System.Drawing.Image]::FromFile($pngPath)
  $bmp = New-Object System.Drawing.Bitmap($img.Width * $repeats, $img.Height)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  for ($i = 0; $i -lt $repeats; $i++) { $g.DrawImage($img, $i * $img.Width, 0) }
  $g.Dispose(); $img.Dispose()
  $bmp.Save($outPreviewPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# far — уже без хромакея (непрозрачное небо/дымка), только шов.
$farSrc = [System.Drawing.Bitmap]::FromFile((Join-Path $runnerDir "far.jfif"))
$farArgb = Read-Argb $farSrc
$farSrc.Dispose()
$farBand = [int]($farArgb.w * 0.12)
$farBlended = Add-SeamBlend $farArgb $farBand
Save-ArgbPng $farBlended (Join-Path $runnerOut "far.png")
Save-TiledPreview (Join-Path $runnerOut "far.png") (Join-Path $reportDir "tile_far_x3.png")
Write-Output "  [far] шов ${farBand}px, сохранено + превью x3"

# mid/ground — хромакей всего листа, потом шов.
foreach ($layer in @("mid", "ground")) {
  $src = [System.Drawing.Bitmap]::FromFile((Join-Path $runnerDir "$layer.jfif"))
  $srcArgb = Read-Argb $src
  $src.Dispose()
  $keyed = Remove-GreenScreen $srcArgb.bytes $srcArgb.stride 0 0 $srcArgb.w $srcArgb.h
  $keyedArgb = @{ bytes = $keyed; w = $srcArgb.w; h = $srcArgb.h }
  if ($layer -eq "ground") {
    # только нижняя часть с бордюром — обрезаем по bbox непрозрачных пикселей
    $bbox = Get-AlphaBBox $keyed $srcArgb.w $srcArgb.h
    $keyedArgb = Crop-Argb $keyed $srcArgb.w $srcArgb.h $bbox 0
  }
  $band = [int]($keyedArgb.w * 0.12)
  $blended = Add-SeamBlend $keyedArgb $band
  Save-ArgbPng $blended (Join-Path $runnerOut "$layer.png")
  Save-TiledPreview (Join-Path $runnerOut "$layer.png") (Join-Path $reportDir "tile_${layer}_x3.png")
  Write-Output "  [$layer] хромакей + шов ${band}px, сохранено + превью x3"
}
$report += "runner/far,mid,ground: бесшовность сделана смешиванием краёв (offset & blend), не поиском периода повтора — проверь превью tile_*_x3.png на видимый шов/повтор текстуры"

# Связные компоненты по альфе (4-связность, BFS) — для листа, где объекты
# расположены не строгой сеткой (obstacles_coins_finish). Возвращает bbox'ы,
# отсортированные по центру (сверху-вниз, слева-направо).
function Get-ConnectedComponents($argb, [int]$alphaThreshold = 20, [int]$minArea = 150) {
  $w = $argb.w; $h = $argb.h
  $visited = New-Object bool[] ($w * $h)
  function AlphaAt($x, $y) { return $argb.bytes[($y * $w + $x) * 4 + 3] }
  $components = @()
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $flat = $y * $w + $x
      if ($visited[$flat]) { continue }
      $visited[$flat] = $true
      if ((AlphaAt $x $y) -le $alphaThreshold) { continue }
      $queue = New-Object System.Collections.Generic.Queue[int]
      $queue.Enqueue($flat)
      $minX = $x; $maxX = $x; $minY = $y; $maxY = $y; $area = 0
      while ($queue.Count -gt 0) {
        $cur = $queue.Dequeue()
        $cy = [int]($cur / $w); $cx = $cur - $cy * $w
        $area++
        if ($cx -lt $minX) { $minX = $cx }; if ($cx -gt $maxX) { $maxX = $cx }
        if ($cy -lt $minY) { $minY = $cy }; if ($cy -gt $maxY) { $maxY = $cy }
        foreach ($n in @(@(($cx - 1), $cy), @(($cx + 1), $cy), @($cx, ($cy - 1)), @($cx, ($cy + 1)))) {
          $nx = $n[0]; $ny = $n[1]
          if ($nx -lt 0 -or $nx -ge $w -or $ny -lt 0 -or $ny -ge $h) { continue }
          $nflat = $ny * $w + $nx
          if ($visited[$nflat]) { continue }
          $visited[$nflat] = $true
          if ((AlphaAt $nx $ny) -le $alphaThreshold) { continue }
          $queue.Enqueue($nflat)
        }
      }
      if ($area -ge $minArea) {
        $components += @{ minX = $minX; maxX = $maxX; minY = $minY; maxY = $maxY; area = $area }
      }
    }
  }
  return $components | Sort-Object { $_.minY }, { $_.minX }
}

# ===================== ПРЕПЯТСТВИЯ/МОНЕТЫ/ФИНИШ (раннер) =====================
Write-Output "`n--- runner obstacles/coins/finish ---"
$obSrc = [System.Drawing.Bitmap]::FromFile((Join-Path $runnerDir "obstacles_coins_finish.png"))
$obArgb = Read-Argb $obSrc
$obSrc.Dispose()
$obKeyedBytes = Remove-GreenScreen $obArgb.bytes $obArgb.stride 0 0 $obArgb.w $obArgb.h
$obKeyed = @{ bytes = $obKeyedBytes; w = $obArgb.w; h = $obArgb.h }
$components = Get-ConnectedComponents $obKeyed
Write-Output "  найдено связных объектов: $($components.Count) (ожидалось по ТЗ: 5 в ряду препятствий + 4 монеты + 1 фонтан = 10)"

# Предположительные имена по порядку чтения — верны, только если найдено
# ровно 10 компонентов И порядок совпал с раскладкой листа; иначе — общие
# obj-имена, реальные роли уточнить по contact-листу.
$guessNames10 = @(
  "scooter", "pigeon", "puddle", "suitcase", "tourist_group_luggage",
  "coin_spin_1", "coin_spin_2", "coin_spin_3", "coin_spin_4",
  "fountain_finish"
)
$obResults = @()
for ($i = 0; $i -lt $components.Count; $i++) {
  $c = $components[$i]
  $bbox = @{ minX = $c.minX; maxX = $c.maxX; minY = $c.minY; maxY = $c.maxY }
  $cropped = Crop-Argb $obKeyed.bytes $obKeyed.w $obKeyed.h $bbox 4
  $name = if ($components.Count -eq 10) { $guessNames10[$i] } else { "obj{0:D2}" -f ($i + 1) }
  $outPath = Join-Path (Join-Path $runnerOut "obstacles") "$name.png"
  Save-ArgbPng $cropped $outPath
  $bmpForSheet = [System.Drawing.Bitmap]::FromFile($outPath)
  $obResults += @{ label = "$name (area=$($c.area))"; bmp = $bmpForSheet }
}
New-ContactSheet $obResults (Join-Path $reportDir "contact_runner_obstacles.png") 4 220
$report += "runner/obstacles: найдено $($components.Count) связных объектов (ожидалось 10) — сверь contact_runner_obstacles.png с её списком (скутер/голубь/лужа/чемодан/группа туристов+багаж/4 кадра монеты/фонтан)"

# ===================== hero_run (16 кадров, роли пока предположительные) =====================
Write-Output "`n--- hero_run ---"
$heroRunNames = @(
  "run_1", "run_2", "run_3", "run_4",
  "jump_up", "run_5", "run_6", "run_7",
  "walk_alt_1", "walk_alt_2", "walk_alt_3", "walk_alt_4",
  "stumble", "back_view_1", "back_view_2", "back_view_3"
)
$heroRunResults = Split-Grid (Join-Path $rawDir "hero_run.jfif") 4 4 $heroRunNames (Join-Path $outDir "runner") 6 4
New-ContactSheet $heroRunResults (Join-Path $reportDir "contact_hero_run.png") 4 200
$report += "hero_run: 16 кадров нарезаны и подписаны ПРЕДПОЛОЖИТЕЛЬНО по позе (run_*, jump_up, stumble, walk_alt_* — вероятно неиспользуемый второй цикл, back_view_* — вид со спины, для бокового раннера не нужен) — финальная сборка листа под движок ещё не сделана, жду подтверждения по contact_hero_run.png"

# ===================== MANIFEST + ОТЧЁТ =====================
$manifest = @{
  catch = @{ bg = "catch/bg.png"; items = $itemNames | Where-Object { $_ } ; playerFallback = $true }
  ball = @{ bg = "ball/bg.png"; sprites = $ballNames }
  runner = @{ layers = @("far", "mid", "ground"); obstaclesCount = $components.Count; heroRunFrames = $heroRunNames }
}
$manifestJson = $manifest | ConvertTo-Json -Depth 6
Set-Content -Path (Join-Path $outDir "manifest.json") -Value $manifestJson -Encoding UTF8

Write-Output "`n=== Отчёт по расхождениям ==="
$report | ForEach-Object { Write-Output " - $_" }
Set-Content -Path (Join-Path $reportDir "report.txt") -Value ($report -join "`n") -Encoding UTF8
Write-Output "`nКонтрольные листы и превью тайлинга — в tools/_asset_report/ (не коммитить, только для проверки)."
Write-Output "Готово."

