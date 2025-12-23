$baseDir = ".\images"

# 문제가 된 동물들만 재다운로드 (키워드 변경 및 Lock ID 변경)
$fixes = @(
    @{name = "king_cobra"; keywords = "king,cobra,snake"; lock = 55 },
    @{name = "golden_eagle"; keywords = "golden,eagle,flying,bird"; lock = 99 },
    @{name = "lion"; keywords = "male,lion,mane"; lock = 77 },
    @{name = "leopard"; keywords = "leopard,panthera"; lock = 88 },
    @{name = "polar_bear"; keywords = "polar,bear,ice"; lock = 44 },
    @{name = "rhinoceros"; keywords = "rhino,wildlife"; lock = 33 }
)

foreach ($item in $fixes) {
    $filename = Join-Path $baseDir "$($item.name).jpg"
    $url = "https://loremflickr.com/500/500/wildlife," + $item.keywords + "?lock=" + $item.lock
    
    Write-Host "Fixing $($item.name) from $url..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filename -MaximumRedirection 5
        Write-Host "Updated: $filename"
    }
    catch {
        Write-Error "Failed to update $filename : $_"
    }
}
Write-Host "Fixes applied!"
