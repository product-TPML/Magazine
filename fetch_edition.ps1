param(
  [Parameter(Mandatory = $true)][ValidateSet('su','my')][string]$Pub,
  [Parameter(Mandatory = $true)][string]$Date
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = 'https://vartasetu-magazine.tpml.in'
$cdn  = 'https://d3fe7ja3iahxpd.cloudfront.net'
$flip = if ($Pub -eq 'su') { 'SU' } else { 'MY' }
$dp   = $Date.Replace('-', '')
$outDir    = Join-Path $root ("data\{0}-{1}" -f $flip, $Date)
$pageDir   = Join-Path $outDir 'pages'
$thumbDir  = Join-Path $outDir 'thumbs'
$artDir    = Join-Path $outDir 'articles'
$mediaDir  = Join-Path $outDir 'media'
New-Item -ItemType Directory -Force -Path $pageDir, $thumbDir, $artDir, $mediaDir | Out-Null

$cookie = $null
$cookieFile = Join-Path $root 'cookie_header.txt'
if (Test-Path $cookieFile) { $cookie = (Get-Content -Raw $cookieFile).Trim() }

function Clean-Zero([string]$dir) {
  Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -le 0 } |
    ForEach-Object { Remove-Item $_.FullName -Force }
}

function Download-Parallel {
  param([object[]]$Pairs, [int]$Max = 12, [string]$CookieHeader)
  $todo = @($Pairs | Where-Object { -not (Test-Path $_.Dest) })
  $missing = New-Object System.Collections.Generic.List[object]
  if ($todo.Count -eq 0) { return $missing.ToArray() }
  $cfg = Join-Path $env:TEMP ('urls-' + [guid]::NewGuid().ToString('N') + '.txt')
  $lines = New-Object System.Collections.Generic.List[string]
  if ($CookieHeader) { $lines.Add('header = "Cookie: ' + $CookieHeader + '"') }
  foreach ($t in $todo) {
    $lines.Add('url = "' + $t.Url + '"')
    $lines.Add('output = "' + ($t.Dest -replace '\\', '/') + '"')
  }
  Set-Content -LiteralPath $cfg -Value $lines -Encoding ASCII
  $eap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & curl.exe -s -f --retry 2 --retry-delay 1 --parallel --parallel-max $Max --config $cfg 2>$null
  $ErrorActionPreference = $eap
  $global:LASTEXITCODE = 0
  Remove-Item -LiteralPath $cfg -Force -ErrorAction SilentlyContinue
  foreach ($t in $todo) {
    $ok = (Test-Path $t.Dest) -and ((Get-Item $t.Dest).Length -gt 0)
    if (-not $ok) { if (Test-Path $t.Dest) { Remove-Item $t.Dest -Force }; $missing.Add($t) }
  }
  return $missing.ToArray()
}

function Get-Serial([string]$path, [string]$dest) {
  if (Test-Path $dest) { return }
  $cargs = @('-s', '-f', '-o', $dest)
  & curl.exe @cargs "$base$path"
  if ($LASTEXITCODE -eq 0 -and (Test-Path $dest)) { return }
  if (Test-Path $dest) { Remove-Item $dest -Force }
  & curl.exe @cargs ($cdn + ($path -replace '^/flip', ''))
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dest)) { throw "metadata failed: $path" }
}

function Get-IssueCookie {
  if ($script:issueCookie) { return $script:issueCookie }
  if (-not $cookie) { return $null }
  $tok = $null
  try {
    $r = (& curl.exe -s -H "Cookie: $cookie" "$base/api/flip/token?pub=$Pub&date=$Date") | ConvertFrom-Json
    if ($r -and $r.ok -and $r.token) { $tok = $r.token }
  } catch { }
  $parts = @(($cookie -split ';') | Where-Object { $_ -notmatch '^\s*flip_token=' })
  if ($tok) { $parts += "flip_token=$tok" }
  $script:issueCookie = ($parts -join '; ')
  return $script:issueCookie
}

Clean-Zero $pageDir
Clean-Zero $thumbDir
Clean-Zero $artDir
Clean-Zero $mediaDir

Get-Serial "/flip/$flip/issues.json" (Join-Path $outDir 'issues.json')
Get-Serial "/flip/$flip/$dp/flipbook/index.json" (Join-Path $outDir 'index.json')
foreach ($meta in @('bylines.json', 'langs.json')) {
  try { Get-Serial "/flip/$flip/$dp/flipbook/$meta" (Join-Path $outDir $meta) }
  catch { Write-Host ("  {0} not available for this issue" -f $meta) }
}

$manifest = Get-Content -Raw (Join-Path $outDir 'index.json') | ConvertFrom-Json
$pages = @($manifest.sections | ForEach-Object { $_.pages })
Write-Host ("pages in manifest: {0}" -f $pages.Count)

