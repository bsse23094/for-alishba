@echo off
echo ============================================================
echo   Starting Alishba's Never-Wilting Flower Website...
echo ============================================================
start http://localhost:3030
python -m http.server 3030
pause
