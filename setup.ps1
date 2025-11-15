# Setup script for MetaSSH repository
# Run this script after installing Git

Write-Host "Setting up MetaSSH repository..." -ForegroundColor Green

# Add Git to PATH if not already there
$gitPath = "C:\Program Files\Git\bin"
if (Test-Path $gitPath) {
    if ($env:Path -notlike "*$gitPath*") {
        $env:Path += ";$gitPath"
        Write-Host "Added Git to PATH for this session" -ForegroundColor Cyan
    }
} else {
    Write-Host "Warning: Git not found in default location. Make sure Git is installed and in PATH." -ForegroundColor Yellow
}

# Initialize git repository
Write-Host "Initializing git repository..." -ForegroundColor Yellow
git init

# Add remote repository
Write-Host "Adding remote repository..." -ForegroundColor Yellow
$remoteExists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin https://github.com/metasina3/MetaSSH.git
} else {
    Write-Host "Remote 'origin' already exists, updating URL..." -ForegroundColor Cyan
    git remote set-url origin https://github.com/metasina3/MetaSSH.git
}

# Add all files
Write-Host "Adding files..." -ForegroundColor Yellow
git add .

# Create initial commit
Write-Host "Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: MetaSSH project setup"

# Set default branch to main
Write-Host "Setting default branch to main..." -ForegroundColor Yellow
git branch -M main

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Note: If authentication is required, use your GitHub username and token as password." -ForegroundColor Cyan
git push -u origin main

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Repository URL: https://github.com/metasina3/MetaSSH" -ForegroundColor Cyan

