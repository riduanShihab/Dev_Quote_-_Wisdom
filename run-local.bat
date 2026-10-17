@echo off
echo [1/4] Syncing latest commits from GitHub...
git pull --rebase origin main

echo [2/4] Running daily commit automation script...
node "%~dp0update.js"

echo [3/4] Staging updated stats and journal...
git add streak.json quotes.json ACTIVITY.md README.md

echo [4/4] Committing and pushing to main...
git commit -m "chore(auto-commit): manual trigger daily update [skip ci]"
git push origin main

echo ==============================================
echo Automation complete! Streak updated and pushed.
echo ==============================================
pause
