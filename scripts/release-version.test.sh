#!/usr/bin/env bash
# Tests for scripts/release-version.sh. Runs against throwaway git repos.
# Usage: bash scripts/release-version.test.sh   (npm run test:release)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-version.sh
source "$SCRIPT_DIR/release-version.sh"

failures=0
passes=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    passes=$((passes + 1))
  else
    failures=$((failures + 1))
    echo "FAIL: $name: expected '$expected', got '$actual'"
  fi
}

status_of() {
  if "$@"; then echo yes; else echo no; fi
}

# Tag validation
for tag in v0.1.38 v1.0.0 v10.20.30 v0.1.38-beta.1 v0.1.38-beta v0.1.38-beta.0 \
  v0.1.38-beta.12 v0.1.39-alpha v0.1.39-alpha.3 v0.1.39-alpha.0; do
  check "valid $tag" yes "$(status_of release_tag_is_valid "$tag")"
done
# Only the stable, alpha and beta channels exist; other prerelease labels are refused,
# nightly included (CSMS owner decision 2026-10-06).
for tag in 0.1.38 v0.1 v0.1.38. v01.1.38 v0.01.38 v0.1.038 v0.1.38- v0.1.38-beta..1 \
  v0.1.38-01 v0.1.38+build.1 v0.1.38-beta+build "v0.1.38 " vfoo "" \
  v0.1.38-rc.1 v0.1.38-preview.2 v1.0.0-alphabet v0.1.38-betax.1 v0.1.38-beta.01 \
  v0.1.38-beta.1.2 v0.1.38-Beta.1 v0.1.38-nightly.1 v0.1.38-nightly v0.1.38-nightly-1 \
  v0.1.38-Alpha.1; do
  check "invalid '$tag'" no "$(status_of release_tag_is_valid "$tag")"
done

# Prerelease detection
check "stable not prerelease" no "$(status_of release_tag_is_prerelease v0.1.38)"
check "beta is prerelease" yes "$(status_of release_tag_is_prerelease v0.1.38-beta.1)"
check "alpha is prerelease" yes "$(status_of release_tag_is_prerelease v0.1.39-alpha.1)"
check "nightly is not a prerelease" no "$(status_of release_tag_is_prerelease v0.1.38-nightly.3)"
check "invalid not prerelease" no "$(status_of release_tag_is_prerelease v0.1-beta)"

# Release channel
check "stable channel" stable "$(release_tag_channel v0.1.38)"
check "beta channel" beta "$(release_tag_channel v0.1.38-beta.2)"
check "bare beta channel" beta "$(release_tag_channel v0.1.38-beta)"
check "bare alpha channel" alpha "$(release_tag_channel v0.1.39-alpha)"
check "nightly tag fails" no "$(status_of release_tag_channel v0.1.38-nightly.7)"
check "help names alpha and beta" yes \
  "$(status_of grep -q 'channels are alpha and beta' <<< "$RELEASE_TAG_HELP")"
check "alpha channel" alpha "$(release_tag_channel v0.1.39-alpha.1)"
check "invalid tag fails" no "$(status_of release_tag_channel v0.1-beta)"
check "rc tag fails" no "$(status_of release_tag_channel v0.1.38-rc.1)"

# Marketing version (the store app version)
check "marketing stable" 0.1.38 "$(release_marketing_version v0.1.38)"
check "marketing prerelease" 0.1.38 "$(release_marketing_version v0.1.38-beta.2)"
check "marketing invalid fails" no "$(status_of release_marketing_version v0.1.38-rc.1)"

# Native build number: major * 10000000 + minor * 100000 + patch * 1000 + ordinal
check "build stable" 138999 "$(release_build_number v0.1.38)"
check "build bare alpha" 138000 "$(release_build_number v0.1.38-alpha)"
check "build alpha.0" 138001 "$(release_build_number v0.1.38-alpha.0)"
check "build alpha.3" 138004 "$(release_build_number v0.1.38-alpha.3)"
check "build bare beta" 138300 "$(release_build_number v0.1.38-beta)"
check "build beta.2" 138303 "$(release_build_number v0.1.38-beta.2)"
check "build beta max" 138599 "$(release_build_number v0.1.38-beta.298)"
check "build nightly fails" no "$(status_of release_build_number v0.1.38-nightly.7)"
check "build first release" 100999 "$(release_build_number v0.1.0)"
check "build major" 12034999 "$(release_build_number v1.20.34)"
check "build max" 2099999999 "$(release_build_number v209.99.99)"
check "build major over limit" no "$(status_of release_build_number v210.0.0 2>/dev/null)"
check "build minor over limit" no "$(status_of release_build_number v0.100.0 2>/dev/null)"
check "build patch over limit" no "$(status_of release_build_number v0.1.100 2>/dev/null)"
check "build prerelease number over limit" no \
  "$(status_of release_build_number v0.1.38-beta.299 2>/dev/null)"
