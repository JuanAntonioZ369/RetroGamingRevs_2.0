@echo off
cd /d "%~dp0"

for /f "tokens=2 delims=:, " %%v in ('findstr /r "\"version\"" package.json') do (
    set VERSION=%%~v
    goto :gotversion
)
:gotversion

title GamingRevs %VERSION%
echo.
echo  GamingRevs %VERSION%
echo.

:: ── Verificar Node con nvm-windows ──────────────────────────────
where nvm >nul 2>&1
if %errorlevel% == 0 (
    nvm use 20.18.1 >nul 2>&1
    if %errorlevel% neq 0 (
        echo Instalando Node 20.18.1...
        nvm install 20.18.1
        nvm use 20.18.1
    )
) else (
    for /f "tokens=2 delims=v." %%m in ('node --version 2^>nul') do set NODEVER=%%m
    if not "%NODEVER%"=="20" (
        echo  ADVERTENCIA: Se recomienda Node 20. Instala nvm-windows:
        echo  https://github.com/coreybutler/nvm-windows/releases
        echo.
    )
)

:: ── Usar mirror alternativo para descarga de Electron ────────────
:: (GitHub suele fallar desde algunas redes — npmmirror es mas estable)
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CUSTOM_DIR=%(version)s

:: ── Instalar dependencias ────────────────────────────────────────
echo Instalando dependencias...
npm install

:: ── Verificar que Electron se instaló correctamente ──────────────
if not exist "node_modules\electron\dist\electron.exe" (
    echo  Electron no se descargo. Reintentando con mirror alternativo...
    rmdir /s /q "node_modules\electron" 2>nul
    npm cache clean --force >nul 2>&1
    npm install
)

:: Si aun no hay exe, intentar descargar el binario manualmente
if not exist "node_modules\electron\dist\electron.exe" (
    echo  Descargando binario de Electron directamente...
    for /f "tokens=*" %%e in ('node -e "process.stdout.write(require('./node_modules/electron/package.json').version)"') do set ELECTRON_VER=%%e
    powershell -Command "Invoke-WebRequest -Uri 'https://npmmirror.com/mirrors/electron/%ELECTRON_VER%/electron-v%ELECTRON_VER%-win32-x64.zip' -OutFile '%TEMP%\electron.zip'"
    powershell -Command "Expand-Archive -Path '%TEMP%\electron.zip' -DestinationPath 'node_modules\electron\dist' -Force"
    del "%TEMP%\electron.zip" 2>nul
)

:: Asegurar path.txt correcto (ASCII, sin UTF-16, contenido: "electron.exe")
if exist "node_modules\electron\dist\electron.exe" (
    powershell -Command "[System.IO.File]::WriteAllText('%CD%\node_modules\electron\path.txt', 'electron.exe')"
) else (
    echo.
    echo  ERROR: No se pudo instalar Electron.
    echo  Descarga manualmente el zip de:
    echo  https://github.com/electron/electron/releases
    echo  Busca: electron-v25.9.8-win32-x64.zip
    echo  Extrae su contenido en: node_modules\electron\dist\
    echo  Luego vuelve a ejecutar run.bat
    echo.
    pause
    exit /b 1
)

:start
npm start
