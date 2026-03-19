@echo off
cd /d "%~dp0"

if not exist node_modules (
    echo Installing dependencies...
    npm install
)

:: Verificar si cfgigual.txt existe
if not exist cfgigual.txt (
    echo cfgigual.txt no encontrado, iniciando sin verificar cfg...
    goto start
)

:: Comparar cfgigual.txt con retroarch.cfg
fc /b "cfgigual.txt" "RetroArch-Win64\retroarch.cfg" >nul 2>&1
if errorlevel 1 (
    echo Configuracion diferente, actualizando retroarch.cfg...
    copy /y "cfgigual.txt" "RetroArch-Win64\retroarch.cfg"
    echo retroarch.cfg actualizado.
) else (
    echo Configuracion igual, no se necesita actualizar.
)

:start
npm start