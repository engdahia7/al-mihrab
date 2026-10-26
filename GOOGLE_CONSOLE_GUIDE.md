# دليل تصدير ملف `.aab` ورفع تطبيق «المحراب» على Google Play Console

تم تجهيز جميع الملفات البرمجية، البيانية، والسكربتات التلقائية لتصدير حزمة أندرويد الرسمية **`.aab` (Android App Bundle)** لمتجر **Google Play Console**، سواءً عبر حزمة الويب الموثوقة (**TWA / Bubblewrap**) أو الحزمة المستقلة الكاملة (**Capacitor Offline AAB**).

---

## ١. الملفات الجاهزة لتصدير `.aab` في المشروع

| الملف | الوظيفة |
| :--- | :--- |
| `twa-manifest.json` | إعدادات حزمة أندرويد (`app.almihrab.twa`) مضبوطة على الرابط الفعلي ومستوى `targetSdkVersion: 35` مع تفعيل الموقع الجغرافي والإشعارات والاختصارات. |
| `capacitor.config.json` | إعدادات بناء حزمة `.aab` المستقلة بالكامل (تتضمن ملفات `dist/` داخل التطبيق ليعمل أوفلاين من اللحظة الأولى). |
| `public/manifest.webmanifest` | ملف البيان القياسي للتطبيق المتوافق ١٠٠٪ مع فاحص PWABuilder و Bubblewrap. |
| `public/.well-known/assetlinks.json` | ملف التحقق من ملكية النطاق (**Digital Asset Links**) لإخفاء شريط المتصفح وتشغيل التطبيق بملء الشاشة. |
| `.github/workflows/build-android-aab.yml` | مسار بناء سحابي تلقائي على GitHub Actions يُولّد ملف `al-mihrab-release.aab` الموقّع ومفتاح `android.keystore` وملف `assetlinks.json` بضغطة زر بدون تثبيت Android Studio على جهازك. |
| `scripts/build-aab.sh` و `scripts/build-aab.bat` | سكربتات بناء محلية لأنظمة Linux/macOS و Windows لتوليد مفتاح التوقيع واستخراج بصمة SHA-256 وبناء ملف `.aab`. |
| `public/privacy-policy.html` | وثيقة **سياسة الخصوصية** الثنائية اللغة (عربي/إنجليزي) المطلوبة إجبارياً في Google Play Console. |

---

## ٢. طرق استخراج ملف `.aab` (اختر الطريقة الأنسب لك)

### الطريقة الأولى (الأسرع بدون أي برامج — عبر PWABuilder خلال دقيقة واحدة):
1. افتح موقع [PWABuilder.com](https://www.pwabuilder.com) وضع رابط التطبيق المنشور:
   `https://ais-pre-nju7hiufddutmvceng4hoc-487180125030.europe-west2.run.app`
2. اضغط **Package for stores** ثم اختر **Android (Google Play)**.
3. تأكد من أن معرف الحزمة هو `app.almihrab.twa` وفعّل خيار **Location Delegation** و **Notifications**.
4. اضغط **Download Package**؛ ستحصل على ملف مضغوط يحتوي على:
   - **`app-release-bundle.aab`** (ملف الرفع المباشر في Google Play Console).
   - **`signing.keystore`** و **`assetlinks.json`**.

---

### الطريقة الثانية (بناء `.aab` سحابياً عبر GitHub Actions بدون تثبيت Android SDK على جهازك):
1. ارفع المشروع إلى حسابك في GitHub.
2. من تبويب **Actions** في مستودعك على GitHub، اختر:
   **Build Android AAB Bundle (Google Play)**.
3. اضغط **Run workflow**؛ سيقوم الخادم السحابي بتثبيت Java 17 و Android SDK 35، وتوليد مفتاح التوقيع الرقمي، وبناء الحزمة الموقّعة.
4. بعد انتهاء العملية (حوالي دقيقتين)، حمّل الملف الجاهز **`al-mihrab-google-play-aab-bundle`** والذي يحتوي على:
   - `al-mihrab-release.aab`
   - `android.keystore`
   - `assetlinks.json` (مُحدّث ببصمة SHA-256 تلقائياً).

---

### الطريقة الثالثة (محلياً عبر سطر الأوامر CLI على جهازك):
إذا كان لديك Java JDK و Android SDK مثبتين على جهازك، نفّذ في مجلد المشروع:
- على **Linux / macOS**:
  ```bash
  npm run aab:build
  ```
- على **Windows**:
  ```cmd
  scripts\build-aab.bat
  ```

---

## ٣. ربط شهادة SHA-256 في `assetlinks.json`
بعد رفع ملف `.aab` إلى **Google Play Console**:
1. اذهب في لوحة تحكم جوجل بلاي إلى: **Setup (الإعداد) → App signing (توقيع التطبيق)**.
2. انسخ بصمة **`SHA-256 certificate fingerprint`** الخاصة بـ *App signing key certificate*.
3. ضع البصمة داخل `public/.well-known/assetlinks.json` (أو استخدم أداة التوليد داخل التطبيق في نافذة «تصدير ملف AAB»).
