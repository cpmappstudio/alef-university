# Create the destination folder outside the project root
$sourceRoot = Get-Location
$destinationRoot = Join-Path (Split-Path $sourceRoot -Parent) "ContextFront2"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destinationRoot)) {
    New-Item -ItemType Directory -Path $destinationRoot -Force
    Write-Host "Created directory: $destinationRoot" -ForegroundColor Green
}

# Define the files to copy (add paths as they become available)
$filesToCopy = @(
    # "app\[locale]\(dashboard)\admin\courses\page.tsx",
    # "app\[locale]\(dashboard)\admin\enrollments\page.tsx",
    # "app\[locale]\(dashboard)\admin\sections\page.tsx",
    # "app\[locale]\(dashboard)\admin\programs\page.tsx",
    # "app\[locale]\(dashboard)\admin\students\page.tsx",
    # "app\[locale]\(dashboard)\admin\professors\page.tsx",
    # "app\[locale]\(dashboard)\admin\periods\page.tsx",
    "components\dashboard\admin-dashboard.tsx",
    "components\dashboard\admin\dashboard-data.ts",
    "components\dashboard\admin\index.ts",
    "components\dashboard\admin\metrics-grid.tsx",
    "components\dashboard\admin\recent-activities-card.tsx",
    "components\dashboard\admin\types.ts",
    "components\dashboard\admin\upcoming-deadlines-card.tsx",
    "components\dashboard\professor-dashboard.tsx",
    "components\dashboard\professor\current-sections-card.tsx",
    "components\dashboard\professor\dashboard-data.ts",
    "components\dashboard\professor\index.ts",
    "components\dashboard\professor\metrics-grid.tsx",
    "components\dashboard\professor\types.ts",
    "components\dashboard\professor\upcoming-closing-dates-card.tsx",
    "components\professor\columns.tsx",
    "components\professor\index.ts",
    "components\professor\section-details-dialog.tsx",
    "components\professor\teaching-history-table.tsx",
    "components\professor\types.ts",
    "components\student\academic-history-table.tsx",
    "components\student\columns.tsx",
    "components\student\course-details-dialog.tsx",
    "components\student\types.ts",
    "components\ui\data-table.tsx",
    "app\[locale]\(dashboard)\teaching\gradebook\page.tsx",
    "app\[locale]\(dashboard)\academic\history\page.tsx",
    "app\[locale]\(dashboard)\page.tsx"
)

# Function to get a unique filename if file already exists
function Get-UniqueFileName {
    param(
        [string]$FilePath
    )
    
    $counter = 1
    $directory = Split-Path $FilePath -Parent
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
    $extension = [System.IO.Path]::GetExtension($FilePath)
    
    $newPath = $FilePath
    while (Test-Path $newPath) {
        $newFileName = "$baseName($counter)$extension"
        $newPath = Join-Path $directory $newFileName
        $counter++
    }
    
    return $newPath
}

# Copy each file
foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $sourceRoot $file
    
    if (Test-Path $sourcePath) {
        # Get just the filename (flatten the structure)
        $fileName = Split-Path $file -Leaf
        $destPath = Join-Path $destinationRoot $fileName
        
        # Get unique filename if file exists
        if (Test-Path $destPath) {
            $destPath = Get-UniqueFileName -FilePath $destPath
        }
        
        # Copy the file to the flattened location
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file -> $(Split-Path $destPath -Leaf)" -ForegroundColor Cyan
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nCopy operation completed!" -ForegroundColor Green
Write-Host "Files copied to: $destinationRoot" -ForegroundColor Green