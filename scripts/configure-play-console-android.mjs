#!/usr/bin/env node
/**
 * Automatically patches the Capacitor Android project to satisfy all
 * Google Play Console requirements (Target SDK 36 / API 36, unique versionCode,
 * release signing config, R8 minification/deobfuscation mapping, RTL support,
 * optional hardware features, official launcher icons, and Native Android
 * Push Notification bridge for lock-screen & status-bar phone notifications).
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');

if (!fs.existsSync(androidDir)) {
  console.error('Error: android/ directory does not exist. Run "npx cap add android" first.');
  process.exit(1);
}

const runNumber = Number(process.env.GITHUB_RUN_NUMBER || '1');
const versionCode = Number(process.env.APP_VERSION_CODE || String(200 + runNumber));
const versionName = process.env.APP_VERSION_NAME || `2.6.${runNumber}`;
const keystorePath = process.env.KEYSTORE_FILE || path.join(rootDir, 'android.keystore');
const keystorePass = process.env.KEYSTORE_PASSWORD || 'HG97HDGpDRjL';
const keyAlias = process.env.KEY_ALIAS || 'almihrab-key';

console.log(`[Play Console Config] Configuring Android project:`);
console.log(`  - Package ID:       app.almihrab.twa`);
console.log(`  - Target SDK:       36 (API Level 36 - Android 16)`);
console.log(`  - Compile SDK:      36`);
console.log(`  - Min SDK:          24`);
console.log(`  - Version Code:     ${versionCode}`);
console.log(`  - Version Name:     ${versionName}`);

// 1. Patch android/variables.gradle for Target SDK 36 & Compile SDK 36
const variablesGradlePath = path.join(androidDir, 'variables.gradle');
if (fs.existsSync(variablesGradlePath)) {
  let varsContent = fs.readFileSync(variablesGradlePath, 'utf8');
  varsContent = varsContent
    .replace(/minSdkVersion\s*=\s*\d+/g, 'minSdkVersion = 24')
    .replace(/compileSdkVersion\s*=\s*\d+/g, 'compileSdkVersion = 36')
    .replace(/targetSdkVersion\s*=\s*\d+/g, 'targetSdkVersion = 36');
  fs.writeFileSync(variablesGradlePath, varsContent, 'utf8');
  console.log('[Play Console Config] Updated android/variables.gradle to SDK 36.');
}

// 2. Patch android/app/build.gradle for versionCode, versionName, targetSdk 36, Signing, and R8 Mapping
const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
  let buildGradle = fs.readFileSync(appBuildGradlePath, 'utf8');

  // Force compileSdk 36 and targetSdkVersion 36 explicitly as well
  buildGradle = buildGradle
    .replace(/compileSdk\s+rootProject\.ext\.compileSdkVersion/g, 'compileSdk 36')
    .replace(/compileSdkVersion\s+rootProject\.ext\.compileSdkVersion/g, 'compileSdkVersion 36')
    .replace(/targetSdkVersion\s+rootProject\.ext\.targetSdkVersion/g, 'targetSdkVersion 36')
    .replace(/targetSdk\s+rootProject\.ext\.targetSdkVersion/g, 'targetSdk 36')
    .replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/g, `versionName "${versionName}"`);

  // Inject release signingConfig and Play Console bundle block inside android { ... }
  const signingAndBundleBlock = `
    signingConfigs {
        release {
            storeFile file("${keystorePath.replace(/\\/g, '/')}")
            storePassword "${keystorePass}"
            keyAlias "${keyAlias}"
            keyPassword "${keystorePass}"
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }

    bundle {
        language {
            enableSplit = false
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
`;

  if (!buildGradle.includes('signingConfigs {')) {
    buildGradle = buildGradle.replace(
      /defaultConfig\s*\{/,
      `${signingAndBundleBlock}\n    defaultConfig {`
    );
  }

  // Update buildTypes.release to use signingConfigs.release & generate R8 mapping.txt for Play Console
  const releaseBuildTypeReplacement = `buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources false
            debuggable false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }`;

  buildGradle = buildGradle.replace(
    /buildTypes\s*\{\s*release\s*\{[\s\S]*?\}\s*\}/m,
    releaseBuildTypeReplacement
  );

  fs.writeFileSync(appBuildGradlePath, buildGradle, 'utf8');
  console.log('[Play Console Config] Updated android/app/build.gradle with API 36, release signing & R8 mapping.');
}

// 3. Patch android/gradle.properties to allow Compile SDK 36 without warnings
const gradlePropsPath = path.join(androidDir, 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  let gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
  gradleProps = gradleProps.replace(/android\.suppressUnsupportedCompileSdk=.*/g, '');
  gradleProps += '\nandroid.suppressUnsupportedCompileSdk=36,35\n';
  fs.writeFileSync(gradlePropsPath, gradleProps, 'utf8');
}

