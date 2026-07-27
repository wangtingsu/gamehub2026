@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM GameHub 开发环境启动脚本 (Windows版本)
REM 同时启动前端和后端开发服务器

title GameHub 开发环境

echo.
echo ========================================
echo     GameHub 开发环境启动脚本
echo ========================================
echo.

REM 颜色定义
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "DEL=%%a"
)

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM 检查命令是否存在
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%错误: Node.js 未找到，请先安装%NC%
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%错误: npm 未找到，请先安装%NC%
    pause
    exit /b 1
)

REM 检查目录是否存在
if not exist "backend\" (
    echo %RED%错误: backend 目录不存在%NC%
    pause
    exit /b 1
)

if not exist "frontend\" (
    echo %RED%错误: frontend 目录不存在%NC%
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "backend\node_modules\" (
    echo %YELLOW%警告: 后端依赖未安装，正在安装...%NC%
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules\" (
    echo %YELLOW%警告: 前端依赖未安装，正在安装...%NC%
    cd frontend
    call npm install
    cd ..
)

echo %BLUE%启动 GameHub 开发环境...%NC%
echo.

REM 启动后端服务器
echo %BLUE%启动后端服务器 (http://localhost:3000)...%NC%
start "GameHub Backend" cmd /c "cd /d backend && npm run dev && pause"
timeout /t 2 /nobreak >nul

REM 检查后端健康状态
echo %BLUE%检查后端服务器状态...%NC%
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/health' -TimeoutSec 3; echo %GREEN%后端服务器启动成功%NC% } catch { echo %YELLOW%后端服务器可能启动较慢，继续启动前端...%NC% }"
echo.

REM 启动前端服务器
echo %BLUE%启动前端开发服务器 (http://localhost:5173)...%NC%
start "GameHub Frontend" cmd /c "cd /d frontend && npm run dev && pause"
timeout /t 3 /nobreak >nul

echo.
echo %GREEN%GameHub 开发环境启动完成!%NC%
echo.
echo ========================================
echo     访问地址
echo ========================================
echo   前端: http://localhost:5173
echo   后端API: http://localhost:3000
echo   API文档: http://localhost:3000/api-docs
echo.
echo ========================================
echo     开发模式信息
echo ========================================
for /f "tokens=2 delims==" %%i in ('findstr "VITE_USE_MOCK" frontend\.env.development') do set "USE_MOCK=%%i"
if "!USE_MOCK!"=="true" (
    echo   前端当前使用: %YELLOW%Mock 模式%NC% (使用模拟数据)
) else (
    echo   前端当前使用: %GREEN%真实API模式%NC% (连接后端服务)
)
echo.
echo ========================================
echo     操作说明
echo ========================================
echo   1. 编辑 frontend\.env.development 修改开发模式
echo   2. 按 Ctrl+C 或关闭窗口停止服务
echo.
echo ========================================
echo.

REM 等待用户输入
echo 按任意键查看开发指南...
pause >nul

REM 显示开发指南
echo.
echo ========================================
echo     快速开发指南
echo ========================================
echo.
echo 1. 并行开发流程:
echo    - Mock模式: 前端使用模拟数据独立开发
echo    - 联调模式: 前后端同时运行，前端调用真实API
echo.
echo 2. API文档:
echo    - 访问 http://localhost:3000/api-docs
echo    - 查看所有API接口定义
echo.
echo 3. 切换开发模式:
echo    - 编辑 frontend\.env.development
echo    - 设置 VITE_USE_MOCK=true/false
echo    - 重启前端服务生效
echo.
echo 4. 常见问题:
echo    - 端口占用: 检查 3000 和 5173 端口
echo    - CORS错误: 检查后端 .env 中的 CORS_ORIGIN
echo    - API连接失败: 检查后端服务是否运行
echo.
echo ========================================
echo.

echo 按任意键退出...
pause >nul