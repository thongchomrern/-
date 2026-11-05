@echo off
chcp 65001 > nul
title ហាងរចនាម៉ូតវាំងនន ប៉ោយប៉ែត - Web Server

echo =======================================================
echo   🚀 កំពុងដំណើរការ Web Server (ហាងរចនាម៉ូតវាំងនន ប៉ោយប៉ែត)
echo =======================================================
echo.
echo  👉 Website អតិថិជន: http://localhost:3000/index.html
echo  👉 ផ្ទាំងគ្រប់គ្រង Admin: http://localhost:3000/admin.html
echo.
echo  សូមកុំបិទផ្ទាំងនេះ នៅពេលកំពុងប្រើប្រាស់...
echo =======================================================
echo.

node server.js
pause
