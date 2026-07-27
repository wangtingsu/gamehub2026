@echo off
chcp 65001 >nul
echo ========================================
echo   GameHub Backend Production Server
echo ========================================
echo.

:: 设置工作目录
cd /d "%~dp0"

:: 检查 dist 目录
if not exist "dist\index.js" (
    echo [构建] 未找到 dist/index.js，正在编译...
    call npx tsc
    if %errorlevel% neq 0 (
        echo [错误] TypeScript 编译失败！
        pause
        exit /b 1
    )
    echo [构建] 编译完成
)

:: 检查端口占用
netstat -ano | findstr ":3001" | findstr LISTEN >nul
if %errorlevel% equ 0 (
    echo [警告] 端口 3001 已被占用，尝试停止旧进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr LISTEN') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo [启动] 正在启动生产服务器...
echo [环境] %NODE_ENV%
echo [端口] 3001
echo.

:: 启动生产服务器
title GameHub Backend (Production) - Port 3001
node dist/index.js

pause
