# Releasing EVtivity Mobile

The app version matches the EVtivity CSMS version it ships with: app v0.1.38
ships with CSMS v0.1.38. Tags use the same grammar and channels as the CSMS.

## Channels

| Channel | Tag                 | Use                                        | GitHub release         |
| ------- | ------------------- | ------------------------------------------ | ---------------------- |
| stable  | `v0.1.38`           | Production release                         | Release, Latest        |
| alpha   | `v0.1.39-alpha.N`   | A version whose features are still in work | Prerelease, not Latest |
| beta    | `v0.1.38-beta.N`    | A version whose features are frozen        | Prerelease, not Latest |
| nightly | `v0.1.38-nightly.N` | Test build of an alpha or beta             | Prerelease, not Latest |

The `.N` number is optional. `rc`, `preview`, other labels, and `+build`
metadata are refused. `scripts/release-version.sh` holds the grammar, and
`npm run test:release` tests it (CI runs it on every push).

## Branches

- `main` carries stable releases only.
- Prerelease work for an unreleased version lives on a release branch, the same
  branch name the CSMS uses for that version. Alpha, beta and nightly tags are
  cut from it.
- At the CSMS stable cut, merge the release branch into `main` (plain merge or
  fast-forward, never force), then cut the stable tag from `main`.

## Cutting a release

From a clean checkout of the branch to release:

```bash
npm ci
scripts/release.sh v0.1.38 --push            # stable, from main
scripts/release.sh v0.1.38-beta.1 --push     # prerelease, from the release branch
```

The version is required. The script:

1. Refuses an invalid tag, a dirty tree, an existing tag (it fetches tags from
   `origin` first), and a version that is not newer than the latest stable tag
   or the latest tag of its channel.
2. Sets the version in `package.json`, the root entries of `package-lock.json`,
   and `app.config.ts` (`RELEASE_VERSION` and `BUILD_NUMBER`).
3. Runs typecheck, lint, format check, unit tests, and the release script tests.
4. Commits `release: version X.Y.Z` and tags `vX.Y.Z`.
5. With `--push`, pushes the commit and the tag.

A failure before the commit restores every file it changed. Without `--push`
the commit and tag stay local; it prints the push command.

## Version and build number

`app.config.ts` holds the release version (`RELEASE_VERSION`, for example
`0.1.38-beta.1`) and the native build number (`BUILD_NUMBER`). The stores get:

- App version (iOS `CFBundleShortVersionString`, Android `versionName`): the
  `X.Y.Z` part, because App Store Connect accepts only numbers there.
- Build number (iOS `buildNumber`, Android `versionCode`):

  ```text
  major * 10000000 + minor * 100000 + patch * 1000 + ordinal
  ```

  | Tag                | Ordinal | Example                      |
  | ------------------ | ------- | ---------------------------- |
  | `vX.Y.Z-alpha`     | 0       | `v0.1.38-alpha` = 138000     |
  | `vX.Y.Z-alpha.N`   | 1 + N   | `v0.1.38-alpha.1` = 138002   |
  | `vX.Y.Z-beta`      | 300     | `v0.1.38-beta` = 138300      |
  | `vX.Y.Z-beta.N`    | 301 + N | `v0.1.38-beta.1` = 138302    |
  | `vX.Y.Z-nightly`   | 600     | `v0.1.38-nightly` = 138600   |
  | `vX.Y.Z-nightly.N` | 601 + N | `v0.1.38-nightly.7` = 138608 |
  | `vX.Y.Z`           | 999     | `v0.1.38` = 138999           |

  Limits: major up to 209, minor and patch up to 99, N up to 298. Android caps
  `versionCode` at 2100000000.

The build number follows semver order, so every newer tag gets a higher build
number. Two consequences:

- Within one version, a beta cut after a nightly has a lower build number than
  that nightly. Upload a nightly to TestFlight or Play testing only when no later
  beta of the same version will be uploaded.
- A hotfix for an older line would get a lower build number than the newest
  release, which the stores reject. `release.sh` refuses it. Ship a mobile fix as
  the next patch of the newest line.

The About screen shows the full release version next to the CSMS version.

EAS reads the version from `app.config.ts` (`appVersionSource: local`). The
production build profile has no `autoIncrement`: the build number comes from the
tag, and EAS cannot write to a dynamic `app.config.ts`.

## What a tag runs

Pushing a `v*` tag starts `.github/workflows/tag.yml`:

| Job              | Does                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `prepare`        | Validates the tag and checks the version files match it. Outputs `prerelease`, `channel`. |
| `test`           | Typecheck, lint, format check, unit tests, release script tests.                          |
| `build`          | Calls `build.yml`: Android release APK, unsigned iOS archive to verify the project.       |
| `github-release` | Creates the GitHub release with the APK attached and generated notes.                     |

A tag outside the grammar, or one pushed without `release.sh` (version files do
not match), fails in `prepare` and nothing is built or released.

Release notes come from Conventional Commits (`scripts/generate-changelog.sh`).
A stable release compares with the previous stable tag, so its notes cover every
change since the last stable release, prereleases included. A prerelease
compares with the previous tag of any kind (semver order:
`git -c versionsort.suffix=-`). Within a version, alpha sorts below beta and beta
below nightly.

Only `github-release` gets `contents: write`. Every other job reads.

The attached APK is a test build. It is not signed for store upload.

## Release notes: breaking changes first

After the release is created, edit its notes so they start with a
`## Breaking changes` section: every change since the previous stable release
that an operator or driver must act on, or that stops something that used to
work. Write `None.` when there are none. Mark breaking commits the Conventional
Commits way (`feat!: ...` or a `BREAKING CHANGE:` footer).

## Store submission

Store builds and submission stay manual. Run the `release` workflow from the
Actions tab on the release tag ("Use workflow from" > Tags > `vX.Y.Z`), or run
`npm run build:ios` and `npm run build:android` locally from the tag. Tags never
trigger it. See SETUP.md and WHITELABEL.md for signing and store credentials.
