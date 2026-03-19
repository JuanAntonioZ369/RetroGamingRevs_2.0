@echo off
cd /d "%~dp0"

echo Iniciando git...
git init

echo Configurando repo...
git remote remove origin 2>nul
git remote add origin https://github.com/JuanAntonioZ369/RetroGamingRevs_2.0.git

echo Actualizando proyecto con GitHub...
git fetch origin
git reset --hard origin/master

echo Actualización completa.
pause