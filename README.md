# Purrductive

A Windows-first, local-first screen-time tracker with an opinionated orange movement coach.

## What works

- Samples the foreground app and window title every five seconds.
- Removes idle time, stores data every fifteen seconds, and flushes before lock, suspend, or quit.
- Sorts activity into productive, distracting, or unsorted with a visible confidence/reason.
- Learns from manual recategorization.
- Opens an always-on-top, full-screen, loudly purring cat after two hours of active sitting.
- Runs in the system tray and can launch with Windows.
- Builds as a responsive PWA; optional Supabase sync makes the dashboard available on a phone.

Purrductive does **not** capture screenshots or keystrokes. Window titles can contain private information, so mobile sync is off until you configure it.

## Run the desktop app

The ready-to-use Windows installer is `release/Purrductive Setup 0.1.2.exe`. Because this is a local development build and has no paid code-signing certificate, Windows SmartScreen may show an **Unknown publisher** warning.

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
