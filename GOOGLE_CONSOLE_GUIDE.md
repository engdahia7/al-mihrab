# دليل رفع تطبيق «المحراب» على GitHub و Google Play Console و Google Search Console

تم تجهيز جميع الملفات التقنية والقانونية المطلوبة لرفع المشروع مباشرةً على **GitHub** ونشره على **Google Play Console** (كتطبيق أندرويد `.aab` عبر تقنية Trusted Web Activity - TWA) وكذلك توثيقه في **Google Search Console**.

---

## ١. الملفات الجاهزة في المشروع للنشر

| الملف | الوظيفة |
| :--- | :--- |
| `.gitignore` | استبعاد مجلدات البناء (`dist/`، `node_modules/`) ومفاتيح التوقيع السرية (`*.keystore`، `*.jks`) من الرفع على GitHub. |
| `.github/workflows/ci-deploy.yml` | فحص الكود تلقائياً، تشغيل الاختبارات (`npm test`)، وبناء ونشر نسخة الإنتاج على GitHub Pages. |
| `twa-manifest.json` | إعدادات حزمة أندرويد (`app.almihrab.twa`) لأداة Bubblewrap مع تفعيل تفويض الموقع الجغرافي (`locationDelegation`) والإشعارات. |
| `public/.well-known/assetlinks.json` | ملف التحقق من ملكية النطاق (**Digital Asset Links**) المطلوب من جوجل لتشغيل التطبيق بملء الشاشة بدون شريط عنوان المتصفح. |
| `public/privacy-policy.html` | صفحة **سياسة الخصوصية** الرسمية باللغتين العربية والإنجليزية المطلوبة إجبارياً في Google Play Console (خاصةً مع صلاحية الموقع الجغرافي `Geolocation`). |
| `public/sitemap.xml` و `public/robots.txt` | ملفات الفهرسة القياسية لإضافة الموقع في **Google Search Console**. |

---

## ٢. خطوات الدفع إلى GitHub ونشر رابط الويب (HTTPS)

يشترط متجر Google Play أن يكون تطبيق الويب التقدمي (PWA) منشوراً على نطاق يعمل ببروتوكول `HTTPS` (مثل GitHub Pages أو Vercel أو Netlify أو نطاقك الخاص):

```bash
git init
git branch -M main
git add .
git commit -m "chore: prepare Al-Mihrab v1.0.0 for GitHub & Google Console"
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
git push -u origin main
```

---

## ٣. تحويل التطبيق إلى حزمة أندرويد (`.aab`) لرفعه على Google Play Console

يمكنك توليد ملف **`.aab` (Android App Bundle)** بطريقتين رسميتين:

### الطريقة الأولى (الأسرع والأسهل — عبر PWABuilder):
1. بعد نشر الموقع على رابط `HTTPS`، افتح موقع [PWABuilder.com](https://www.pwabuilder.com) وأدخل رابط موقعك.
2. اضغط **Package for stores** ثم اختر **Android (Google Play)**.
3. اضبط المعرّف على `app.almihrab.twa`، وفعّل خيار **Location Delegation** (لتعمل بوصلة القبلة وتحديد الموقع بسلاسة داخل التطبيق).
4. حمّل الملف المضغوط؛ ستجد بداخله:
   - ملف **`app-release-bundle.aab`** الجاهز للرفع في Google Play Console.
   - ملف **`assetlinks.json`** ومفتاح التوقيع **`signing.keystore`** (احتفظ بمفتاح التوقيع في مكان آمن للتحديثات القادمة).

### الطريقة الثانية (عبر سطر الأوامر Bubblewrap CLI من داخل المشروع):
1. عدّل الرابط `al-mihrab.example.com` في ملف `twa-manifest.json` إلى رابط موقعك الفعلي.
2. نفّذ الأمرين:
   ```bash
   npm run twa:init
   npm run twa:build
   ```
3. سينتج ملف **`app-release-bundle.aab`** جاهزاً للرفع على Google Play Console.

---

## ٤. ربط شهادة SHA-256 (Digital Asset Links)

بعد رفع ملف `.aab` في حسابك على **Google Play Console**:
1. من القائمة الجانبية في Google Play Console اذهب إلى:
   **Setup (الإعداد) → App signing (توقيع التطبيق)**.
2. انسخ بصمة الشهادة **`SHA-256 certificate fingerprint`** الخاصة بـ *App signing key certificate*.
3. افتح ملف `public/.well-known/assetlinks.json` في مشروعك وضع البصمة مكان القيمة الافتراضية، ثم ارفع التعديل (`git push`).
4. بهذا يتأكد نظام أندرويد من ملكيتك للنطاق ويفتح تطبيق «المحراب» بملء الشاشة الكامل كتطبيق أندرويد أصيل.

---

## ٥. إجابات نماذج Google Play Console الجاهزة

عند إنشاء التطبيق في **Google Play Console → App content (محتوى التطبيق)**:

1. **Privacy Policy (سياسة الخصوصية)**:
   - ضع الرابط: `https://<YOUR_DOMAIN>/privacy-policy.html` (الصفحة مجهزة مسبقاً داخل المشروع باللغتين العربية والإنجليزية).
2. **Data Safety (أمان البيانات)**:
   - هل يجمع التطبيق أو يشارك بيانات المستخدمين لأطراف إعلانية؟ **لا (No)**.
   - الموقع الجغرافي التقريبي/الدقيق (**Location**): يُستخدم **محلياً ولحظياً داخل الجهاز (Ephemeral)** لغرض وظائف التطبيق الأساسية فقط (*App functionality*: حساب مواقيت الصلاة الفلكية واتجاه القبلة)، ولا يُباع أو يُشارك مع أي طرف ثالث.
3. **Ads (الإعلانات)**:
   - اختر: **No, my app does not contain ads** (التطبيق خالٍ تماماً من الإعلانات).
4. **Target Audience & Content Rating (الفئة العمرية)**:
   - التطبيق مرجعي/تعليمي مناسب لجميع الفئات العمرية (**Everyone / PEGI 3**).

---

## ٦. التسجيل في Google Search Console (لأرشفة محرك بحث جوجل)

1. افتح [Google Search Console](https://search.google.com/search-console) وأضف رابط موقعك (**URL Prefix**).
2. بعد التحقق من الملكية، اذهب إلى قسم **Sitemaps (ملفات Sitemap)** وأرسل المسار:
   `sitemap.xml`
3. حدّث الدومين في ملفي `public/sitemap.xml` و `public/robots.txt` ليطابق نطاقك الرسمي.
