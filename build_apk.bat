@echo off
echo ==============================================
echo ATLAS APK Builder Launcher
echo ==============================================
echo.
echo Checking prerequisites...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    echo After installation, restart your terminal or editor and run this script again.
    echo.
    pause
    exit /b
)

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Java (JDK) is not installed or not in PATH.
    echo You will need Java JDK installed to compile the APK via command line.
    echo.
)

echo Node.js is available. Proceeding...
echo.
echo 1. Installing dependencies (Capacitor core, CLI, etc.)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b
)

echo.
echo 2. Bundling web files into the 'www' directory...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Web build bundle failed.
    pause
    exit /b
)

echo.
echo 3. Initializing Android native project...
if not exist "android" (
    call npx cap add android
) else (
    echo Android folder already exists. Syncing updates...
)

echo.
echo 4. Syncing files to Android project...
call npx cap sync android

echo.
echo ==============================================
echo Web assets synced with Android native project!
echo ==============================================
echo.
echo Choose how you would like to compile the APK:
echo.
echo [1] Compile automatically with Gradle (requires Android SDK environment variables)
echo [2] Open project in Android Studio to build manually
echo.
set /p opt="Select build path (1 or 2): "

if "%opt%"=="1" (
    echo.
    echo Compiling debug APK using Gradle...
    if exist "android" (
        cd android
        call .\gradlew.bat assembleDebug
        if %errorlevel% neq 0 (
            echo.
            echo [ERROR] Gradle compilation failed.
            echo This is usually because ANDROID_HOME environment variable is not set or SDK is missing.
            echo Please try Option 2 (opening in Android Studio).
        ) else (
            echo.
            echo [SUCCESS] APK compiled successfully!
            echo APK Path: android\app\build\outputs\apk\debug\app-debug.apk
            explorer.exe app\build\outputs\apk\debug
        )
        cd ..
    ) else (
        echo [ERROR] Android project folder was not generated.
    )
) else (
    echo.
    echo Opening native project in Android Studio...
    echo In Android Studio, go to: Build - Build Bundle(s) / APK(s) - Build APK(s)
    call npx cap open android
)

echo.
echo Done.
pause
