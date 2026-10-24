#!/usr/bin/env bash
# Creates a release-signing keystore for the Hermes Mobile Android app and
# writes android/keystore.properties so `./gradlew assembleRelease` signs.
#
# Usage:
#   scripts/make-keystore.sh                 # prompts for passwords
#   STORE_PASSWORD=... KEY_PASSWORD=... scripts/make-keystore.sh
#
# The keystore and keystore.properties are gitignored — never commit them.
# For CI, base64 the .jks into the HERMES_MOBILE_KEYSTORE_B64 secret.
set -euo pipefail

cd "$(dirname "$0")/.."   # apps/mobile/
KEYSTORE="android/hermes-mobile.jks"
ALIAS="hermes-mobile"

if [ -f "$KEYSTORE" ]; then
  echo "Refusing to overwrite existing $KEYSTORE" >&2
  exit 1
fi

command -v keytool >/dev/null 2>&1 || {
  echo "keytool not found. Install a JDK 17+ (Android Studio ships one)." >&2
  exit 1
}

if [ -z "${STORE_PASSWORD:-}" ]; then
  read -r -s -p "Keystore password: " STORE_PASSWORD; echo
  read -r -s -p "Repeat password:     " STORE_PASSWORD2; echo
  [ "$STORE_PASSWORD" = "$STORE_PASSWORD2" ] || { echo "Passwords differ" >&2; exit 1; }
fi
KEY_PASSWORD="${KEY_PASSWORD:-$STORE_PASSWORD}"

keytool -genkeypair -v \
  -keystore "$KEYSTORE" -storetype PKCS12 -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10950 \
  -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" \
  -dname "CN=Hermes Mobile, OU=Nous Research, O=Nous Research, C=US"

cat > android/keystore.properties <<EOF
storeFile=hermes-mobile.jks
storePassword=$STORE_PASSWORD
keyAlias=$ALIAS
keyPassword=$KEY_PASSWORD
EOF
chmod 600 android/keystore.properties

echo
echo "Created $KEYSTORE and android/keystore.properties (both gitignored)."
echo "Signed release builds are now automatic:  ./gradlew assembleRelease"
echo "For CI:  base64 -w0 $KEYSTORE  ->  secret HERMES_MOBILE_KEYSTORE_B64"
echo "         plus HERMES_MOBILE_KEYSTORE_PASSWORD / KEY_ALIAS / KEY_PASSWORD"
