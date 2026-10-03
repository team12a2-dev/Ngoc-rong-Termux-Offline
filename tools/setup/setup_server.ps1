# ========================================================================
# TOOL SETUP SERVER NGOC RONG ONLINE -- 1-CLICK ALL-IN-ONE
# Tu dong kiem tra thiet bi, tai va cai dat toan bo cong cu can thiet
# ========================================================================

param(
    [switch]$CheckOnly,
    [switch]$AutoStart,
    [switch]$ForceImportDb,
    [switch]$UseWinget
)

$ErrorActionPreference = "Continue"

# Kich hoat TLS 1.2 / TLS 1.1 / TLS 1.0 (va TLS 1.3 neu ho tro) de tranh loi SSL/TLS handshake tren moi phien ban PowerShell
try {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]3072 -bor [System.Net.SecurityProtocolType]768 -bor [System.Net.SecurityProtocolType]192
    if ([System.Enum]::IsDefined([System.Net.SecurityProtocolType], "Tls13")) {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]12288
    }
} catch {
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]'Tls12,Tls11,Tls'
    } catch {}
}

# Dam bao encoding UTF-8 an toan tren Windows Console
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

$RuntimeDir = Join-Path $RootDir ".runtime"
if (!(Test-Path $RuntimeDir)) { New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null }

# Helper an toan cho console output tranh loi Win32 0x1F tren Windows Server/RDP/ConHost
function Safe-WriteHost {
    param(
        [string]$Message = "",
        [System.ConsoleColor]$ForegroundColor = [System.ConsoleColor]::White,
        [switch]$NoNewline
    )
    try {
        if ($NoNewline) {
            Write-Host $Message -ForegroundColor $ForegroundColor -NoNewline
        } else {
            Write-Host $Message -ForegroundColor $ForegroundColor
        }
    } catch {
        try {
            if ($NoNewline) {
                [Console]::Write($Message)
            } else {
                [Console]::WriteLine($Message)
            }
        } catch {}
    }
}

function Write-BoxHeader {
    param([string]$Title)
    Safe-WriteHost ""
    Safe-WriteHost "========================================================================" -ForegroundColor Cyan
    Safe-WriteHost "  $Title" -ForegroundColor Yellow
    Safe-WriteHost "========================================================================" -ForegroundColor Cyan
    Safe-WriteHost ""
}

function Write-ItemOk {
    param([string]$Name, [string]$Detail)
    Safe-WriteHost "  [OK] " -ForegroundColor Green -NoNewline
    Safe-WriteHost "$Name " -ForegroundColor White -NoNewline
    Safe-WriteHost "($Detail)" -ForegroundColor Gray
}

function Write-ItemWarn {
    param([string]$Name, [string]$Detail)
    Safe-WriteHost "  [!] " -ForegroundColor Yellow -NoNewline
    Safe-WriteHost "$Name " -ForegroundColor White -NoNewline
    Safe-WriteHost "($Detail)" -ForegroundColor Yellow
}

function Write-ItemFail {
    param([string]$Name, [string]$Detail)
    Safe-WriteHost "  [X] " -ForegroundColor Red -NoNewline
    Safe-WriteHost "$Name " -ForegroundColor White -NoNewline
    Safe-WriteHost "($Detail)" -ForegroundColor Red
}

function Write-Step {
    param([string]$StepText)
    Safe-WriteHost "`n>>> $StepText" -ForegroundColor Cyan
}

# --- Helper: Giai nen file zip tuong thich tat ca phien ban PowerShell (Windows 7 / 8 / 10 / Server) ---
function Extract-ZipArchive {
    param(
        [Parameter(Mandatory=$true)][string]$ZipPath,
        [Parameter(Mandatory=$true)][string]$DestinationPath
    )
    if (!(Test-Path $DestinationPath)) {
        New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    }

    $resolvedZip = (Resolve-Path $ZipPath).Path
    $resolvedDest = (Resolve-Path $DestinationPath).Path

    # 1. Thu dung .NET System.IO.Compression.FileSystem (Co san tren tat ca .NET 4.5+ / Win 7 SP1 tro len)
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
        $archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedZip)
        foreach ($entry in $archive.Entries) {
            $targetPath = [System.IO.Path]::Combine($resolvedDest, $entry.FullName)
            $targetDir = [System.IO.Path]::GetDirectoryName($targetPath)
            if (!(Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            if (-not [string]::IsNullOrEmpty($entry.Name)) {
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetPath, $true)
            }
        }
        $archive.Dispose()
        return $true
    } catch {}

    # 2. Thu dung Expand-Archive neu cmdlet ton tai (PowerShell 5+)
    if (Get-Command "Expand-Archive" -ErrorAction SilentlyContinue) {
        try {
            Expand-Archive -Path $resolvedZip -DestinationPath $resolvedDest -Force -ErrorAction Stop
            return $true
        } catch {}
    }

    # 3. Thu dung tar.exe (Windows 10 / 11)
    $tarCmd = Get-Command "tar.exe" -ErrorAction SilentlyContinue
    if ($tarCmd) {
        try {
            & tar.exe -xf "$resolvedZip" -C "$resolvedDest"
            if ($LASTEXITCODE -eq 0) { return $true }
        } catch {}
    }

    # 4. Thu dung 7-Zip neu co
    $7zList = @(
        "$env:ProgramFiles\7-Zip\7z.exe",
        "${env:ProgramFiles(x86)}\7-Zip\7z.exe"
    )
    foreach ($p in $7zList) {
        if (Test-Path $p) {
            try {
                & $p x "$resolvedZip" "-o$resolvedDest" -y | Out-Null
                if ($LASTEXITCODE -eq 0) { return $true }
            } catch {}
        }
    }

    # 5. Fallback COM Shell.Application (Hoat dong tren tat ca Windows: Win 7 / 8 / 10 / Server)
    try {
        $shell = New-Object -ComObject Shell.Application
        $zipFolder = $shell.NameSpace($resolvedZip)
        $destFolder = $shell.NameSpace($resolvedDest)
        if ($zipFolder -and $destFolder) {
            # 16 = Respond "Yes to All", 4 = Do not show UI progress dialog
            $destFolder.CopyHere($zipFolder.Items(), 20)
            return $true
        }
    } catch {}

    return $false
}

