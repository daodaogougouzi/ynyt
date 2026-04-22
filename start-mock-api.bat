@echo off
setlocal
cd /d "%~dp0"
set "XJT_MOCK_API_PORT=3100"
set "XJT_PUBLIC_BASE_URL=http://127.0.0.1:3100"
start "mock-api" /min "D:\javaApp\nodejs\node.exe" "D:\javaApp\xiaojintong\mock-api\server.js"
echo mock-api 已启动: http://127.0.0.1:3100
endlocal
