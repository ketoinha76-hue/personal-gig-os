@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%
echo JAVA_HOME = %JAVA_HOME%
echo Java version:
java -version
echo.
echo Building APK...
call gradlew.bat assembleDebug
echo.
if %ERRORLEVEL% == 0 (
  echo BUILD SUCCESSFUL!
  echo APK file: app\build\outputs\apk\debug\app-debug.apk
  start "" "app\build\outputs\apk\debug"
) else (
  echo BUILD FAILED! Check the error above.
)
pause
