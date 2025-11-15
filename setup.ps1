# Setup script for MetaSSH repository
# Run this script after installing Git

Write-Host "Setting up MetaSSH repository..." -ForegroundColor Green

# Initialize git repository
Write-Host "Initializing git repository..." -ForegroundColor Yellow
git init

# Add remote repository
Write-Host "Adding remote repository..." -ForegroundColor Yellow
git remote add origin https://github.com/metasina3/MetaSSH.git

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
Write-Host "Note: You may need to authenticate. Use your GitHub token as password." -ForegroundColor Cyan
git push -u origin main

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Repository URL: https://github.com/metasina3/MetaSSH" -ForegroundColor Cyan