# --- Helper: Download file voi da phuong thuc va kiem tra ket noi an toan ---
function Download-FileWithProgress {
    param([string]$Url, [string]$Destination)
    Safe-WriteHost "  Dang tai: $Url" -ForegroundColor Gray
    Safe-WriteHost "  Luu tai: $Destination" -ForegroundColor Gray
    
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]3072 -bor [System.Net.SecurityProtocolType]768 -bor [System.Net.SecurityProtocolType]192
    } catch {}

    if (Test-Path $Destination) {
        Remove-Item $Destination -Force -ErrorAction SilentlyContinue
    }

    # 1. Dung curl neu co san
    $curlCmd = Get-Command "curl.exe" -ErrorAction SilentlyContinue
    if ($curlCmd) {
        & curl.exe -fL --retry 3 --connect-timeout 20 -o $Destination $Url
        if ($LASTEXITCODE -eq 0 -and (Test-Path $Destination) -and ((Get-Item $Destination).Length -gt 1024)) {
            return $true
        }
    }
    
    # 2. Dung .NET WebClient
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        $wc.DownloadFile($Url, $Destination)
        if ((Test-Path $Destination) -and ((Get-Item $Destination).Length -gt 1024)) {
            return $true
        }
    } catch {
        Safe-WriteHost "  [WebClient] $($_.Exception.Message)" -ForegroundColor DarkGray
    }

    # 3. Dung certutil.exe (co san tren moi may Windows tu Windows 7 den Windows 11)
    $certutilCmd = Get-Command "certutil.exe" -ErrorAction SilentlyContinue
    if ($certutilCmd) {
        try {
            & certutil.exe -urlcache -split -f $Url $Destination | Out-Null
            if ((Test-Path $Destination) -and ((Get-Item $Destination).Length -gt 1024)) {
                return $true
            }
        } catch {}
    }

    # 4. Dung Invoke-WebRequest (PowerShell 3+)
    try {
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -UserAgent "Mozilla/5.0" -TimeoutSec 60 -ErrorAction Stop
        if ((Test-Path $Destination) -and ((Get-Item $Destination).Length -gt 1024)) {
            return $true
        }
    } catch {}

    return $false
}

# --- 1. KIEM TRA / TAO CONFIG.PROPERTIES ---
function Check-ConfigProperties {
    Write-Step "1/7: Kiem tra file cau hinh Config.properties..."
    $configPath = Join-Path $RootDir "Config.properties"
    $examplePath = Join-Path $RootDir "Config.properties.example"
    
    if (!(Test-Path $configPath)) {
        if (Test-Path $examplePath) {
            Copy-Item $examplePath $configPath
            Write-ItemWarn "Config.properties" "Chua co, da tu dong tao tu Config.properties.example"
        } else {
            Write-ItemFail "Config.properties" "Thieu ca Config.properties va file mau example!"
            return $false
        }
    } else {
        Write-ItemOk "Config.properties" "Da ton tai file cau hinh"
    }
    return $true
}

# --- 2. KIEM TRA & TU DONG CAI JAVA JDK (17+) ---
function Get-JavaMajorVersion {
    param([string]$Cmd)
    try {
        $proc = Start-Process -FilePath $Cmd -ArgumentList "-version" -NoNewWindow -PassThru -RedirectStandardError "$RuntimeDir\java_ver.tmp"
        $proc.WaitForExit(5000) | Out-Null
        $raw = Get-Content "$RuntimeDir\java_ver.tmp" -Raw -ErrorAction SilentlyContinue
        Remove-Item "$RuntimeDir\java_ver.tmp" -ErrorAction SilentlyContinue
        if ($raw -match 'version "([0-9]+)') {
            return [int]$matches[1]
        }
    } catch {}
    return 0
}

