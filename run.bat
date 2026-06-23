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
    echo Switching to Node 18 (nvm)...
    nvm use 18.20.4 >nul 2>&1
    if %errorlevel% neq 0 (
        echo Instalando Node 18.20.4...
        nvm install 18.20.4
        nvm use 18.20.4
    )
) else (
    :: nvm no instalado — verificar que al menos sea Node 18
    for /f "tokens=1 delims=v." %%m in ('node --version 2^>nul') do set DUMMY=%%m
    for /f "tokens=2 delims=v." %%m in ('node --version 2^>nul') do set NODEVER=%%m
    if not "%NODEVER%"=="18" (
        echo.
        echo  ADVERTENCIA: Se recomienda Node 18 para este proyecto.
        echo  Version actual:
        node --version
        echo  Instala nvm-windows para cambiar de version facilmente:
        echo  https://github.com/coreybutler/nvm-windows/releases
        echo.
        pause
    )
)

:: ── Instalar dependencias ────────────────────────────────────────
echo Installing/updating dependencies for v%VERSION%...
npm install

:start
npm start
