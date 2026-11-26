#!/bin/sh
# Build the web app, sync it into the Android project and assemble a debug APK.
# Needs a JDK 21 and the Android SDK (platform 36, build-tools 36). Defaults match a Homebrew install:
#   brew install openjdk@21 && brew install --cask android-commandlinetools
#   sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
set -e
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
cd "$(dirname "$0")/.."

npm run build
npx cap sync android
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew assembleDebug --no-daemon)
echo "APK: $(pwd)/android/app/build/outputs/apk/debug/app-debug.apk"
