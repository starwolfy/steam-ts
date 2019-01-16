@echo off
:startover
echo (%time%) App started.
call "C:\your-install-location\go.bat"
echo (%time%) WARNING: App closed or crashed, restarting.
goto startover
