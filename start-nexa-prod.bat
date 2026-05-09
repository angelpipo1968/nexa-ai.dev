@echo off
echo 🚀 Iniciando NEXA AI (producción)...
echo    → http://localhost:3000
echo    → Ctrl+C para detener
echo.
call npm run build
call npm run start
