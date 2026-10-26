#!/usr/bin/env bash
# ==============================================================================
# المحراب (Al-Mihrab) — سكربت بناء وتصدير ملف الأندرويد (.aab) لمتجر Google Play
# ==============================================================================
set -e

KEYSTORE_FILE="android.keystore"
KEY_ALIAS="almihrab-key"
KEYSTORE_PASS="${KEYSTORE_PASSWORD:-almihrab2026}"

echo "=================================================================="
echo "🕌 تجهيز وبناء حزمة أندرويد (.aab) لتطبيق «المحراب» (app.almihrab.twa)"
echo "=================================================================="

# ١. التحقق من وجود مفتاح التوقيع الرقمي أو إنشاؤه تلقائياً
if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "🔑 جاري توليد مفتاح توقيع أندرويد الرسمي ($KEYSTORE_FILE)..."
  keytool -genkeypair -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASS" \
    -keypass "$KEYSTORE_PASS" \
    -dname "CN=Al-Mihrab, OU=IslamicWaqf, O=AlMihrab, L=Makkah, S=Makkah, C=SA"
  echo "✅ تم إنشاء مفتاح التوقيع بنجاح: $KEYSTORE_FILE"
else
  echo "✅ مفتاح التوقيع موجود مسبقاً: $KEYSTORE_FILE"
fi

# ٢. استخراج بصمة الشهادة SHA-256 وتحديث ملف assetlinks.json
echo "🔍 استخراج بصمة SHA-256 لملف Digital Asset Links..."
SHA256_FINGERPRINT=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$KEYSTORE_PASS" | grep -i "SHA256:" | sed 's/.*SHA256: //g' | tr -d ' \r\n')

if [ -n "$SHA256_FINGERPRINT" ]; then
  echo "📌 بصمة SHA-256 الخاصة بمفتاح التوقيع:"
  echo "   $SHA256_FINGERPRINT"
  mkdir -p public/.well-known
  cat > public/.well-known/assetlinks.json <<EOF
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.query_webapk"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "app.almihrab.twa",
      "sha256_cert_fingerprints": [
        "$SHA256_FINGERPRINT"
      ]
    }
  }
]
EOF
  echo "✅ تم تحديث public/.well-known/assetlinks.json بالبصمة تلقائياً."
fi

# ٣. بناء نسخة الويب التقدمية للإنتاج
echo "📦 جاري بناء ملفات الإنتاج (npm run build)..."
npm run build

# ٤. توليد مشروع أندرويد وبناء حزمة app-release-bundle.aab عبر Bubblewrap
echo "🚀 جاري بناء ملف app-release-bundle.aab عبر @bubblewrap/cli..."
npx @bubblewrap/cli build --skipPwaValidation

echo "=================================================================="
echo "🎉 اكتمل البناء بنجاح!"
echo "📁 ملف Google Play الجاهز للرفع: ./app-release-bundle.aab"
echo "📁 ملف APK للتجربة المباشرة:    ./app-release-signed.apk"
echo "🔑 احتفظ بملف $KEYSTORE_FILE وكلمة المرور في مكان آمن للتحديثات القادمة."
echo "=================================================================="
