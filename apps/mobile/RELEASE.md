# Getting an installable build of Hermes Mobile

The app source lives in `apps/mobile/`. Turning it into an `.apk` you can put
on a phone requires an Android SDK + JDK + Gradle, which this repo's normal
development machine (and its CI shell-check job) does not have. There are
three supported routes, in order of convenience.

## Route 1 — GitHub Actions (no local toolchain)

Two workflows do the building. Both are **staged in `apps/mobile/ci/`** because
the branch that added them could not push into `.github/workflows/` (the push
token lacks the GitHub App `workflows` permission). Activate them once, from a
checkout with normal credentials, or with GitHub's web file editor (open the
file, edit, rename the path):

```bash
git mv apps/mobile/ci/mobile-android.yml .github/workflows/mobile-android.yml
git mv apps/mobile/ci/mobile-release.yml .github/workflows/mobile-release.yml
git commit -m "ci(mobile): activate the Android build workflows"
git push
```

| Workflow | Trigger | Output |
| --- | --- | --- |
| `mobile-android.yml` | push/PR touching `apps/mobile/**`, or manual run | debug APK artifact `hermes-mobile-debug-apk` (installable, 14-day retention) |
| `mobile-release.yml` | tag `mobile-v*`, or manual run | signed APK + AAB attached to a GitHub Release (90-day artifact retention) |

Download the APK from **Actions → workflow run → Artifacts**, or from the
Release page when using tags. Install with `adb install -r hermes-mobile-*.apk`
or by opening the file on the device (allow "install unknown apps").

## Route 2 — Tagged release with your own signing key

1. Create a keystore (once, keep it safe — updates must use the same key):

   ```bash
   apps/mobile/scripts/make-keystore.sh
   ```

   It writes `android/hermes-mobile.jks` + `android/keystore.properties`
   (both gitignored). Local `./gradlew assembleRelease` is signed from then on.

2. For CI signing, add four repository secrets:

   | Secret | Value |
   | --- | --- |
   | `HERMES_MOBILE_KEYSTORE_B64` | `base64 -w0 android/hermes-mobile.jks` |
   | `HERMES_MOBILE_KEYSTORE_PASSWORD` | store password |
   | `HERMES_MOBILE_KEY_ALIAS` | `hermes-mobile` (or your alias) |
   | `HERMES_MOBILE_KEY_PASSWORD` | key password |

3. Tag and push:

   ```bash
   git tag mobile-v0.1.0
   git push origin mobile-v0.1.0
   ```

   `mobile-release.yml` stamps `versionName=0.1.0` / `versionCode=100`
   (`X*10000 + Y*100 + Z`), builds, and publishes a GitHub Release with the
   APK, the AAB and SHA-256 sums. Without the secrets the outputs are
   unsigned and the release notes say so.

## Route 3 — Build on your own machine

Needs Node 22+, a JDK 17+, and the Android SDK (Android Studio installs both).

```bash
cd apps/mobile
scripts/build-android.sh          # debug APK
scripts/build-android.sh release  # signed release APK + AAB (if keystore exists)
```

The script builds the web shell, runs `cap sync android`, invokes Gradle and
prints the output paths (`android/app/build/outputs/…`).

## Versioning

`android/app/build.gradle` reads `HERMES_MOBILE_VERSION_NAME` /
`HERMES_MOBILE_VERSION_CODE` from the environment (CI sets them from the tag)
and falls back to `0.1.0` / `1` locally, so a release never requires editing
Gradle files by hand.