check "build invalid fails" no "$(status_of release_build_number v0.1.38-rc.1)"

# Build numbers follow semver precedence across the whole grammar.
ordered="v0.1.37 v0.1.38-alpha v0.1.38-alpha.0 v0.1.38-alpha.1 v0.1.38-alpha.298 \
v0.1.38-beta v0.1.38-beta.1 v0.1.38-beta.2 v0.1.38-beta.298 v0.1.38 v0.1.39-alpha.1 \
v0.2.0-beta.1 v0.2.0 v0.99.99 v1.0.0-beta v1.0.0"
prev=""
for tag in $ordered; do
  if [ -n "$prev" ]; then
    check "$tag newer than $prev" yes "$(status_of release_is_newer "$tag" "$prev")"
    check "$prev not newer than $tag" no "$(status_of release_is_newer "$prev" "$tag")"
  fi
  prev="$tag"
done
check "same tag not newer" no "$(status_of release_is_newer v0.1.38 v0.1.38)"
check "newer with invalid tag fails" no "$(status_of release_is_newer v0.1.38-rc.1 v0.1.37)"

# Tag ordering against a real repo
REPO=$(mktemp -d)
TREE=$(mktemp -d)
BACKUP=$(mktemp -d)
trap 'rm -rf "$REPO" "$TREE" "$BACKUP"' EXIT
cd "$REPO"
git init -q
git -c user.name=t -c user.email=t@t commit -q --allow-empty -m init

check "no tags: latest stable" "" "$(release_latest_stable_tag)"
check "no tags: latest beta" "" "$(release_latest_channel_tag beta)"
check "no tags: next patch" v0.1.0 "$(release_next_stable_tag patch)"

for tag in v0.1.9 v0.1.10 v0.1.37 v0.1.38-beta.1 v0.1.38-nightly.1 v0.1.38-nightly.2 \
  v0.1.38-beta.2 v0.1.38 v0.1.39-nightly.1 v0.1.39-alpha.1 v0.2.0-alpha.1 v0.2.0-beta.1 \
  v0.2.0-rc.1 v0.2.0-nightly.1 v0.1.38-beta.10 not-a-version; do
  git tag "$tag"
done

check "latest stable skips prereleases" v0.1.38 "$(release_latest_stable_tag)"
check "latest stable channel" v0.1.38 "$(release_latest_channel_tag stable)"
check "latest beta" v0.2.0-beta.1 "$(release_latest_channel_tag beta)"
check "latest nightly is nothing" "" "$(release_latest_channel_tag nightly)"
check "latest alpha" v0.2.0-alpha.1 "$(release_latest_channel_tag alpha)"
check "next patch" v0.1.39 "$(release_next_stable_tag patch)"
check "next minor" v0.2.0 "$(release_next_stable_tag minor)"
check "next major" v1.0.0 "$(release_next_stable_tag major)"
check "unknown bump fails" no "$(status_of release_next_stable_tag huge 2>/dev/null)"

check "stable prev is previous stable" v0.1.37 "$(release_previous_tag v0.1.38)"
check "stable prev uses numeric order" v0.1.9 "$(release_previous_tag v0.1.10)"
check "first stable has no prev" "" "$(release_previous_tag v0.1.9)"
check "prerelease prev is previous stable" v0.1.37 "$(release_previous_tag v0.1.38-beta.1)"
check "beta prev uses numeric order" v0.1.38-beta.2 "$(release_previous_tag v0.1.38-beta.10)"
# Nightly tags (refused since 2026-10-06) are never a changelog base.
check "beta prev is previous beta, nightly skipped" v0.1.38-beta.1 \
  "$(release_previous_tag v0.1.38-beta.2)"
check "nightly tag has no prev" "" "$(release_previous_tag v0.1.38-nightly.2)"
check "next-version prerelease prev skips nightly" v0.1.38 \
  "$(release_previous_tag v0.1.39-alpha.1)"
# alpha < beta within a version.
check "minor alpha prev is previous prerelease" v0.1.39-alpha.1 \
  "$(release_previous_tag v0.2.0-alpha.1)"
