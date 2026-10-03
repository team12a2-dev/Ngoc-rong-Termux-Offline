# ========================================================================
# TOOL BUILD SERVER NGOC RONG ONLINE (1-CLICK)
# Tu dong quet source Java, bien dich va dong goi file dist/NgocRongOnline.jar
# ========================================================================

$ErrorActionPreference = "Stop"

# Dam bao encoding an toan
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$StartTime = [System.Diagnostics.Stopwatch]::StartNew()
$RootDir = $PSScriptRoot

# Kiem tra Java JDK trong .runtime neu co
$portableJdk = Join-Path $RootDir ".runtime\jdk"
if (Test-Path $portableJdk) {
    $foundJavac = Get-ChildItem -Path $portableJdk -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundJavac) {
        $binFolder = $foundJavac.DirectoryName
        $env:JAVA_HOME = (Split-Path -Parent $binFolder)
        $env:PATH = "$binFolder;$env:PATH"
    }
}

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "         BIEN DICH & DONG GOI NRO GAME SERVER JAR (1-CLICK)" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiem tra javac va jar
$javacCmd = Get-Command "javac.exe" -ErrorAction SilentlyContinue
$jarCmd = Get-Command "jar.exe" -ErrorAction SilentlyContinue

if (!$javacCmd -or !$jarCmd) {
    Write-Host "  [LOI] Khong tim thay trinh bien dich javac/jar (Java JDK)!" -ForegroundColor Red
    Write-Host "  Dang goi bo cai dat tu dong SETUP_SERVER_1CLICK..." -ForegroundColor Yellow
    & "$RootDir\SETUP_SERVER_1CLICK.bat"
    
    # Reload path
    if (Test-Path $portableJdk) {
        $foundJavac = Get-ChildItem -Path $portableJdk -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundJavac) {
            $binFolder = $foundJavac.DirectoryName
            $env:PATH = "$binFolder;$env:PATH"
        }
    }
    $javacCmd = Get-Command "javac.exe" -ErrorAction SilentlyContinue
    if (!$javacCmd) {
        Write-Host "  [X] Khong the tim thay Java JDK de bien dich." -ForegroundColor Red
        exit 1
    }
}

# 2. Quet source files
Write-Host "  [*] Dang quet danh sach source code Java..." -ForegroundColor Cyan
$sources = Get-ChildItem -Path "$RootDir\src" -Filter *.java -Recurse | Select-Object -ExpandProperty FullName
Write-Host "  [OK] Tim thay $($sources.Count) file ma nguon Java (.java)" -ForegroundColor Green

$sourcesListPath = Join-Path $RootDir "build\sources.txt"
if (!(Test-Path "$RootDir\build")) { New-Item -ItemType Directory -Path "$RootDir\build" -Force | Out-Null }
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($sourcesListPath, $sources, $utf8NoBom)

# 3. Quet libraries
$jars = Get-ChildItem -Path "$RootDir\lib" -Filter *.jar | Select-Object -ExpandProperty FullName
$cp = $jars -join ";"

$classesDir = Join-Path $RootDir "build\classes"
if (!(Test-Path $classesDir)) {
    New-Item -ItemType Directory -Path $classesDir -Force | Out-Null
}

# 4. Tien hanh bien dich
Write-Host "  [*] Dang bien dich bang javac (Target Java 17, UTF-8)..." -ForegroundColor Yellow
$proc = Start-Process -FilePath "javac" -ArgumentList "-encoding", "UTF-8", "--release", "17", "-proc:none", "-cp", "`"$cp`"", "-d", "`"$classesDir`"", "`"@$sourcesListPath`"" -NoNewWindow -PassThru -Wait

Remove-Item $sourcesListPath -ErrorAction SilentlyContinue

if ($proc.ExitCode -ne 0) {
    Write-Host ""
    Write-Host "  [X] BIEN DICH THAT BAI! Ma loi: $($proc.ExitCode)" -ForegroundColor Red
    Write-Host "  Vui long kiem tra lai cac file ma nguon bi loi o tren." -ForegroundColor Yellow
    exit 1
}

Write-Host "  [OK] Bien dich source code THANH CONG!" -ForegroundColor Green

# 5. Dong goi file JAR
$distDir = Join-Path $RootDir "dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$jarPath = Join-Path $distDir "NgocRongOnline.jar"
$manifestPath = Join-Path $RootDir "manifest.mf"

# Kiem tra neu file JAR dang bi server cu khoa thi tu dong tat tien trinh cu
if (Test-Path $jarPath) {
    $isLocked = $false
    try {
        $stream = [System.IO.File]::Open($jarPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        $stream.Close()
        $stream.Dispose()
    } catch {
        $isLocked = $true
    }

    if ($isLocked) {
        Write-Host "  [!] Phat hien Game Server cu dang chay va khoa file JAR!" -ForegroundColor Yellow
        Write-Host "  [*] Dang tu dong dong tien trinh server cu de ghi de file JAR moi..." -ForegroundColor Cyan
        
        # 1. Tat theo cong port 14445 neu co
        try {
            $netstat = Get-NetTCPConnection -LocalPort 14445 -ErrorAction SilentlyContinue
            if ($netstat) {
                foreach ($conn in $netstat) {
                    if ($conn.OwningProcess -gt 0) {
                        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        } catch {}

        # 2. Tat theo WMI/CIM process java chay NgocRongOnline.jar
        try {
            $javaProcs = Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" -ErrorAction SilentlyContinue
            foreach ($p in $javaProcs) {
                if ($p.CommandLine -match 'NgocRongOnline.jar') {
                    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                }
            }
        } catch {}

        Start-Sleep -Seconds 1
    }
}

Write-Host "  [*] Dang dong goi dist\NgocRongOnline.jar..." -ForegroundColor Yellow
$jarProc = Start-Process -FilePath "jar" -ArgumentList "cfm", "`"$jarPath`"", "`"$manifestPath`"", "-C", "`"$classesDir`"", "." -NoNewWindow -PassThru -Wait

if ($jarProc.ExitCode -ne 0) {
    Write-Host "  [X] Dong goi file JAR that bai voi ma loi $($jarProc.ExitCode)" -ForegroundColor Red
    Write-Host "  (Neu loi 'used by another process', hay dong cua so Game Server dang chay roi thu lai)" -ForegroundColor Yellow
    exit 1
}

$StartTime.Stop()
$elapsedSec = [math]::Round($StartTime.Elapsed.TotalSeconds, 2)
$jarSizeMb = [math]::Round((Get-Item $jarPath).Length / 1MB, 2)

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  *** CHUC MUNG: BIEN DICH VA DONG GOI SERVER HOAN TAT 100%! ***" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  - File JAR:    $jarPath ($jarSizeMb MB)" -ForegroundColor White
Write-Host "  - Thoi gian:   $elapsedSec giay" -ForegroundColor White
Write-Host "  - Trang thai:  San sang khoi chay ngay lap tuc!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
