$baseDir = ".\images"
$newAnimals = @(
    @{id = 23; enName = "black mamba"; keywords = "black,mamba,snake" },
    @{id = 24; enName = "moose"; keywords = "moose,wildlife" },
    @{id = 25; enName = "green anaconda"; keywords = "anaconda,snake" },
    @{id = 26; enName = "cougar"; keywords = "cougar,mountain,lion" },
    @{id = 27; enName = "wolverine"; keywords = "wolverine,animal" },
    @{id = 28; enName = "cassowary"; keywords = "cassowary,bird" },
    @{id = 29; enName = "american bison"; keywords = "bison,buffalo" },
    @{id = 30; enName = "ostrich"; keywords = "ostrich,bird" }
)

foreach ($item in $newAnimals) {
    $cleanName = $item.enName -replace "\s+", "_"
    $filename = Join-Path $baseDir "$cleanName.jpg"
    $url = "https://loremflickr.com/500/500/wildlife," + $item.keywords + "?lock=" + $item.id
    
    Write-Host "Downloading $($item.enName)..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filename -MaximumRedirection 5
        Write-Host "Saved: $filename"
    }
    catch {
        Write-Error "Failed to download $filename : $_"
    }
}
Write-Host "New animals added!"