function Setup-Java {
    Write-Step "2/7: Kiem tra Java JDK (yeu cau Java 17+)..."
    
    # Kiem tra Java portable trong .runtime\jdk
    $localJdk = Join-Path $RuntimeDir "jdk"
    if (Test-Path $localJdk) {
        $foundJavac = Get-ChildItem -Path $localJdk -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundJavac) {
            $binFolder = $foundJavac.DirectoryName
            $env:JAVA_HOME = (Split-Path -Parent $binFolder)
            $env:PATH = "$binFolder;$env:PATH"
        }
    }

    $javaCmd = Get-Command "java.exe" -ErrorAction SilentlyContinue
    $javacCmd = Get-Command "javac.exe" -ErrorAction SilentlyContinue
    
    $ver = 0
    if ($javaCmd) { $ver = Get-JavaMajorVersion "java" }
    
    if ($javaCmd -and $javacCmd -and $ver -ge 17) {
        Write-ItemOk "Java JDK" "Da co san OpenJDK $ver ($($javaCmd.Source))"
        return $true
    }

    if ($CheckOnly) {
        Write-ItemFail "Java JDK" "Thieu Java JDK 17+ (phien ban hien tai: $ver)"
        return $false
    }

    Safe-WriteHost "  [!] Chua co Java JDK 17+ tren thiet bi! Dang tien hanh cai dat..." -ForegroundColor Yellow
    
    # Thu cai qua winget neu co
    $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
    if ($winget -and $UseWinget) {
        Safe-WriteHost "  Dang cai dat Eclipse Temurin JDK 21 qua Winget..." -ForegroundColor Cyan
        & winget.exe install EclipseAdoptium.Temurin.21.JDK --silent --accept-package-agreements --accept-source-agreements
        $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
        $env:PATH = "$userPath;$machinePath;$env:PATH"
        
        $ver = Get-JavaMajorVersion "java"
        if ($ver -ge 17) {
            Write-ItemOk "Java JDK" "Cai dat JDK $ver qua Winget thanh cong!"
            return $true
        }
    }

    # Cai dat Portable OpenJDK 21 LTS voi cac nguon du phong
    Safe-WriteHost "  Tai goi Portable OpenJDK 21 LTS (chay doc lap, khong can Admin)..." -ForegroundColor Cyan
    $jdkZip = Join-Path $RuntimeDir "openjdk21.zip"
    
    # Danh sach link tai JDK 21 (Corretto toc do cuc nhanh va on dinh nhat tren Windows)
    $jdkUrls = @(
        "https://corretto.aws/downloads/latest/amazon-corretto-21-x64-windows-jdk.zip",
        "https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip",
        "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse"
    )

    $downloadSuccess = $false
    foreach ($url in $jdkUrls) {
        $downloadSuccess = Download-FileWithProgress -Url $url -Destination $jdkZip
        if ($downloadSuccess -and (Test-Path $jdkZip) -and ((Get-Item $jdkZip).Length -gt 10000000)) {
            break
        }
    }

    if (!$downloadSuccess -or !(Test-Path $jdkZip)) {
        Write-ItemFail "Java JDK" "Tai OpenJDK that bai. Vui long kiem tra ket noi mang hoac tai thu cong."
        return $false
    }

    Safe-WriteHost "  Dang giai nen OpenJDK 21..." -ForegroundColor Cyan
    $extractSuccess = Extract-ZipArchive -ZipPath $jdkZip -DestinationPath $RuntimeDir
    Remove-Item $jdkZip -ErrorAction SilentlyContinue

    if (!$extractSuccess) {
        Write-ItemFail "Java JDK" "Giai nen OpenJDK that bai."
        return $false
    }
    
    # Tim thu muc JDK vua giai nen
    $foundJavacExtracted = Get-ChildItem -Path $RuntimeDir -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundJavacExtracted) {
        $extractedRoot = (Split-Path -Parent $foundJavacExtracted.DirectoryName)
        if ($extractedRoot -ne $localJdk) {
            if (Test-Path $localJdk) { Remove-Item -Path $localJdk -Recurse -Force -ErrorAction SilentlyContinue }
            Rename-Item -Path $extractedRoot -NewName "jdk" -ErrorAction SilentlyContinue
        }
    }

    $foundJavac = Get-ChildItem -Path $localJdk -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundJavac) {
        $binFolder = $foundJavac.DirectoryName
        $env:JAVA_HOME = (Split-Path -Parent $binFolder)
        $env:PATH = "$binFolder;$env:PATH"
        [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $env:JAVA_HOME, "User")
        Write-ItemOk "Java JDK" "Cai dat Portable OpenJDK 21 hoan tat va da kich hoat!"
        return $true
    }

    Write-ItemFail "Java JDK" "Khong tim thay javac trong thu muc giai nen JDK."
    return $false
}