$hotspotIds = @($pages | ForEach-Object { $_.articles } | Where-Object { $_ } | ForEach-Object { [string]$_.id } | Sort-Object -Unique)
if ($hotspotIds.Count -eq 0) {
  Write-Host "no article hotspots in this issue - nothing fetched (policy)"
  Remove-Item -Recurse -Force $outDir -ErrorAction SilentlyContinue
  exit 0
}

# ---- page images (CDN parallel, site+cookie fallback) ----
$pairs = New-Object System.Collections.Generic.List[object]
foreach ($p in $pages) {
  $pairs.Add([pscustomobject]@{
    Url = "$cdn/$flip/$dp/flipbook/pages/$($p.id).png"
    SiteUrl = "$base/flip/$flip/$dp/flipbook/pages/$($p.id).png"
    Dest = (Join-Path $pageDir ("{0}.png" -f $p.id))
  })
}
$miss = @(Download-Parallel -Pairs $pairs.ToArray() -Max 12)
if ($miss.Count -gt 0) {
  Write-Host ("  retrying {0} via site host" -f $miss.Count)
  $sitePairs = @($miss | ForEach-Object { [pscustomobject]@{ Url = $_.SiteUrl; Dest = $_.Dest } })
  $miss2 = @(Download-Parallel -Pairs $sitePairs -Max 4 -CookieHeader (Get-IssueCookie))
  if ($miss2.Count -gt 0) { throw ("page download failed: {0}" -f $miss2.Count) }
}
$pageCount = @(Get-ChildItem -LiteralPath $pageDir -File).Count
Write-Host ("pages downloaded: {0}/{1}" -f $pageCount, $pages.Count)

# ---- thumbnails (reader all-pages view) + cover ----
$tPairs = New-Object System.Collections.Generic.List[object]
foreach ($p in $pages) {
  $tPairs.Add([pscustomobject]@{
    Url = "$cdn/$flip/$dp/flipbook/thumbs/$($p.id).png"
    SiteUrl = "$base/flip/$flip/$dp/flipbook/thumbs/$($p.id).png"
    Dest = (Join-Path $thumbDir ("{0}.png" -f $p.id))
  })
}
$tMiss = @(Download-Parallel -Pairs $tPairs.ToArray() -Max 12)
if ($tMiss.Count -gt 0) {
  $sitePairs = @($tMiss | ForEach-Object { [pscustomobject]@{ Url = $_.SiteUrl; Dest = $_.Dest } })
  $tMiss2 = @(Download-Parallel -Pairs $sitePairs -Max 4 -CookieHeader (Get-IssueCookie))
}
$thumbCount = @(Get-ChildItem -LiteralPath $thumbDir -File).Count
Write-Host ("thumbs downloaded: {0}/{1}" -f $thumbCount, $pages.Count)
$coverDest = Join-Path $outDir 'cover.jpg'
$null = Download-Parallel -Pairs @([pscustomobject]@{ Url = "$cdn/$flip/$dp/flipbook/cover.jpg"; Dest = $coverDest }) -Max 1

# ---- coordinates + article ids ----
$coords = New-Object System.Collections.Generic.List[object]
$artIds = New-Object System.Collections.Generic.HashSet[string]
foreach ($p in $pages) {
  $arts = @()
  foreach ($a in @($p.articles)) {
    if ($null -eq $a) { continue }
    $arts += [pscustomobject]@{ id = $a.id; top = $a.top; left = $a.left; width = $a.width; height = $a.height; htmlFile = $a.htmlFile; contentElementId = $a.contentElementId }
    [void]$artIds.Add([string]$a.id)
  }
  $ads = @()
  foreach ($a in @($p.ads)) {
    if ($null -eq $a) { continue }
    $ads += [pscustomobject]@{ id = $a.id; top = $a.top; left = $a.left; width = $a.width; height = $a.height; imgFile = $a.imgFile }
  }
  $coords.Add([pscustomobject]@{
    id = $p.id; name = $p.name; width = $p.width; height = $p.height
    imgFile = $p.imgFile; imgThumbFile = $p.imgThumbFile; pdfFile = $p.pdfFile; articles = $arts; ads = $ads
  })
}

