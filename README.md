# expo-updates: a second Android release build embeds a stale `app.manifest`

A blank `create-expo-app` project (SDK 58) with `expo-updates` and `expo-asset` installed and nothing else.
`app.json` enables updates (`updates.url`, `runtimeVersion`, `checkAutomatically: "NEVER"`, so nothing is
fetched). `App.js` shows one picture, `assets/picture.png`. Under it, it prints the hash the JS bundle knows for the
picture and what `Asset.downloadAsync()` returns for it.

On Android, `createReleaseUpdatesResources` declares no input files. So when Gradle builds again over an earlier
build, the task stays UP-TO-DATE while React Native's bundle task bundles a changed asset under its new hash. The APK
then carries a JS bundle that asks for the new hash and an `app.manifest` that lists only the old one. The app cannot
load the asset: `<Image>` stays empty and `Asset.downloadAsync()` rejects. An app that waits for an asset before its
first render (fonts, a translation file) stays blank.

## Steps

An Android emulator or device must be attached. `-PreactNativeArchitectures=arm64-v8a` only saves time; drop it
or name your device's ABI.

```sh
npm install
npx expo prebuild -p android

# 1. First release build
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a)
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.example.expoupdatesstalemanifest/.MainActivity
# "first build", the picture, "downloadAsync: file:///…/ExponentAsset-97dae5a0….png"

# 2. Change the picture and one string, then build again over the first build
cp assets/icon.png assets/picture.png
sed -i.bak "s/'first build'/'second build'/" App.js && rm App.js.bak
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a)
#   > Task :app:createBundleReleaseJsAndAssets
#   > Task :app:createReleaseUpdatesResources UP-TO-DATE

# 3. The manifest's hash against the bundle's
unzip -o -q android/app/build/outputs/apk/release/app-release.apk assets/app.manifest assets/index.android.bundle -d /tmp/apk
md5 -q assets/picture.png                                     # cb975bba… (md5sum on Linux)
grep -o '"packagerHash":"[0-9a-f]*"' /tmp/apk/assets/app.manifest   # still 97dae5a0…, and the same "id" as build 1
strings /tmp/apk/assets/index.android.bundle | grep -c cb975bba2216ce10a60e6c0ffe9941a2   # 1: the bundle asks for the new hash

# 4. Run it
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.example.expoupdatesstalemanifest/.MainActivity
```

**Expected:** "second build", the new picture, `downloadAsync: file:///…/ExponentAsset-cb975bba….png`.

**Actual:** "second build" (the new bundle runs), an empty frame where the picture was, and `downloadAsync failed: Call
to function 'ExpoAsset.downloadAsync' has been rejected. → Caused by: Unable to download asset from url:` (the url is
empty).

`./gradlew :app:createReleaseUpdatesResources --rerun :app:assembleRelease`, or a clean build, gives the expected
result.

## Checking the fix

`fix-expo-updates-manifest-inputs.patch` declares the bundle task's outputs as the manifest task's input files. Apply
it, build once (the plugin changed, so the manifest is written again), then repeat step 2 with another change:

```sh
patch -p1 -d node_modules/expo-updates < fix-expo-updates-manifest-inputs.patch
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a)
cp assets/splash-icon.png assets/picture.png
sed -i.bak "s/'second build'/'third build'/" App.js && rm App.js.bak
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --info | grep -A2 "createReleaseUpdatesResources' is not up-to-date")
#   Input property 'embeddedBundle' file …/index.android.bundle has changed.
```

The manifest now lists the picture's current md5, and the app shows the picture.

## Screenshots

`screenshots/` holds steps 1, 4 and the fixed build on an Android 12 (API 31) emulator.
