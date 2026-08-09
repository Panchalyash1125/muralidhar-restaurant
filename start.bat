@echo off
REM ============================================
REM MURALIDHAR RESTAURANT - QUICK START SCRIPT
REM For Windows
REM ============================================

echo.
echo  Muralidhar Restaurant System
echo  =====================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  Node.js is not installed!
    echo  Please install from: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo  Node.js: %NODE_VERSION%

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo  npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
echo  npm: %NPM_VERSION%

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo  Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo  Failed to install dependencies
        pause
        exit /b 1
    )
    echo  Dependencies installed
) else (
    echo  Dependencies already installed
)

REM Check if database exists
if not exist "backend\database\restaurant.db" (
    echo.
    echo  Setting up database...
    call npm run setup
    if errorlevel 1 (
        echo  Failed to setup database
        pause
        exit /b 1
    )
    echo  Database ready
) else (
    echo  Database already exists
)

REM Check if .env exists
if not exist ".env" (
    echo.
    echo  Creating environment file...
    copy .env.example .env
    echo  .env created (edit this file to change settings)
)

echo.
echo  Starting server...
echo  =====================================
echo.

REM Start the server
call npm start

pause
