@echo off
rem Usage: preview 312 [marketing]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preview-pr.ps1" %*
