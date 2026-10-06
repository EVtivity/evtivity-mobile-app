#!/usr/bin/env bash
# Release tag helpers shared by scripts/release.sh and .github/workflows/tag.yml.
#
# Source this file; it defines functions only. The app version matches the
# EVtivity CSMS version it ships with, and the tags use the same grammar: `v`
# plus a semver 2.0.0 version (https://semver.org) in one of three channels:
# stable `v0.1.38`, alpha `v0.1.38-alpha.1` and beta `v0.1.38-beta.2` (the number
# is optional). No other prerelease label (nightly, rc, preview) is used, so this
# grammar rejects them, and tags outside it are never a changelog base. Build
# metadata (`+...`) is rejected too.
#
# Usage from a shell: bash scripts/release-version.sh <function> [args...]

RELEASE_NUM='(0|[1-9][0-9]*)'
RELEASE_STABLE_RE="^v${RELEASE_NUM}\\.${RELEASE_NUM}\\.${RELEASE_NUM}\$"
RELEASE_TAG_RE="^v${RELEASE_NUM}\\.${RELEASE_NUM}\\.${RELEASE_NUM}(-(alpha|beta)(\\.${RELEASE_NUM})?)?\$"

# Native build number limits (see release_build_number).
RELEASE_MAX_MAJOR=209
RELEASE_MAX_MINOR=99
RELEASE_MAX_PATCH=99
RELEASE_MAX_PRERELEASE_NUM=298

# Printed when a tag does not match the grammar.
RELEASE_TAG_HELP='Use v1.2.3 (stable), v1.2.3-alpha[.N] or v1.2.3-beta[.N]. The only prerelease channels are alpha and beta (no nightly, rc or preview, no +build metadata).'

# release_tag_is_valid <tag>: exit 0 when the tag is a stable, alpha or beta tag.
release_tag_is_valid() {
  [[ "${1:-}" =~ $RELEASE_TAG_RE ]]
}

# release_tag_is_prerelease <tag>: exit 0 when the tag is a valid prerelease tag.
release_tag_is_prerelease() {
  release_tag_is_valid "${1:-}" && ! [[ "$1" =~ $RELEASE_STABLE_RE ]]
}

# release_tag_channel <tag>: print the release channel: `stable`, `alpha` or
# `beta`. Exit 1 for an invalid tag.
release_tag_channel() {
  local tag="${1:-}" pre
  release_tag_is_valid "$tag" || return 1
  if ! release_tag_is_prerelease "$tag"; then
    echo stable
    return 0
  fi
  pre="${tag#*-}"
  echo "${pre%%.*}"
}

# release_marketing_version <tag>: print the X.Y.Z part of the tag (the iOS
# CFBundleShortVersionString and Android versionName). Exit 1 for an invalid tag.
release_marketing_version() {
  local tag="${1:-}" version
  release_tag_is_valid "$tag" || return 1
  version="${tag#v}"
  echo "${version%%-*}"
}

# release_build_number <tag>: print the native build number (iOS buildNumber and
# Android versionCode) of the tag:
#
#   major * 10000000 + minor * 100000 + patch * 1000 + ordinal
#
# The ordinal orders the channels the way semver does within one X.Y.Z:
#   alpha    0 (bare), 1 + N (alpha.N)
#   beta     300 (bare), 301 + N (beta.N)
#   stable   999
# So the build number of a newer tag is always higher. Limits: major <= 209,
# minor <= 99, patch <= 99, N <= 298 (Android caps versionCode at 2100000000).
# Exit 1 for an invalid tag or one outside the limits.
release_build_number() {
  local tag="${1:-}" marketing major minor patch channel pre num base ordinal
  release_tag_is_valid "$tag" || return 1
  marketing=$(release_marketing_version "$tag")
  major="${marketing%%.*}"
  minor="${marketing#*.}"
  minor="${minor%%.*}"
  patch="${marketing##*.}"
  if [ "$major" -gt "$RELEASE_MAX_MAJOR" ] || [ "$minor" -gt "$RELEASE_MAX_MINOR" ] ||
    [ "$patch" -gt "$RELEASE_MAX_PATCH" ]; then
    echo "$tag is outside the build number limits (major <= $RELEASE_MAX_MAJOR, minor and patch <= $RELEASE_MAX_PATCH)" >&2
    return 1
  fi
  channel=$(release_tag_channel "$tag")
  if [ "$channel" = stable ]; then
    ordinal=999
  else
    case "$channel" in
      alpha) base=0 ;;
      beta) base=300 ;;
    esac
    pre="${tag#*-}"
    if [ "$pre" = "$channel" ]; then
      ordinal=$base
    else
      num="${pre#*.}"
      if [ "$num" -gt "$RELEASE_MAX_PRERELEASE_NUM" ]; then
        echo "$tag is outside the build number limits (prerelease number <= $RELEASE_MAX_PRERELEASE_NUM)" >&2
        return 1
      fi
      ordinal=$((base + 1 + num))
    fi
  fi
  echo $((major * 10000000 + minor * 100000 + patch * 1000 + ordinal))
}

