#Requires -Version 5.1

#  SEO Lens — installer
#  hassan mode : on
#  https://github.com/hassan95eb/seo-extension

<#
    .SYNOPSIS
        Downloads the latest SEO Lens release and prepares it for Chrome.

    .DESCRIPTION
        Chrome removed the --load-extension command-line flag in Chrome 137, so no script
        can load an unpacked extension into your normal browser profile. Two clicks in the
        Chrome UI are unavoidable. This script removes everything else: it fetches the
        latest release, unpacks it to a permanent folder, checks the manifest is intact and
        puts the folder path on your clipboard so you can paste it into Chrome's picker.

        Run it again later to update — the install path never changes, so Chrome keeps the
        extension registered and you only have to press the reload button.

    .PARAMETER Path
        Where to install. Defaults to %LOCALAPPDATA%\SEO Lens.
        Pick somewhere permanent: Chrome reads the extension from this folder every time it
        starts, so if the folder moves or is deleted, the extension disappears with it.

    .PARAMETER Version
        Install a specific release tag (e.g. v2.1.0) instead of the latest one.

    .PARAMETER Force
        Reinstall even if the installed version already matches the requested one.

    .PARAMETER Repo
        owner/name of the source repository. Only useful if you maintain a fork.

    .PARAMETER ApiBase
        GitHub API root. Only useful for a mirror or for testing this script.

    .EXAMPLE
        .\install.ps1
        Installs the latest release to %LOCALAPPDATA%\SEO Lens.

    .EXAMPLE
        .\install.ps1 -Path D:\Tools\SEOLens -Version v2.1.0
        Installs a specific release to a specific folder.
#>

[CmdletBinding()]
param(
    [string] $Path,
    [string] $Version,
    [string] $Repo    = "hassan95eb/seo-extension",
    [string] $ApiBase = "https://api.github.com",
    [switch] $Force
)

$ErrorActionPreference = "Stop"

