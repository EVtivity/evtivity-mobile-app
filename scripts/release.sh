#!/usr/bin/env bash
set -euo pipefail

# Cut a release of the mobile app.
#
# Usage:
#   scripts/release.sh v0.1.38                  # Bump, check, commit and tag locally
#   scripts/release.sh v0.1.38 --push           # Same, then push the commit and the tag
#   scripts/release.sh v0.1.38-beta.1 --push    # Prerelease: alpha or beta only
#   scripts/release.sh v0.1.38-beta.1 --push --branch v0138   # From a detached HEAD
#
# A stable release pushes its commit to main and a prerelease to its release
# branch (the checked-out branch, or --branch), so a release can be cut from a
# detached worktree. The push is `HEAD:refs/heads/<branch>` plus the tag, and
# git refuses it when the branch moved on origin (no force).
#
# The version is required and equals the EVtivity CSMS version the app ships
# with. Tag grammar and build number formula: scripts/release-version.sh and
# RELEASE.md. The script refuses a dirty tree, an existing tag, and a version
# that is not newer than the latest stable tag or the latest tag of its channel.
#
# It bumps package.json, the root entries of package-lock.json, and app.config.ts
# (RELEASE_VERSION and BUILD_NUMBER), runs typecheck, lint, format check, unit
# tests and release script tests, commits `release: version X.Y.Z` (a
# prerelease commits `release: prepare X.Y.Z`, the base version) and tags the
# full version. Any failure before the commit restores every file it changed.
# Pushing the tag starts the tag workflow (.github/workflows/tag.yml).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=release-version.sh
source "$SCRIPT_DIR/release-version.sh"

PUSH=false
TAG=""
BRANCH_ARG=""
USAGE="Usage: scripts/release.sh vX.Y.Z[-alpha[.N]|-beta[.N]] [--push] [--branch <release branch>]"

while [ $# -gt 0 ]; do
  case "$1" in
    --push) PUSH=true ;;
    --branch)
      if [ $# -lt 2 ] || [ -z "$2" ]; then
        echo "Error: --branch needs a branch name."
        exit 1
      fi
      BRANCH_ARG="$2"
      shift
      ;;
    --branch=*) BRANCH_ARG="${1#--branch=}" ;;
    v[0-9]*)
      if [ -n "$TAG" ]; then
        echo "Error: pass one version."
        exit 1
      fi
      TAG="$1"
      ;;
    *)
      echo "Unknown argument: $1"
      echo "$USAGE"
      exit 1
      ;;
  esac
  shift
done

if [ -z "$TAG" ]; then
  echo "Error: pass the version to release, the CSMS version it ships with (e.g. v0.1.38)."
  exit 1
fi
if ! release_tag_is_valid "$TAG"; then
  echo "Error: invalid version $TAG. $RELEASE_TAG_HELP"
  exit 1
fi
if ! BUILD_NUMBER=$(release_build_number "$TAG"); then
  exit 1
fi
VERSION="${TAG#v}"
CHANNEL=$(release_tag_channel "$TAG")

cd "$(git rev-parse --show-toplevel)"

# The branch the release commit goes to: main for a stable release, the release
# branch for a prerelease. Checked before anything changes.
CURRENT_BRANCH=$(git symbolic-ref -q --short HEAD || true)
if ! PUSH_BRANCH=$(release_push_branch "$TAG" "${BRANCH_ARG:-$CURRENT_BRANCH}"); then
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: the working tree has uncommitted changes. Commit or remove them first."
  git status --short
  exit 1
fi

# Compare against every published tag, not only the local ones.
if git remote get-url origin >/dev/null 2>&1; then
  if ! git fetch --quiet --tags origin; then
    echo "Error: could not fetch tags from origin."
    exit 1
  fi
fi

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Error: tag $TAG already exists. Release tags are never moved or reused."
  exit 1
fi

# Store build numbers must increase, so a release is newer than the latest
# stable tag and than the latest tag of its own channel.
LATEST_STABLE=$(release_latest_stable_tag)
if [ -n "$LATEST_STABLE" ] && ! release_is_newer "$TAG" "$LATEST_STABLE"; then
  echo "Error: $TAG is not newer than the latest stable tag $LATEST_STABLE."
  exit 1
fi
LATEST_CHANNEL=$(release_latest_channel_tag "$CHANNEL")
if [ -n "$LATEST_CHANNEL" ] && ! release_is_newer "$TAG" "$LATEST_CHANNEL"; then
  echo "Error: $TAG is not newer than the latest $CHANNEL tag $LATEST_CHANNEL."
  exit 1
fi

echo "Tag:          $TAG"
echo "Channel:      $CHANNEL"
echo "App version:  $(release_marketing_version "$TAG") (full: $VERSION)"
echo "Build number: $BUILD_NUMBER (iOS buildNumber, Android versionCode)"
echo "Branch:       $PUSH_BRANCH"
echo ""

# Save the files the release changes. Any failure before the release commit
# puts them back, so a failed release leaves no version bump in the tree.
BACKUP_DIR=$(mktemp -d)
RELEASE_COMMITTED=false
release_cleanup() {
  local status=$?
  if [ "$status" -ne 0 ] && [ "$RELEASE_COMMITTED" = false ]; then
    echo ""
    echo "Release failed: restoring package.json, package-lock.json and app.config.ts."
    release_restore_version_files "$BACKUP_DIR"
  fi
  rm -rf "$BACKUP_DIR"
}
trap release_cleanup EXIT
release_backup_version_files "$BACKUP_DIR"

echo "Setting the version to $VERSION..."
release_set_version "$TAG"
release_check_version_files "$TAG"
echo ""

run_check() {
  local name="$1"
  shift
  echo "--- $name"
  if ! "$@"; then
    echo ""
    echo "$name failed. Fix it before releasing."
    exit 1
  fi
  echo ""
}

run_check "Typecheck" npm run typecheck
run_check "Lint" npm run lint
run_check "Format check" npm run format:check
run_check "Unit tests" env CI=true npm test
run_check "Release script tests" npm run test:release

# Commit messages never name a prerelease channel: a prerelease commit names
# its base version, the tag and the GitHub release carry the rest.
if release_tag_is_prerelease "$TAG"; then
  RELEASE_SUBJECT="release: prepare ${VERSION%%-*}"
else
  RELEASE_SUBJECT="release: version $VERSION"
fi

git add package.json package-lock.json app.config.ts
git commit -m "$RELEASE_SUBJECT"
RELEASE_COMMITTED=true
git tag "$TAG"
echo ""
echo "Committed $RELEASE_SUBJECT and tagged $TAG."

if [ "$PUSH" = false ]; then
  echo ""
  echo "Not pushed. To publish: git push origin HEAD:refs/heads/$PUSH_BRANCH refs/tags/$TAG"
  echo "To discard instead: git tag -d $TAG && git reset --hard HEAD~1"
  exit 0
fi

git push origin "HEAD:refs/heads/$PUSH_BRANCH" "refs/tags/$TAG"
echo ""
echo "Pushed the release commit to $PUSH_BRANCH and $TAG. The tag workflow builds the app and creates the GitHub release."
if release_tag_is_prerelease "$TAG"; then
  echo "Prerelease: the GitHub release is marked as a prerelease and never as Latest."
fi
echo "Store submission stays manual: run the release workflow from the Actions tab."
