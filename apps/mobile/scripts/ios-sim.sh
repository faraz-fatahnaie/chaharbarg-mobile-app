#!/bin/sh
# Build the web app, sync it into the iOS project, then build, install and launch it in the iOS Simulator.
# Needs Xcode plus an iOS Simulator runtime (Xcode > Settings > Components, or `xcodebuild -downloadPlatform iOS`).
set -e
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
cd "$(dirname "$0")/.."

npm run build
npx cap sync ios

DEVICE=$(xcrun simctl list devices available | grep -m1 iPhone | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
[ -n "$DEVICE" ] || { echo "No iPhone simulator found: install an iOS Simulator runtime first."; exit 1; }
xcrun simctl boot "$DEVICE" 2>/dev/null || true

xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -destination "id=$DEVICE" \
  CODE_SIGNING_ALLOWED=NO -derivedDataPath build/ios build | tail -3
xcrun simctl install "$DEVICE" build/ios/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$DEVICE" app.chaharbarg.game
open -a Simulator 2>/dev/null || true # not present in every Xcode layout; the app runs headless anyway
sleep 4
# multi-display devices (e.g. "iPhone Duo") render the app on display 1; the default display can be black
xcrun simctl io "$DEVICE" screenshot --display=1 build/ios/launch.png && echo "screenshot: build/ios/launch.png"
