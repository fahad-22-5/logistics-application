@echo off
title Stopping Logistics Services

echo Stopping Frontend...
taskkill /FI "WINDOWTITLE eq Frontend" /T /F

echo Stopping Go API Backend...
taskkill /FI "WINDOWTITLE eq GoBackend" /T /F

echo Stopping .NET Simulator...
taskkill /FI "WINDOWTITLE eq LogisticsSim" /T /F

echo All services stopped.
pause