# release_is_newer <tag> <than>: exit 0 when <tag> has higher semver precedence
# than <than>. Both must be valid tags within the build number limits.
release_is_newer() {
  local a b
  a=$(release_build_number "${1:-}") || return 1
  b=$(release_build_number "${2:-}") || return 1
  [ "$a" -gt "$b" ]
}

# release_latest_stable_tag: print the highest stable tag in the repo (prereleases
# skipped), or nothing when there is none.
release_latest_stable_tag() {
  git tag -l 'v*' --sort=-v:refname | grep -E "$RELEASE_STABLE_RE" | sed -n '1p' || true
}

# release_latest_channel_tag <channel>: print the highest tag of the channel
# (stable, alpha or beta) in semver order, or nothing when there is none.
release_latest_channel_tag() {
  local channel="${1:?release_latest_channel_tag needs a channel}" tag
  while IFS= read -r tag; do
    if [ -n "$tag" ] && [ "$(release_tag_channel "$tag")" = "$channel" ]; then
      echo "$tag"
      return 0
    fi
  done < <(git -c versionsort.suffix=- tag -l 'v*' --sort=-v:refname | grep -E "$RELEASE_TAG_RE" || true)
}

# release_next_stable_tag <major|minor|patch>: print the next stable tag after the
# latest stable tag, or v0.1.0 when the repo has no stable tag.
release_next_stable_tag() {
  local bump="${1:-patch}" latest version major minor patch
  latest=$(release_latest_stable_tag)
  if [ -z "$latest" ]; then
    echo "v0.1.0"
    return 0
  fi
  version="${latest#v}"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"
  patch="${version##*.}"
  case "$bump" in
    major) echo "v$((major + 1)).0.0" ;;
    minor) echo "v${major}.$((minor + 1)).0" ;;
    patch) echo "v${major}.${minor}.$((patch + 1))" ;;
    *)
      echo "Unknown bump: $bump" >&2
      return 1
      ;;
  esac
}

# release_previous_tag <tag>: print the tag the changelog for <tag> starts from,
# or nothing for the first tag. <tag> must exist in the repo.
# A stable tag compares against the previous stable tag, so its notes cover every
# change since the last stable release, prereleases included. A prerelease
# compares against the previous tag of any kind, so its notes cover only what
# changed since the last build that was tested. Order is semver precedence:
# versionsort.suffix=- sorts v0.1.38-beta.1 before v0.1.38.
release_previous_tag() {
  local tag="${1:?release_previous_tag needs a tag}" tags
  tags=$(git -c versionsort.suffix=- tag -l 'v*' --sort=v:refname | grep -E "$RELEASE_TAG_RE" || true)
  if ! release_tag_is_prerelease "$tag"; then
    tags=$(printf '%s\n' "$tags" | grep -E "$RELEASE_STABLE_RE" || true)
  fi
  # The tag must exist (the release workflow runs on it). The first tag prints nothing.
  printf '%s\n' "$tags" | awk -v cur="$tag" '
    $0 == cur { found = 1; exit }
    { prev = $0 }
    END { if (found) print prev }
  '
}

# release_version_files: print the files release.sh changes before its release
# commit, relative to the repo root.
release_version_files() {
  local f
  for f in package.json package-lock.json app.config.ts; do
    if [ -f "$f" ]; then printf '%s\n' "$f"; fi
  done
}

