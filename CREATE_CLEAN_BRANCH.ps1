# Create Clean Branch Without History
# Run this script to create a new branch without old commits containing secrets

# Navigate to repository
cd "C:\Users\aless\OneDrive\Desktop\networkfollowup\NFU - TEST BRANCH - backup"

# Create orphan branch (no history)
git checkout --orphan CLEAN-BRANCH

# Add all current files
git add .

# Commit with clean message
git commit -m "Production ready: Clean start - All secrets removed"

# Force push to origin
git push origin CLEAN-BRANCH --force

Write-Host "✅ Clean branch created and pushed successfully!" -ForegroundColor Green
Write-Host "Branch: CLEAN-BRANCH" -ForegroundColor Cyan
Write-Host "No old commits with secrets!" -ForegroundColor Green







