@echo off
chcp 65001 >nul 2>&1
title 医学求职助手
color 0A

echo.
echo  ========================================
echo      医学求职助手 正在启动...
echo  ========================================
echo.

echo  [1/4] 清理残留进程...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

cd /d "C:\Users\jiuji\OneDrive\5.Claude project\resume-tailor"
if not exist "package.json" (
    echo.
    echo  错误：找不到项目文件夹！
    echo  请确认路径正确
    echo.
    pause
    exit /b 1
)

echo  [2/4] 清除旧缓存...
if exist ".next" rd /s /q ".next" >nul 2>&1

echo  [3/4] 准备打开浏览器...
start "" cmd /c "timeout /t 10 /nobreak >nul && start http://localhost:3000"

echo  [4/4] 启动应用服务...
echo.
echo  ========================================
echo   启动完成后，浏览器会自动打开
echo   如果没有自动打开，请手动访问:
echo   http://localhost:3000
echo.
echo   关闭此窗口即可停止应用
echo  ========================================
echo.

npm run dev