// 4. Patch android/app/src/main/AndroidManifest.xml for Google Play Console compliance
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  // Enable RTL layout support
  if (manifest.includes('android:supportsRtl="false"')) {
    manifest = manifest.replace('android:supportsRtl="false"', 'android:supportsRtl="true"');
  } else if (!manifest.includes('android:supportsRtl=')) {
    manifest = manifest.replace('<application', '<application android:supportsRtl="true"');
  }

  // Add Google Play Console compliant permissions & optional hardware features
  const permissionsBlock = `
    <!-- Permissions for Prayer Times, Qibla Compass & Adhan/Adhkar Notifications -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Optional hardware features so Google Play does not restrict tablet/device compatibility -->
    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.compass" android:required="false" />
    <uses-feature android:name="android.hardware.sensor.accelerometer" android:required="false" />
`;

  if (!manifest.includes('android.permission.ACCESS_FINE_LOCATION')) {
    manifest = manifest.replace('</manifest>', `${permissionsBlock}\n</manifest>`);
  }

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('[Play Console Config] Updated AndroidManifest.xml with permissions & optional hardware features.');
}

// 5. Patch MainActivity.java to provide Native Android Heads-Up & Lock-Screen Notifications Bridge
const mainActivityPath = path.join(
  androidDir,
  'app',
  'src',
  'main',
  'java',
  'app',
  'almihrab',
  'twa',
  'MainActivity.java'
);
if (fs.existsSync(mainActivityPath)) {
  const mainActivityJava = `package app.almihrab.twa;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "almihrab_push_channel";
    private static final String CHANNEL_NAME = "إشعارات المحراب والأذان";
    private static final int REQ_POST_NOTIFICATIONS = 1001;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<Runnable> scheduledRunnables = new ArrayList<>();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createMihrabNotificationChannel();
        requestNotificationPermissionIfNeeded();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new AndroidNativeNotificationsBridge(), "AndroidNativeNotifications");
        }
    }

    private void createMihrabNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("تنبيهات مواقيت الصلاة والأذان والأذكار اليومية من تطبيق المحراب");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 120, 250, 120, 350});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    REQ_POST_NOTIFICATIONS
                );
            }
        }
    }

    private void postNativeNotification(String title, String body, String tag) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        int notificationId = (tag != null && !tag.isEmpty()) ? Math.abs(tag.hashCode()) : (int) (System.currentTimeMillis() % 100000);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, notificationId, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title != null ? title : "المحراب")
            .setContentText(body != null ? body : "")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVibrate(new long[]{0, 250, 120, 250, 120, 350})
            .setContentIntent(pendingIntent);

        manager.notify(notificationId, builder.build());
    }

    public class AndroidNativeNotificationsBridge {
        @JavascriptInterface
        public boolean showNotification(final String title, final String body, final String tag) {
            mainHandler.post(() -> postNativeNotification(title, body, tag));
            return true;
        }

        @JavascriptInterface
        public boolean scheduleDelayedNotification(final String title, final String body, final String tag, final long delayMs) {
            if (delayMs <= 0) {
                mainHandler.post(() -> postNativeNotification(title, body, tag));
                return true;
            }
            Runnable task = () -> postNativeNotification(title, body, tag);
            synchronized (scheduledRunnables) {
                scheduledRunnables.add(task);
            }
            mainHandler.postDelayed(task, delayMs);
            return true;
        }

        @JavascriptInterface
        public void clearScheduledNotifications() {
            synchronized (scheduledRunnables) {
                for (Runnable task : scheduledRunnables) {
                    mainHandler.removeCallbacks(task);
                }
                scheduledRunnables.clear();
            }
        }

        @JavascriptInterface
        public boolean requestPermission() {
            mainHandler.post(() -> requestNotificationPermissionIfNeeded());
            return hasPermission();
        }

        @JavascriptInterface
        public boolean hasPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
            }
            return true;
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, mainActivityJava, 'utf8');
  console.log('[Play Console Config] Upgraded MainActivity.java with Native Android Push Notification Bridge.');
}

// 6. Patch android/app/proguard-rules.pro so R8 keeps @JavascriptInterface methods in Release AAB
const proguardPath = path.join(androidDir, 'app', 'proguard-rules.pro');
if (fs.existsSync(proguardPath)) {
  let proguard = fs.readFileSync(proguardPath, 'utf8');
  const keepRules = `
# Keep Al-Mihrab Native Android Push Notification JavascriptInterface for R8 release builds
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class app.almihrab.twa.** { *; }
`;
  if (!proguard.includes('AndroidNativeNotifications')) {
    proguard += `\n${keepRules}`;
    fs.writeFileSync(proguardPath, proguard, 'utf8');
    console.log('[Play Console Config] Added R8 keep rules for @JavascriptInterface in proguard-rules.pro.');
  }
}

// 7. Copy official Al-Mihrab 512x512 PNG icon into Android mipmap directories
const iconSource = path.join(rootDir, 'public', 'pwa-512x512.png');
const resDir = path.join(androidDir, 'app', 'src', 'main', 'res');
if (fs.existsSync(iconSource) && fs.existsSync(resDir)) {
  const mipmapDirs = [
    'mipmap-mdpi',
    'mipmap-hdpi',
    'mipmap-xhdpi',
    'mipmap-xxhdpi',
    'mipmap-xxxhdpi',
  ];
  for (const dir of mipmapDirs) {
    const targetDir = path.join(resDir, dir);
    if (fs.existsSync(targetDir)) {
      for (const file of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
        const dest = path.join(targetDir, file);
        fs.copyFileSync(iconSource, dest);
      }
    }
  }
  console.log('[Play Console Config] Installed official Al-Mihrab launcher icons across all mipmap densities.');
}
