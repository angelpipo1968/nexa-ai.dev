@echo off
echo ========================================
echo NEXA OS - PUENTE OLLAMA PARA ANDROID
echo ========================================
echo Conecta tu celular por USB...
%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe wait-for-device
echo Celular detectado.
echo Abriendo tunel de red...
%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe reverse tcp:11434 tcp:11434
echo ¡Tunel establecido!
echo Ahora puedes usar Nexa OS en tu celular.
pause
