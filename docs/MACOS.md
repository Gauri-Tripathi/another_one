# macOS port — 0.9.0 (awaiting Mac verification)

Targets MacBook Air/Pro, iMac and other Macs, with separate **arm64** (Apple Silicon) and **x64** (Intel) installers. Deployment target is macOS 13+. This is a desktop macOS port, not an iPhone/iPad native app or a Mac App Store submission. The existing hosted read-only companion remains available in mobile Safari.

## Current verification boundary

The JavaScript adapters, permission UI, platform branches and packaging configuration were implemented and tested on Windows. The Swift collector cannot be compiled or run against Apple's frameworks here. **No 0.9.0 DMG has been produced, signed, notarized or tested on a Mac yet.** The manual build workflow performs compilation and a basic native pipe smoke test; a human must still verify actual collection, permissions, sleep/lock behavior and overlays on Macs before public release.

## Build on a Mac

Install Node.js 22 and Xcode Command Line Tools (`xcode-select --install`). In this repository:

```sh
npm ci
npm run build:mac-helper
npm test
npm run dist:mac
```

`dist:mac` compiles the native helper for both architectures, combines its slices, builds the UI and packages each architecture as DMG and ZIP under `release/`. The helper is bundled outside ASAR in `Contents/Resources/mac/purrductive-foreground`, and listed for signing. Recipients do **not** need Node, Xcode, Swift or the repo. Use `npm run dev:mac` for development.

For an explicitly local-test/ad-hoc build without Developer ID credentials:

```sh
npm run build:mac-helper
npm run build
npx electron-builder --mac dmg zip --arm64 --x64 --publish never -c.mac.identity=- -c.mac.hardenedRuntime=false -c.mac.notarize=false
```

Ad-hoc signing is not notarization and does not make a build trusted for public distribution. Do not tell recipients to disable Gatekeeper or remove quarantine protections.

## Build without owning a Mac

After these changes are committed and pushed, open GitHub **Actions → Build macOS installers → Run workflow**. This workflow is manual-only; adding it does not publish a release or run a build automatically. Download the resulting workflow artifact, extract it, and choose the matching DMG. GitHub Actions usage may incur charges depending on the repository and account. [GitHub runner documentation](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).

For a signed, notarized run, choose `signed: true` and configure repository secrets:

- `MAC_CSC_LINK`: base64-encoded Developer ID Application certificate exported as P12.
- `MAC_CSC_KEY_PASSWORD`: that certificate's password.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`: notarization credentials.

Store credentials in GitHub Secrets, never source control or chat. The workflow fails if signed mode lacks credentials; it does not silently publish an unsigned build. There is no automatic GitHub Release publication. Configuration follows [electron-builder's v26 macOS options](https://www.electron.build/v26/docs/mac/).

## Installation and permissions

1. Open the appropriate DMG and move Purrductive to Applications before granting permissions.
2. Open the app, then use **Mac permissions → Open Accessibility settings**. Enable Purrductive in the OS permission panel. This is user-controlled; the app cannot grant itself access. In development, macOS may attribute access to Electron or the launching terminal/helper instead; use a consistently signed installed app for release validation.
3. Click **Recheck collector**, or fully quit/reopen if the OS retains an old permission decision. The UI distinguishes parent permission from the collector's reported access.
4. Allow notifications in macOS settings if you want scheduled reminder alerts. Focus/Do Not Disturb can suppress them.

Foreground app time works without Accessibility; titles and supported browser URLs need it. No Screen Recording permission, screenshots, keylogging or browser Apple Events are used. [Electron permission API](https://www.electronjs.org/docs/latest/api/system-preferences#systempreferencesistrustedaccessibilityclientprompt-macos).

The collector uses AppKit and read-only Accessibility APIs. Safari's window document URL is preferred; a bounded browser-toolbar lookup is the fallback. Page web areas are not traversed. Browser versions, localizations, protected windows and custom controls can make URLs unavailable. Identical-title windows in exactly the same position can be ambiguous; cross-app lookup matches are rejected. Never label website totals as exhaustive without real-device testing.

Closing the dashboard leaves the menu-bar tracker running. Dock activation reopens it; Cmd+Q quits. The break overlay is configured for all Spaces and fullscreen spaces; actual behavior in exclusive fullscreen apps needs testing. Login launch uses macOS login-item settings. AI keys use Electron safeStorage's OS-backed encryption; keys are not portable between OS accounts.

## Required release acceptance checks

- On both Apple Silicon and Intel: install DMG, launch normally, verify bundled helper runs without developer tools.
- Deny, grant, revoke and re-grant Accessibility; verify app-level fallback, accurate status and no fabricated titles/domains.
- Switch Safari/Chrome tabs and apps; compare a stopwatch session with totals, including sub-second switches, passive video, idle and display lock.
- Sleep and wake: no sleep-time accumulation; pause/resume; close dashboard and reopen from Dock/menu bar; quit and relaunch; verify history survives.
- Select all four cats, test purring/mute/snooze and overlay click-through on multiple displays, Spaces and fullscreen windows.
- Test reminder notifications and login launch; verify user settings survive an update.
- Verify AI consent, exclusions and key encryption; verify optional cloud sync against the precise-time schema.
- For distribution: verify Developer ID signatures for app/helper and notarization ticket on a clean Mac before sharing the release.