# ---- article HTML (base + en + hi, CDN parallel; base fallback via site) ----
$apairs = New-Object System.Collections.Generic.List[object]
foreach ($id in $artIds) {
  $apairs.Add([pscustomobject]@{
    Url = "$cdn/$flip/$dp/flipbook/articles/$id.html"
    SiteUrl = "$base/flip/$flip/$dp/flipbook/articles/$id.html"
    Dest = (Join-Path $artDir "$id.html"); Kind = 'base'
  })
  foreach ($lang in @('en', 'hi')) {
    $apairs.Add([pscustomobject]@{
      Url = "$cdn/$flip/$dp/flipbook/articles/$id.$lang.html"
      SiteUrl = $null
      Dest = (Join-Path $artDir "$id.$lang.html"); Kind = 'variant'
    })
  }
}
$amiss = @(Download-Parallel -Pairs $apairs.ToArray() -Max 12)
$baseMiss = @($amiss | Where-Object { $_.Kind -eq 'base' })
if ($baseMiss.Count -gt 0) {
  $sitePairs = @($baseMiss | ForEach-Object { [pscustomobject]@{ Url = $_.SiteUrl; Dest = $_.Dest } })
  $miss3 = @(Download-Parallel -Pairs $sitePairs -Max 4 -CookieHeader (Get-IssueCookie))
  if ($miss3.Count -gt 0) { throw ("article download failed: {0}" -f $miss3.Count) }
}
$baseSaved = @(Get-ChildItem -LiteralPath $artDir -Filter '*.html' | Where-Object { $_.Name -notmatch '\.(en|hi)\.html$' }).Count
$varSaved = @(Get-ChildItem -LiteralPath $artDir -Filter '*.html' | Where-Object { $_.Name -match '\.(en|hi)\.html$' }).Count
Write-Host ("articles: base={0}/{1} variants={2}" -f $baseSaved, $artIds.Count, $varSaved)

# ---- article body photos (referenced from article HTML, served as pages/{file}) ----
$photoNames = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in Get-ChildItem -LiteralPath $artDir -Filter '*.html') {
  $t = Get-Content -Raw $f.FullName
  foreach ($m in [regex]::Matches($t, 'photos/([^"\s>]+\.(?:jpg|jpeg|png|webp))', 'IgnoreCase')) { [void]$photoNames.Add($m.Groups[1].Value) }
}
$phPairs = New-Object System.Collections.Generic.List[object]
foreach ($fn in $photoNames) {
  $phPairs.Add([pscustomobject]@{
    Url = "$cdn/$flip/$dp/flipbook/pages/$fn"
    Dest = (Join-Path $mediaDir $fn)
  })
}
$phMiss = @(Download-Parallel -Pairs $phPairs.ToArray() -Max 12)
$photoCount = @(Get-ChildItem -LiteralPath $mediaDir -File).Count
Write-Host ("article photos: {0}/{1}" -f $photoCount, $photoNames.Count)

$coordsDoc = [pscustomobject]@{
  pub = $Pub; date = $Date; edition = $manifest.edition; product = $manifest.product; pubDate = $manifest.pubDate
  fullPdfFile = $manifest.fullPdfFile; tiles = $manifest.tiles
  pageCount = $pages.Count; articleCount = $artIds.Count; coverImage = 'cover.jpg'; pages = $coords
}
$coordsDoc | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outDir 'coords.json') -Encoding UTF8

# ---- assemble PDF from page images ----
$first = $pages[0]
$html = New-Object System.Text.StringBuilder
[void]$html.AppendLine('<!doctype html><html><head><meta charset="utf-8"><style>')
[void]$html.AppendLine(("@page {{ size: {0}px {1}px; margin: 0; }}" -f $first.width, $first.height))
[void]$html.AppendLine('html,body{margin:0;padding:0;} img{display:block;page-break-after:always;}')
[void]$html.AppendLine('</style></head><body>')
foreach ($p in $pages) {
  [void]$html.AppendLine(('<img src="pages/{0}.png" width="{1}" height="{2}">' -f $p.id, $p.width, $p.height))
}
[void]$html.AppendLine('</body></html>')
$htmlPath = Join-Path $outDir 'edition.html'
Set-Content -LiteralPath $htmlPath -Value $html.ToString() -Encoding UTF8

$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }
$pdfPath = Join-Path $outDir 'edition.pdf'
$prof = Join-Path $env:TEMP ('chrome-pdf-' + [guid]::NewGuid().ToString('N'))
$fileUrl = 'file:///' + ($htmlPath -replace '\\', '/')
$eap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check --no-pdf-header-footer "--user-data-dir=$prof" "--print-to-pdf=$pdfPath" "$fileUrl" 2>$null | Out-Null
$ErrorActionPreference = $eap
if (Test-Path $prof) { Remove-Item -Recurse -Force $prof -ErrorAction SilentlyContinue }

$sizeMB = [math]::Round((Get-ChildItem $outDir -Recurse -File | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host ("done: pages={0} thumbs={1} articles={2} variants={3} photos={4} pdf={5} totalMB={6}" -f $pageCount, $thumbCount, $baseSaved, $varSaved, $photoCount, (Test-Path $pdfPath), $sizeMB)
