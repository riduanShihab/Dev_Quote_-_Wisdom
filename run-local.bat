@echo off
echo Running daily commit automation...
node "%~dp0update.js"
git add streak.json ACTIVITY.md README.md
git commit -m "chore(auto-commit): manual trigger daily update [skip ci]"
git push origin main
echo Done!
pause
