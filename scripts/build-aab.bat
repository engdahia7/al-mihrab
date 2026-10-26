@echo off
chcp 65001 >nul
REM ==============================================================================
REM المحراب (Al-Mihrab) — سكربت بناء وتصدير ملف الأندرويد (.aab) على نظام Windows
REM ==============================================================================

set KEYSTORE_FILE=android.keystore
set KEY_ALIAS=almihrab-key
if "%KEYSTORE_PASSWORD%"=="" (set KEYSTORE_PASS=almihrab2026) else (set KEYSTORE_PASS=%KEYSTORE_PASSWORD%)

echo ==================================================================
echo تجهيز وبناء حزمة أندرويد (.aab) لتطبيق «المحراب» (app.almihrab.twa)
echo ==================================================================

if not exist "%KEYSTORE_FILE%" (
  echo جاري توليد مفتاح توقيع أندرويد الرسمي (%KEYSTORE_FILE%)...
  keytool -genkeypair -v -keystore "%KEYSTORE_FILE%" -alias "%KEY_ALIAS%" -keyalg RSA -keysize 2048 -validity 10000 -storepass "%KEYSTORE_PASS%" -keypass "%KEYSTORE_PASS%" -dname "CN=Al-Mihrab, OU=IslamicWaqf, O=AlMihrab, L=Makkah, S=Makkah, C=SA"
) else (
  echo مفتاح التوقيع موجود مسبقاً: %KEYSTORE_FILE%
)

echo.
echo بصمة SHA-256 الخاصة بمفتاح التوقيع:
keytool -list -v -keystore "%KEYSTORE_FILE%" -alias "%KEY_ALIAS%" -storepass "%KEYSTORE_PASS%" | findstr /C:"SHA256:"

echo.
echo جاري بناء ملفات الإنتاج (npm run build)...
call npm run build

echo.
echo جاري بناء ملف app-release-bundle.aab عبر Bubblewrap CLI...
call npx @bubblewrap/cli build --skipPwaValidation

echo ==================================================================
echo اكتمل البناء بنجاح!
echo ملف Google Play الجاهز للرفع: app-release-bundle.aab
echo ==================================================================
pause