# release_backup_version_files <dir>: copy the files of release_version_files into <dir>.
release_backup_version_files() {
  local dir="${1:?release_backup_version_files needs a directory}" f
  while IFS= read -r f; do
    mkdir -p "$dir/$(dirname "$f")"
    cp -p "$f" "$dir/$f"
  done < <(release_version_files)
}

# release_restore_version_files <dir>: put back every file saved by
# release_backup_version_files, so a failed release leaves no version bump behind.
release_restore_version_files() {
  local dir="${1:?release_restore_version_files needs a directory}" f
  while IFS= read -r f; do
    f="${f#"$dir"/}"
    mkdir -p "$(dirname "$f")"
    cp -p "$dir/$f" "$f"
  done < <(find "$dir" -type f)
}

# release_set_version <tag>: write the tag's version into package.json, the root
# entries of package-lock.json, and app.config.ts (RELEASE_VERSION and
# BUILD_NUMBER). Run from the repo root.
release_set_version() {
  local tag="${1:?release_set_version needs a tag}" build
  build=$(release_build_number "$tag") || return 1
  RELEASE_VERSION="${tag#v}" RELEASE_BUILD_NUMBER="$build" node -e '
    const fs = require("fs");
    const version = process.env.RELEASE_VERSION;
    const build = process.env.RELEASE_BUILD_NUMBER;
    const writeJson = (file, edit) => {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      edit(json);
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
    };
    writeJson("package.json", (pkg) => { pkg.version = version; });
    if (fs.existsSync("package-lock.json")) {
      writeJson("package-lock.json", (lock) => {
        lock.version = version;
        if (lock.packages && lock.packages[""]) lock.packages[""].version = version;
      });
    }
    let config = fs.readFileSync("app.config.ts", "utf8");
    const replace = (re, value, name) => {
      if (!re.test(config)) {
        console.error("app.config.ts has no " + name + " line");
        process.exit(1);
      }
      config = config.replace(re, value);
    };
    replace(/^const RELEASE_VERSION = .*;$/m, "const RELEASE_VERSION = \x27" + version + "\x27;", "RELEASE_VERSION");
    replace(/^const BUILD_NUMBER = .*;$/m, "const BUILD_NUMBER = " + build + ";", "BUILD_NUMBER");
    fs.writeFileSync("app.config.ts", config);
  '
}

# release_check_version_files <tag>: exit 0 when package.json, package-lock.json
# and app.config.ts carry the tag's version and build number. Prints each
# mismatch. Run from the repo root.
release_check_version_files() {
  local tag="${1:?release_check_version_files needs a tag}" build
  build=$(release_build_number "$tag") || return 1
  RELEASE_VERSION="${tag#v}" RELEASE_BUILD_NUMBER="$build" node -e '
    const fs = require("fs");
    const version = process.env.RELEASE_VERSION;
    const build = process.env.RELEASE_BUILD_NUMBER;
    const errors = [];
    const expect = (what, actual, expected) => {
      if (actual !== expected) errors.push(what + " is " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
    };
    expect("package.json version", JSON.parse(fs.readFileSync("package.json", "utf8")).version, version);
    if (fs.existsSync("package-lock.json")) {
      const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
      expect("package-lock.json version", lock.version, version);
      expect("package-lock.json packages[\"\"].version", lock.packages && lock.packages[""] && lock.packages[""].version, version);
    }
    const config = fs.readFileSync("app.config.ts", "utf8");
    const releaseVersion = (config.match(/^const RELEASE_VERSION = \x27([^\x27]*)\x27;$/m) || [])[1];
    const buildNumber = (config.match(/^const BUILD_NUMBER = (\d+);$/m) || [])[1];
    expect("app.config.ts RELEASE_VERSION", releaseVersion, version);
    expect("app.config.ts BUILD_NUMBER", buildNumber, build);
    for (const e of errors) console.error(e);
    process.exit(errors.length === 0 ? 0 : 1);
  '
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  set -euo pipefail
  fn="${1:?Usage: release-version.sh <function> [args...]}"
  shift
  case "$fn" in
    release_tag_is_valid | release_tag_is_prerelease | release_tag_channel | \
      release_marketing_version | release_build_number | release_is_newer | \
      release_latest_stable_tag | release_latest_channel_tag | release_next_stable_tag | \
      release_previous_tag | release_check_version_files) "$fn" "$@" ;;
    *)
      echo "Unknown function: $fn" >&2
      exit 1
      ;;
  esac
fi
