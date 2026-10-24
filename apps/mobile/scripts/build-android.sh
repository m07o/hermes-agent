#!/usr/bin/env bash
# One-command local build of the Hermes Mobile Android app.
#
# Usage:
#   scripts/build-android.sh          # debug APK (installable)
#   scripts/build-android.sh release  # release APK + AAB (signed if
#                                     # android/keystore.properties exists)
#
# Prerequisites: Node 22+, a JDK 17+ on PATH, and the Android SDK
# (ANDROID_HOME set, or open the android/ folder in Android Studio once so it
# writes local.properties). Prints the exact output paths when done.
set -euo pipefail

cd "$(dirname "$0")/.."   # apps/mobile/
VARIANT="${1:-debug}"

command -v node >/dev/null 2>&1 || { echo "node not found" >&2; exit 1; }
command -v java >/dev/null 2>&1 || {
  echo "java not found. Install JDK 17+ (Android Studio bundles one)." >&2
  exit 1
}
if [ -z "${ANDROID_HOME:-}" ] && [ ! -f android/local.properties ]; then
  echo "Neither ANDROID_HOME nor android/local.properties is set." >&2
  echo "Install the Android SDK, or open android/ in Android Studio once." >&2
  exit 1
fi

echo "==> Building the web shell"
npm run build

echo "==> Syncing into the Android project"
npx cap sync android

echo "==> Gradle assemble$(echo "$VARIANT" | sed 's/.*/\u&/') + bundle (release only)"
cd android
if [ "$VARIANT" = "release" ]; then
  ./gradlew assembleRelease bundleRelease --stacktrace
else
  ./gradlew assembleDebug --stacktrace
fi

echo
echo "==> Outputs:"
if [ "$VARIANT" = "release" ]; then
  ls -l app/build/outputs/apk/release/ app/build/outputs/bundle/release/ || true
else
  ls -l app/build/outputs/apk/debug/ || true
fi
echo
echo "Install with:  adb install -r <apk path>   (or copy the APK to the phone)"