# --- 3. KIEM TRA & TU DONG CAI NODE.JS & NPM ---
function Setup-NodeJs {
    Write-Step "3/7: Kiem tra Node.js va npm (phuc vu Web Control Panel)..."
    
    # Kiem tra portable node trong .runtime\nodejs
    $localNode = Join-Path $RuntimeDir "nodejs"
    if (Test-Path $localNode) {
        $foundNode = Get-ChildItem -Path $localNode -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundNode) {
            $env:PATH = "$($foundNode.DirectoryName);$env:PATH"
        }
    }

    $nodeCmd = Get-Command "node.exe" -ErrorAction SilentlyContinue
    $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    
    if ($nodeCmd) {
        $ver = & node -v
        Write-ItemOk "Node.js" "Da co san $ver ($($nodeCmd.Source))"
        return $true
    }

    if ($CheckOnly) {
        Write-ItemFail "Node.js" "Thieu Node.js tren thiet bi!"
        return $false
    }

    Safe-WriteHost "  [!] Chua co Node.js! Dang tu dong tai va cai dat ban Portable..." -ForegroundColor Yellow
    $nodeZip = Join-Path $RuntimeDir "node.zip"
    
    $nodeUrls = @(
        "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip",
        "https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-win-x64.zip"
    )
    
    $downloadSuccess = $false
    foreach ($url in $nodeUrls) {
        $downloadSuccess = Download-FileWithProgress -Url $url -Destination $nodeZip
        if ($downloadSuccess -and (Test-Path $nodeZip) -and ((Get-Item $nodeZip).Length -gt 5000000)) {
            break
        }
    }

    if (!$downloadSuccess -or !(Test-Path $nodeZip)) {
        Write-ItemFail "Node.js" "Tai Node.js that bai. Vui long kiem tra ket noi mang."
        return $false
    }

    Safe-WriteHost "  Dang giai nen Node.js..." -ForegroundColor Cyan
    $extractSuccess = Extract-ZipArchive -ZipPath $nodeZip -DestinationPath $RuntimeDir
    Remove-Item $nodeZip -ErrorAction SilentlyContinue

    if (!$extractSuccess) {
        Write-ItemFail "Node.js" "Giai nen Node.js that bai."
        return $false
    }

    $foundNodeExtracted = Get-ChildItem -Path $RuntimeDir -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundNodeExtracted) {
        $extractedRoot = $foundNodeExtracted.DirectoryName
        if ($extractedRoot -ne $localNode) {
            if (Test-Path $localNode) { Remove-Item -Path $localNode -Recurse -Force -ErrorAction SilentlyContinue }
            Rename-Item -Path $extractedRoot -NewName "nodejs" -ErrorAction SilentlyContinue
        }
    }

    if (Test-Path (Join-Path $localNode "node.exe")) {
        $env:PATH = "$localNode;$env:PATH"
        Write-ItemOk "Node.js" "Da cai dat Portable Node.js v20 LTS thanh cong!"
        return $true
    }

    Write-ItemFail "Node.js" "Giai nen Node.js that bai."
    return $false
}

# --- 4. KIEM TRA & TU DONG KHOI DONG MYSQL / MARIADB / XAMPP ---
function Test-TcpPort {
    param([string]$HostName = "127.0.0.1", [int]$Port = 3306)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(1500, $false)
        if ($success) {
            $client.EndConnect($iar)
            $client.Close()
            return $true
        }
        $client.Close()
    } catch {}
    return $false
}