# Windows PowerShell 5.1 still defaults to TLS 1.0, which GitHub refuses.
try {
    [Net.ServicePointManager]::SecurityProtocol =
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

function Write-Step  ($m) { Write-Host "  ->  $m" }
function Write-Ok    ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Write-Warn2 ($m) { Write-Host "  !   $m" -ForegroundColor Yellow }
function Write-Head  ($m) { Write-Host ""; Write-Host $m -ForegroundColor Cyan }

function Get-DefaultInstallPath {
    $base = $env:LOCALAPPDATA
    if (-not $base) { $base = $env:APPDATA }
    if (-not $base) { $base = Join-Path $HOME ".local" }
    return (Join-Path $base "SEO Lens")
}

# Reads the version out of an installed copy, or $null when nothing is installed there.
function Get-InstalledVersion ($dir) {
    $mf = Join-Path $dir "manifest.json"
    if (-not (Test-Path -LiteralPath $mf)) { return $null }
    try { return (Get-Content -LiteralPath $mf -Raw | ConvertFrom-Json).version }
    catch { return $null }
}

Write-Host ""
Write-Host "SEO Lens installer" -ForegroundColor Magenta
Write-Host "hassan mode : on" -ForegroundColor DarkGray

if (-not $Path) { $Path = Get-DefaultInstallPath }

# ---------------------------------------------------------------- 1. find the release
Write-Head "1/4  Looking up the release"

if ($Version) {
    $relUrl = "$ApiBase/repos/$Repo/releases/tags/$Version"
} else {
    $relUrl = "$ApiBase/repos/$Repo/releases/latest"
}

try {
    $release = Invoke-RestMethod -Uri $relUrl -Headers @{
        "User-Agent" = "seo-lens-installer"
        "Accept"     = "application/vnd.github+json"
    }
} catch {
    Write-Host ""
    Write-Host "  Could not reach GitHub." -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  If this is a 404, the release may not be published yet."
    Write-Host "  You can always install manually: download the ZIP from"
    Write-Host "  https://github.com/$Repo/releases and follow the steps in the README."
    exit 1
}

$tag = $release.tag_name
Write-Ok "found release $tag"

# Prefer an attached .zip asset; fall back to GitHub's source archive.
$asset = $release.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
if ($asset) {
    $downloadUrl = $asset.browser_download_url
    Write-Step "asset: $($asset.name)"
} else {
    $downloadUrl = $release.zipball_url
    Write-Warn2 "no .zip asset on this release — using the source archive instead"
}

$targetVersion = $tag -replace '^v', ''
$installed = Get-InstalledVersion $Path

if ($installed -and ($installed -eq $targetVersion) -and (-not $Force)) {
    Write-Head "Already up to date"
    Write-Host "  Version $installed is already installed at:"
    Write-Host "  $Path" -ForegroundColor White
    Write-Host ""
    Write-Host "  Re-run with -Force to reinstall anyway."
    exit 0
}

# ---------------------------------------------------------------- 2. download
Write-Head "2/4  Downloading"

$work = Join-Path ([System.IO.Path]::GetTempPath()) ("seo-lens-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$zip  = Join-Path $work "release.zip"
$dump = Join-Path $work "unpacked"
New-Item -ItemType Directory -Path $work -Force | Out-Null

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zip -UseBasicParsing -Headers @{
        "User-Agent" = "seo-lens-installer"
    }
    $kb = [math]::Round((Get-Item -LiteralPath $zip).Length / 1KB)
    Write-Ok "downloaded ($kb KB)"

    # ------------------------------------------------------------ 3. unpack + verify
    Write-Head "3/4  Unpacking and checking"

    Expand-Archive -LiteralPath $zip -DestinationPath $dump -Force

    # GitHub's source archives wrap everything in a folder like "repo-a1b2c3d/", and some
    # release ZIPs are built the same way. Find manifest.json wherever it landed and treat
    # its folder as the extension root — the shallowest match wins.
    $manifestFile = Get-ChildItem -Path $dump -Filter "manifest.json" -Recurse -File |
                    Sort-Object { $_.FullName.Length } |
                    Select-Object -First 1

    if (-not $manifestFile) {
        throw "This archive contains no manifest.json, so it is not a Chrome extension."
    }

    $root = $manifestFile.Directory.FullName

    try {
        $manifest = Get-Content -LiteralPath $manifestFile.FullName -Raw | ConvertFrom-Json
    } catch {
        throw "manifest.json is not valid JSON — the download is probably corrupt."
    }
    if (-not $manifest.manifest_version) {
        throw "manifest.json has no manifest_version field — this is not a valid extension."
    }
    Write-Ok "manifest v$($manifest.manifest_version), extension version $($manifest.version)"

    # ------------------------------------------------------------ 4. install
    Write-Head "4/4  Installing"

    # The folder itself is kept and only its contents are replaced. Chrome remembers the
    # extension by path, so keeping the path stable turns an update into a single reload
    # instead of a fresh "Load unpacked".
    if (Test-Path -LiteralPath $Path) {
        Get-ChildItem -LiteralPath $Path -Force | Remove-Item -Recurse -Force
    } else {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }

    Copy-Item -Path (Join-Path $root "*") -Destination $Path -Recurse -Force

    if (-not (Test-Path -LiteralPath (Join-Path $Path "manifest.json"))) {
        throw "The copy did not complete — manifest.json is missing from $Path."
    }
    Write-Ok "installed to $Path"
}
catch {
    # Anything that goes wrong past this point is reported as a sentence, not as a
    # PowerShell stack trace — whoever runs this is trying to install a browser
    # extension, not debug a script.
    Write-Host ""
    Write-Host "  Install failed." -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Nothing was changed at $Path."
    Write-Host "  You can install manually instead: download the ZIP from"
    Write-Host "  https://github.com/$Repo/releases, unzip it, and load the folder"
    Write-Host "  through chrome://extensions -> Developer mode -> Load unpacked."
    exit 1
}
finally {
    if (Test-Path -LiteralPath $work) {
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ---------------------------------------------------------------- what's left for a human
# Only claim the path was copied if it actually round-trips. Set-Clipboard exists on some
# non-Windows hosts but quietly does nothing there, and telling someone to press Ctrl+V
# when the clipboard is empty is worse than telling them nothing.
$clip = $false
try {
    Set-Clipboard -Value $Path -ErrorAction Stop
    if ((Get-Clipboard -ErrorAction Stop) -eq $Path) { $clip = $true }
} catch { }

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
if ($installed) {
    if ($installed -eq $targetVersion) {
        Write-Host " Reinstalled version $targetVersion" -ForegroundColor Green
    } else {
        Write-Host " Updated: $installed  ->  $targetVersion" -ForegroundColor Green
    }
    Write-Host "====================================================="  -ForegroundColor Cyan
    Write-Host ""
    Write-Host " SEO Lens is already registered in Chrome, so all that"
    Write-Host " is left is to pick up the new files:"
    Write-Host ""
    Write-Host "   1. Open  chrome://extensions"
    Write-Host "   2. Press the reload arrow on the SEO Lens card"
} else {
    Write-Host " Ready to load — 2 clicks left" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host " Chrome does not allow a script to install an unpacked"
    Write-Host " extension, so these last steps are done by hand:"
    Write-Host ""
    Write-Host "   1. Open  chrome://extensions"
    Write-Host "   2. Turn on  Developer mode  (top right)"
    Write-Host "   3. Click  Load unpacked"
    Write-Host "   4. Paste this path into the folder picker:"
    Write-Host ""
    Write-Host "      $Path" -ForegroundColor White
    if ($clip) {
        Write-Host ""
        Write-Host "      (already copied to your clipboard — just press Ctrl+V)" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "   5. Pin the purple lens icon to your toolbar"
}
Write-Host ""
Write-Host " Keep that folder where it is. Chrome loads the extension" -ForegroundColor DarkGray
Write-Host " from it on every start; move or delete it and the"        -ForegroundColor DarkGray
Write-Host " extension goes with it."                                  -ForegroundColor DarkGray
Write-Host ""
Write-Host " To update later, run this script again."                  -ForegroundColor DarkGray
Write-Host ""
