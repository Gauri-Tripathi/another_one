# Purrductive

A Windows-first, local-first screen-time tracker with an opinionated orange movement coach.

## What works

- Samples the foreground app and window title every five seconds.
- Removes idle time, stores data every fifteen seconds, and flushes before lock, suspend, or quit.
- Sorts activity into productive, distracting, or unsorted with a visible confidence/reason.
- Learns from manual recategorization.
- Opens an always-on-top, full-screen, loudly purring cat after two hours of active sitting.
- Runs in the system tray and can launch with Windows.
- Can be paused/resumed from the dashboard or tray without losing the day.
- Exports the complete activity log to CSV and exposes its local backup.
- Lets you open any day in History to inspect its app breakdown.
- Builds as a responsive PWA; optional Supabase sync makes the dashboard available on a phone.

Purrductive does **not** capture screenshots or keystrokes. Window titles can contain private information, so mobile sync is off until you configure it.

## Run the desktop app

The ready-to-use Windows installer is `release/Purrductive Setup 0.4.0.exe`. Because this is a local development build and has no paid code-signing certificate, Windows SmartScreen may show an **Unknown publisher** warning.

### App and website usage (0.4)

The Apps / Websites report shows active time and distinct visits, with date filters, search, and sorting. A visit means a sampled return to active use, not an operating-system process launch. Changing a title or moving between pages on the same domain does not inflate counts. Returning after idle, pause, or an app restart begins another visit. Sampling runs every five seconds, so faster switches can be missed. Background playback (for example Spotify behind another app) does not count as screen time.

Website tracking reads the address bar of the foreground browser using Windows accessibility. Chrome, Edge, Brave, Firefox, Opera, Vivaldi, and Arc are attempted; browser version, language, accessibility settings, fullscreen mode, or permissions can make the address unavailable. In that case app time still counts and the Websites tab reports the limitation. Only the hostname is saved as website metadata, not the URL path or query. Existing window-title logging still applies. Website time is a subset of browser app time, not extra time.

Historical logs without visit IDs retain their time but show unknown/partial counts. New counts begin after updating. To sync these new fields to your phone, run `supabase/004_usage.sql` once in an existing Supabase project. New projects use the updated `schema.sql`.

Version 0.3 adds searchable, paginated activity with date/category filters and 25/50/90-minute focus timers. The Windows collector now reuses one hidden PowerShell process instead of launching and compiling a new bridge every five seconds. Lock/suspend events stop sampling, and resume resets the elapsed-time baseline. The mobile view starts empty until connected instead of displaying fabricated demo activity.

The focus timer measures wall-clock time (including time away); it does not change activity categories or send completion notifications. Tracking classifications are local heuristics, not AI judgments.

```powershell
npm install
npm run dev
```

The first-launch screen explains tracking. Close hides the app to the tray; use the tray menu to quit fully.

To make a Windows installer:

```powershell
npm run dist
```

## Enable phone sync

1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL editor.
3. In Purrductive → Settings, add the project URL and anon key, then create/sign into an account.
4. Deploy the web build (`npm run build`) to any static host, open it on your phone, add the same Supabase details in the web app’s **Settings**, and install it from the browser's **Add to Home Screen** action.

For local phone testing, run `npm run dev:web`, open the computer's LAN address on the phone, and install the PWA. A production host should use HTTPS.

## Accuracy model

“Screen time” here means non-idle foreground-app time while Purrductive is running. Windows does not expose past foreground history, so no app can reconstruct time from before it was installed or while it was not running. Launch-at-login and frequent atomic checkpoints make everyday totals reliable across normal shutdowns.

Classification is intentionally conservative: uncertain activity stays **Unsorted** instead of being forced into a misleading score.