function Install-AutoDatabase {
    Safe-WriteHost "  [+] Tien hanh tu dong tai va cai dat XAMPP / MariaDB ve may..." -ForegroundColor Cyan
    
    # 1. Thu cai MariaDB / XAMPP qua Winget neu co
    $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
    if ($winget) {
        Safe-WriteHost "  Dang thu cai dat qua Winget..." -ForegroundColor Cyan
        & winget.exe install MariaDB.Server --silent --accept-package-agreements --accept-source-agreements 2>$null
        Start-Sleep -Seconds 5
        $s = Get-Service -Name *mariadb*, *mysql* -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($s) {
            Start-Service -Name $s.Name -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
        }
        if (Test-TcpPort -Port 3306) { return $true }
    }

    # 2. Thu tai va cai dat bo cai XAMPP tu dong
    $xamppInstaller = Join-Path $RuntimeDir "xampp-installer.exe"
    $xamppUrls = @(
        "https://sourceforge.net/projects/xampp/files/XAMPP%20Windows/8.2.12/xampp-windows-x64-8.2.12-0-VS16-installer.exe/download",
        "https://downloads.sourceforge.net/project/xampp/XAMPP%20Windows/8.2.12/xampp-windows-x64-8.2.12-0-VS16-installer.exe"
    )

    $dlSuccess = $false
    foreach ($url in $xamppUrls) {
        Safe-WriteHost "  Dang tai bo cai dat XAMPP tu dong..." -ForegroundColor Cyan
        $dlSuccess = Download-FileWithProgress -Url $url -Destination $xamppInstaller
        if ($dlSuccess -and (Test-Path $xamppInstaller) -and ((Get-Item $xamppInstaller).Length -gt 10000000)) {
            break
        }
    }

    if ($dlSuccess -and (Test-Path $xamppInstaller) -and ((Get-Item $xamppInstaller).Length -gt 10000000)) {
        Safe-WriteHost "  Dang tien hanh cai dat XAMPP vao C:\xampp (che do tu dong unattended)..." -ForegroundColor Cyan
        $instProc = Start-Process -FilePath $xamppInstaller -ArgumentList "--mode", "unattended" -PassThru -Wait
        Remove-Item $xamppInstaller -Force -ErrorAction SilentlyContinue
        
        # Kiem tra C:\xampp\mysql\bin\mysqld.exe
        if (Test-Path "C:\xampp\mysql\bin\mysqld.exe") {
            Safe-WriteHost "  Cai dat XAMPP thanh cong! Dang tu dong khoi dong mysqld..." -ForegroundColor Green
            Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini", "--standalone" -WindowStyle Hidden
            Start-Sleep -Seconds 4
            if (Test-TcpPort -Port 3306) {
                $env:PATH = "C:\xampp\mysql\bin;$env:PATH"
                return $true
            }
        }
    }

    # 3. Fallback: Tai goi Portable MariaDB (Chay nhe nhang, khong can quyen Admin)
    Safe-WriteHost "  Thu tai goi MariaDB Portable nhe (.runtime\mariadb)..." -ForegroundColor Cyan
    $mdbZip = Join-Path $RuntimeDir "mariadb.zip"
    $mdbUrls = @(
        "https://archive.mariadb.org/mariadb-10.6.18/winx64-packages/mariadb-10.6.18-winx64.zip",
        "https://downloads.mariadb.com/MariaDB/mariadb-10.6.18/winx64-packages/mariadb-10.6.18-winx64.zip"
    )

    $dlMdb = $false
    foreach ($url in $mdbUrls) {
        $dlMdb = Download-FileWithProgress -Url $url -Destination $mdbZip
        if ($dlMdb -and (Test-Path $mdbZip) -and ((Get-Item $mdbZip).Length -gt 10000000)) {
            break
        }
    }

    if ($dlMdb -and (Test-Path $mdbZip)) {
        Safe-WriteHost "  Dang giai nen MariaDB Portable..." -ForegroundColor Cyan
        $extractSuccess = Extract-ZipArchive -ZipPath $mdbZip -DestinationPath $RuntimeDir
        Remove-Item $mdbZip -ErrorAction SilentlyContinue
        
        $localMdb = Join-Path $RuntimeDir "mariadb"
        $foundMdb = Get-ChildItem -Path $RuntimeDir -Filter "mysqld.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($foundMdb) {
            $extractedRoot = (Split-Path -Parent $foundMdb.DirectoryName)
            if ($extractedRoot -ne $localMdb) {
                if (Test-Path $localMdb) { Remove-Item -Path $localMdb -Recurse -Force -ErrorAction SilentlyContinue }
                Rename-Item -Path $extractedRoot -NewName "mariadb" -ErrorAction SilentlyContinue
            }
        }

        $localMysqld = Join-Path $localMdb "bin\mysqld.exe"
        $localInstallDb = Join-Path $localMdb "bin\mysql_install_db.exe"
        $dataDir = Join-Path $localMdb "data"

        if (Test-Path $localInstallDb -and !(Test-Path $dataDir)) {
            Safe-WriteHost "  Khoi tao co so du lieu MariaDB..." -ForegroundColor Gray
            & $localInstallDb -d "$dataDir" | Out-Null
        }

        if (Test-Path $localMysqld) {
            Safe-WriteHost "  Dang khoi dong MariaDB Portable..." -ForegroundColor Cyan
            Start-Process -FilePath $localMysqld -ArgumentList "--datadir=`"$dataDir`"", "--port=3306", "--standalone" -WindowStyle Hidden
            Start-Sleep -Seconds 3
            if (Test-TcpPort -Port 3306) {
                $env:PATH = "$localMdb\bin;$env:PATH"
                return $true
            }
        }
    }

    return $false
}

function Setup-MySql {
    Write-Step "4/7: Kiem tra Co so du lieu MySQL / MariaDB (Port 3306)..."
    
    # 1. Kiem tra port 3306 truoc
    if (Test-TcpPort -Port 3306) {
        Write-ItemOk "Database Port 3306" "Dang hoat dong va lang nghe ket noi"
        if (Test-Path "C:\xampp\mysql\bin\mysql.exe") {
            $env:PATH = "C:\xampp\mysql\bin;$env:PATH"
        }
        return $true
    }

    # 2. Neu chua mo, quet cac duong dan pho bien cua XAMPP / Laragon / MariaDB / WAMP tren cac o dia
    Safe-WriteHost "  [!] Cong 3306 chua mo. Dang tim kiem MySQL / MariaDB / XAMPP tren may..." -ForegroundColor Yellow
    
    # Kiem tra thu muc MariaDB Portable trong .runtime neu da tung cai
    $portableMysqld = Join-Path $RuntimeDir "mariadb\bin\mysqld.exe"
    if (Test-Path $portableMysqld) {
        Safe-WriteHost "  Phat hien MariaDB Portable tai .runtime\mariadb. Dang khoi dong..." -ForegroundColor Cyan
        $dataDir = Join-Path $RuntimeDir "mariadb\data"
        Start-Process -FilePath $portableMysqld -ArgumentList "--datadir=`"$dataDir`"", "--port=3306", "--standalone" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        if (Test-TcpPort -Port 3306) {
            $env:PATH = "$RuntimeDir\mariadb\bin;$env:PATH"
            Write-ItemOk "MySQL / MariaDB" "Da tu dong khoi dong MariaDB Portable tren port 3306!"
            return $true
        }
    }

    $drives = @("C", "D", "E", "F")
    $mysqlFound = $null

    foreach ($drv in $drives) {
        $possiblePaths = @(
            "$drv`:\xampp\mysql\bin\mysqld.exe",
            "$drv`:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqld.exe",
            "$drv`:\laragon\bin\mariadb\mariadb-10.6.5-winx64\bin\mysqld.exe",
            "$drv`:\wamp64\bin\mysql\mysql*\bin\mysqld.exe",
            "$drv`:\wamp\bin\mysql\mysql*\bin\mysqld.exe",
            "$drv`:\Program Files\MariaDB*\bin\mysqld.exe",
            "$drv`:\Program Files\MySQL\MySQL Server*\bin\mysqld.exe",
            "$drv`:\Program Files (x86)\MariaDB*\bin\mysqld.exe"
        )
        foreach ($pat in $possiblePaths) {
            $matched = Get-Item $pat -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($matched -and (Test-Path $matched.FullName)) {
                $mysqlFound = $matched.FullName
                break
            }
        }
        if ($mysqlFound) { break }
    }

    if ($mysqlFound) {
        Safe-WriteHost "  Phat hien MySQL tai: $mysqlFound" -ForegroundColor Cyan
        $mysqlBin = Split-Path -Parent $mysqlFound
        $env:PATH = "$mysqlBin;$env:PATH"
        
        # Khoi dong mysqld
        $myIni = Join-Path $mysqlBin "my.ini"
        if (!(Test-Path $myIni)) { $myIni = Join-Path (Split-Path -Parent $mysqlBin) "my.ini" }
        
        if (Test-Path $myIni) {
            Start-Process -FilePath $mysqlFound -ArgumentList "--defaults-file=`"$myIni`"", "--standalone" -WindowStyle Hidden
        } else {
            Start-Process -FilePath $mysqlFound -ArgumentList "--standalone" -WindowStyle Hidden
        }
        
        Start-Sleep -Seconds 3
        if (Test-TcpPort -Port 3306) {
            Write-ItemOk "MySQL / MariaDB" "Da tu dong khoi dong MySQL thanh cong tren port 3306!"
            return $true
        }
    }

    # 3. Tim va khoi dong Windows Services
    $services = Get-Service -Name *mysql*, *mariadb*, *wampmysqld* -ErrorAction SilentlyContinue
    if ($services) {
        foreach ($s in $services) {
            Safe-WriteHost "  Phat hien Service '$($s.Name)' (Status: $($s.Status)). Dang khoi dong..." -ForegroundColor Cyan
            try {
                Start-Service -Name $s.Name -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 3
                if (Test-TcpPort -Port 3306) {
                    Write-ItemOk "Database Service" "Da khoi dong service $($s.Name) thanh cong!"
                    return $true
                }
            } catch {}
        }
    }

    if ($CheckOnly) {
        Write-ItemFail "MySQL / MariaDB" "Chua co dich vu MySQL/MariaDB hoat dong tren port 3306!"
        return $false
    }

    # 4. Neu hoan toan chua co MySQL tren may: Tu dong tai va cai dat XAMPP / MariaDB
    $installedOk = Install-AutoDatabase
    if ($installedOk) {
        Write-ItemOk "MySQL / XAMPP" "Da tu dong cai dat va khoi dong MySQL thanh cong tren port 3306!"
        return $true
    }

    Write-ItemFail "MySQL / MariaDB" "Khong the tu dong cai dat hoac khoi dong MySQL tren port 3306."
    Safe-WriteHost "  ------------------------------------------------------------------" -ForegroundColor DarkGray
    Safe-WriteHost "  [HUONG DAN KHOI DONG DATABASE]" -ForegroundColor Yellow
    Safe-WriteHost "  1. Neu ban da cai XAMPP: Hay mo 'XAMPP Control Panel' va bam Start tai dong MySQL." -ForegroundColor Yellow
    Safe-WriteHost "  2. Neu chua co MySQL/XAMPP: Hay tai va cai dat XAMPP tu https://www.apachefriends.org/" -ForegroundColor Yellow
    Safe-WriteHost "     (Sau khi cai dat va Start MySQL tren port 3306, hay chay lai tool setup nay)." -ForegroundColor Yellow
    Safe-WriteHost "  ------------------------------------------------------------------" -ForegroundColor DarkGray
    return $false
}

# --- 5. KIEM TRA DATABASE NGOCRONG & TU DONG IMPORT DATA ---
function Setup-DatabaseData {
    Write-Step "5/7: Kiem tra Database 'ngocrong' va du lieu game..."
    
    # Kiem tra xem port 3306 co hoat dong khong
    if (!(Test-TcpPort -Port 3306)) {
        Write-ItemWarn "Database Check" "Bo qua do MySQL / MariaDB (Port 3306) chua khoi dong."
        return $false
    }

    $importScript = Join-Path $RootDir "tools\setup\import_db.mjs"
    $nodeCmd = Get-Command "node.exe" -ErrorAction SilentlyContinue
    
    if (!$nodeCmd -or !(Test-Path $importScript)) {
        Write-ItemWarn "Database Check" "Bo qua do chua co Node.js hoac thieu import_db.mjs"
        return $true
    }

    # Kiem tra mysql2 trong panel\api
    $apiDir = Join-Path $RootDir "panel\api"
    if (!(Test-Path (Join-Path $apiDir "node_modules\mysql2"))) {
        Safe-WriteHost "  Dang cai thu vien ket noi Database (npm install mysql2)..." -ForegroundColor Gray
        Push-Location $apiDir
        & npm.cmd install mysql2 --silent 2>$null
        Pop-Location
    }

    if ($CheckOnly -and !$ForceImportDb) {
        $res = & node $importScript --check-only 2>&1
        if ($res) {
            foreach ($line in $res) {
                Safe-WriteHost "  $line" -ForegroundColor Gray
            }
        }
        if ($LASTEXITCODE -eq 0) {
            Write-ItemOk "Database Data" "Database 'ngocrong' da day du du lieu"
            return $true
        } else {
            Write-ItemWarn "Database Data" "Database 'ngocrong' chua co hoac chua day du du lieu"
            return $false
        }
    }

    $res = & node $importScript 2>&1
    if ($res) {
        foreach ($line in $res) {
            Safe-WriteHost "  $line" -ForegroundColor Gray
        }
    }
    if ($LASTEXITCODE -eq 0) {
        Write-ItemOk "Database Data" "Database 'ngocrong' da san sang 100%!"
        return $true
    } else {
        Write-ItemFail "Database Data" "Khong the ket noi hoac import database. Hay kiem tra port 3306 va Config.properties."
        return $false
    }
}

# --- 6. KIEM TRA & BUILD WEB CONTROL PANEL ---
function Setup-Panel {
    Write-Step "6/7: Kiem tra Web Control Panel (API va Web UI)..."
    
    $apiDir = Join-Path $RootDir "panel\api"
    $webDir = Join-Path $RootDir "panel\web"

    # A. Cai dependencies cho panel/api
    if (!(Test-Path (Join-Path $apiDir "node_modules"))) {
        if ($CheckOnly) {
            Write-ItemWarn "Panel API" "Chua cai node_modules trong panel/api"
        } else {
            Safe-WriteHost "  Dang cai dat thu vien cho Panel API (npm install)..." -ForegroundColor Cyan
            Push-Location $apiDir
            & npm.cmd install
            Pop-Location
        }
    } else {
        Write-ItemOk "Panel API" "Da co du node_modules"
    }

    # B. Cai dependencies cho panel/web
    if (!(Test-Path (Join-Path $webDir "node_modules"))) {
        if ($CheckOnly) {
            Write-ItemWarn "Panel Web" "Chua cai node_modules trong panel/web"
        } else {
            Safe-WriteHost "  Dang cai dat thu vien cho Panel Web (npm install)..." -ForegroundColor Cyan
            Push-Location $webDir
            & npm.cmd install
            Pop-Location
        }
    } else {
        Write-ItemOk "Panel Web" "Da co du node_modules"
    }

    # C. Dong bo database panel
    $syncScript = Join-Path $apiDir "scripts\sync-database.js"
    if (Test-Path $syncScript) {
        Safe-WriteHost "  Dang dong bo bang du lieu Panel (sync-database)..." -ForegroundColor Gray
        Push-Location $apiDir
        & node scripts/sync-database.js 2>$null | Out-Null
        Pop-Location
    }

    # D. Kiem tra ban build Web
    $distDir = Join-Path $webDir "dist"
    if (!(Test-Path $distDir)) {
        if ($CheckOnly) {
            Write-ItemWarn "Panel Web Build" "Chua co thu muc build panel/web/dist"
        } else {
            Safe-WriteHost "  Dang build giao dien Web Panel (Vite build)..." -ForegroundColor Cyan
            Push-Location $webDir
            & node node_modules/vite/bin/vite.js build
            Pop-Location
            if (Test-Path $distDir) {
                Write-ItemOk "Panel Web Build" "Da build giao dien Web Panel thanh cong"
            }
        }
    } else {
        Write-ItemOk "Panel Web Build" "Da co san ban build giao dien Web Panel"
    }

    return $true
}

# --- 7. KIEM TRA & BIEN DICH GAME SERVER JAR ---
function Setup-GameServerJar {
    Write-Step "7/7: Kiem tra Game Server Executable (dist/NgocRongOnline.jar)..."
    $jarPath = Join-Path $RootDir "dist\NgocRongOnline.jar"
    
    if (Test-Path $jarPath) {
        $sizeMb = [math]::Round((Get-Item $jarPath).Length / 1MB, 2)
        Write-ItemOk "Server JAR" "dist\NgocRongOnline.jar da san sang ($sizeMb MB)"
        return $true
    }

    if ($CheckOnly) {
        Write-ItemFail "Server JAR" "Chua co file dist\NgocRongOnline.jar"
        return $false
    }

    Safe-WriteHost "  [!] Chua co file NgocRongOnline.jar. Dang tu dong bien dich source code..." -ForegroundColor Yellow
    $buildScript = Join-Path $RootDir "build_server.ps1"
    if (Test-Path $buildScript) {
        & powershell.exe -ExecutionPolicy Bypass -File $buildScript
        if (Test-Path $jarPath) {
            Write-ItemOk "Server JAR" "Bien dich va dong goi NgocRongOnline.jar thanh cong!"
            return $true
        }
    }
    
    Write-ItemFail "Server JAR" "Khong the bien dich file JAR. Hay kiem tra loi trong source code."
    return $false
}

# ========================================================================
# MAIN EXECUTION FLOW
# ========================================================================

Write-BoxHeader "TOOL TU DONG KIEM TRA & SETUP SERVER NGOC RONG ONLINE (1-CLICK)"

$ok1 = Check-ConfigProperties
$ok2 = Setup-Java
$ok3 = Setup-NodeJs
$ok4 = Setup-MySql
$ok5 = Setup-DatabaseData
$ok6 = Setup-Panel
$ok7 = Setup-GameServerJar

$allReady = $ok1 -and $ok2 -and $ok3 -and $ok4 -and $ok5 -and $ok6 -and $ok7

Safe-WriteHost ""
Safe-WriteHost "========================================================================" -ForegroundColor Cyan

if ($allReady) {
    Safe-WriteHost "  *** CHUC MUNG: THIET BI DA CAI DAT DAY DU VA SAN SANG VAN HANH 100%! ***" -ForegroundColor Green
    Safe-WriteHost "  >>> BAN KHONG CAN PHAI LAM GI THEM NUA! <<<" -ForegroundColor Green
    Safe-WriteHost "========================================================================" -ForegroundColor Cyan
    Safe-WriteHost ""
    Safe-WriteHost "  Cac thanh phan da san sang:" -ForegroundColor White
    Safe-WriteHost "   [x] Java JDK 17+ / 21:       OK" -ForegroundColor Green
    Safe-WriteHost "   [x] MySQL / MariaDB (:3306): OK" -ForegroundColor Green
    Safe-WriteHost "   [x] Database 'ngocrong':     OK" -ForegroundColor Green
    Safe-WriteHost "   [x] Node.js & Panel API/Web: OK" -ForegroundColor Green
    Safe-WriteHost "   [x] Game Server Jar (:14445):OK" -ForegroundColor Green
    Safe-WriteHost ""

    if ($AutoStart) {
        Safe-WriteHost "Dang tu dong khoi dong server..." -ForegroundColor Cyan
        & "$RootDir\start-all.bat"
        exit 0
    }

    if (!$CheckOnly) {
        Safe-WriteHost "  BAN CO MUON KHOI DONG SERVER NGAY BAY GIO KHONG?" -ForegroundColor Yellow
        Safe-WriteHost "    [1] Khoi dong TOAN BO (Game Server + Web Control Panel) - [Mac dinh]" -ForegroundColor White
        Safe-WriteHost "    [2] Chi khoi dong Game Server" -ForegroundColor White
        Safe-WriteHost "    [3] Thoat" -ForegroundColor White
        Safe-WriteHost ""
        
        $rawChoice = Read-Host "  Nhap lua chon cua ban (1/2/3 hoac Enter de chay tat ca)"
        $choice = if ($rawChoice) { $rawChoice.Trim() } else { "1" }
        if ($choice -eq "2") {
            Safe-WriteHost "Dang mo Game Server..." -ForegroundColor Cyan
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$RootDir\start-server.bat`""
        } elseif ($choice -eq "3") {
            Safe-WriteHost "Tam biet!" -ForegroundColor Gray
            exit 0
        } else {
            Safe-WriteHost "Dang khoi dong Full Stack (Game Server + Web Panel)..." -ForegroundColor Cyan
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$RootDir\start-all.bat`""
        }
    }
} else {
    Safe-WriteHost "  [!] CANH BAO: MOT SO THANH PHAN CHUA HOAN TAT DUOC TU DONG!" -ForegroundColor Red
    Safe-WriteHost "  Vui long kiem tra lai thong bao mau do/vang o tren." -ForegroundColor Yellow
    Safe-WriteHost "========================================================================" -ForegroundColor Cyan
}

Safe-WriteHost ""