check "beta after alpha prev is the alpha" v0.2.0-alpha.1 \
  "$(release_previous_tag v0.2.0-beta.1)"

# Hotfix: an older stable release compares against its own predecessor, not the newest tag.
check "hotfix prev ignores newer tags" v0.1.10 "$(release_previous_tag v0.1.37)"

# Version files: backup and restore (a failed release leaves no bump behind),
# then set and check the version.
cd "$TREE"
cat >package.json <<'JSON'
{
  "name": "app",
  "version": "0.1.37"
}
JSON
cat >package-lock.json <<'JSON'
{
  "name": "app",
  "version": "0.1.37",
  "lockfileVersion": 3,
  "packages": {
    "": {
      "name": "app",
      "version": "0.1.37"
    },
    "node_modules/dep": {
      "version": "0.1.37"
    }
  }
}
JSON
cat >app.config.ts <<'TS'
const RELEASE_VERSION = '0.1.37';
const BUILD_NUMBER = 137999;
export default { version: RELEASE_VERSION, build: BUILD_NUMBER };
TS
check "version files listed" "package.json package-lock.json app.config.ts" \
  "$(release_version_files | tr '\n' ' ' | sed 's/ $//')"
release_backup_version_files "$BACKUP"
cp package.json package.json.orig
echo '{"version":"0.1.38"}' >package.json
echo 'changed' >app.config.ts
release_restore_version_files "$BACKUP"
check "package.json restored" "$(cat package.json.orig)" "$(cat package.json)"
check "app.config.ts restored" "const RELEASE_VERSION = '0.1.37';" "$(sed -n 1p app.config.ts)"
rm package.json.orig

check "versions match the current tag" yes "$(status_of release_check_version_files v0.1.37 2>/dev/null)"
check "versions do not match a new tag" no "$(status_of release_check_version_files v0.1.38-beta.1 2>/dev/null)"
release_set_version v0.1.38-beta.1
check "set: package.json" 0.1.38-beta.1 "$(node -p 'require("./package.json").version')"
check "set: lock version" 0.1.38-beta.1 "$(node -p 'require("./package-lock.json").version')"
check "set: lock root package" 0.1.38-beta.1 \
  "$(node -p 'require("./package-lock.json").packages[""].version')"
check "set: lock dependency untouched" 0.1.37 \
  "$(node -p 'require("./package-lock.json").packages["node_modules/dep"].version')"
check "set: app.config.ts version" "const RELEASE_VERSION = '0.1.38-beta.1';" "$(sed -n 1p app.config.ts)"
check "set: app.config.ts build number" "const BUILD_NUMBER = 138302;" "$(sed -n 2p app.config.ts)"
check "set: app.config.ts rest untouched" \
  "export default { version: RELEASE_VERSION, build: BUILD_NUMBER };" "$(sed -n 3p app.config.ts)"
check "set: versions match" yes "$(status_of release_check_version_files v0.1.38-beta.1)"
check "set: invalid tag fails" no "$(status_of release_set_version v0.1.38-rc.1)"
echo 'export default {};' >app.config.ts
check "set: missing constants fail" no "$(status_of release_set_version v0.1.38 2>/dev/null)"
cd "$REPO"

# Command-line entry point
check "cli valid" yes "$(status_of bash "$SCRIPT_DIR/release-version.sh" release_tag_is_valid v1.2.3-beta.1)"
check "cli rc invalid" no "$(status_of bash "$SCRIPT_DIR/release-version.sh" release_tag_is_valid v1.2.3-rc.1)"
check "cli prerelease" no \
  "$(status_of bash "$SCRIPT_DIR/release-version.sh" release_tag_is_prerelease v1.2.3)"
check "cli channel" beta "$(bash "$SCRIPT_DIR/release-version.sh" release_tag_channel v1.2.3-beta.4)"
check "cli nightly invalid" no \
  "$(status_of bash "$SCRIPT_DIR/release-version.sh" release_tag_is_valid v1.2.3-nightly.4)"
check "cli build number" 10203999 "$(bash "$SCRIPT_DIR/release-version.sh" release_build_number v1.2.3)"
check "cli previous" v0.1.37 "$(bash "$SCRIPT_DIR/release-version.sh" release_previous_tag v0.1.38)"
check "cli unknown function" no \
  "$(status_of bash "$SCRIPT_DIR/release-version.sh" release_set_version v1.2.3 2>/dev/null)"

echo "release-version: $passes passed, $failures failed"
[ "$failures" -eq 0 ]
