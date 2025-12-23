$baseDir = ".\images"
if (!(Test-Path -Path $baseDir)) {
    New-Item -ItemType Directory -Force -Path $baseDir
}

$animals = @(
    @{id=1; enName="african elephant"},
    @{id=2; enName="lion"},
    @{id=3; enName="siberian tiger"},
    @{id=4; enName="hippopotamus"},
    @{id=5; enName="rhinoceros"},
    @{id=6; enName="polar bear"},
    @{id=7; enName="grizzly bear"},
    @{id=8; enName="nile crocodile"},
    @{id=9; enName="honey badger"},
    @{id=10; enName="cheetah"},
    @{id=11; enName="grey wolf"},
    @{id=12; enName="silverback gorilla"},
    @{id=13; enName="spotted hyena"},
    @{id=14; enName="leopard"},
    @{id=15; enName="golden eagle"},
    @{id=16; enName="king cobra"},
    @{id=17; enName="giraffe"},
    @{id=18; enName="kangaroo"},
    @{id=19; enName="capybara"},
    @{id=20; enName="wild boar"},
    @{id=21; enName="komodo dragon"},
    @{id=22; enName="jaguar animal"}
)

foreach ($animal in $animals) {
    $cleanName = $animal.enName -replace "\s+", "_"
    $filename = Join-Path $baseDir "$cleanName.jpg"
    $url = "https://loremflickr.com/500/500/wildlife," + ($animal.enName -replace "\s+", ",") + "?lock=" + $animal.id
    
    Write-Host "Downloading $cleanName from $url..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filename -MaximumRedirection 5
        Write-Host "Saved: $filename"
    } catch {
        Write-Error "Failed to download $filename : $_"
    }
}
Write-Host "All downloads finished!"
