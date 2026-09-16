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

The Windows installer for this version is `release/Purrductive Setup 0.6.0.exe` after packaging. Because this is a local development build and has no paid code-signing certificate, Windows SmartScreen may show an **Unknown publisher** warning.

### Your colors, your overview (0.6)

The dashboard has one overview box with five mini-cards: total active time, productive time, distractions, unsorted time, and focus score. The three category circles show a share of total active time; the focus circle excludes unsorted time. Empty days show no fabricated progress. The summary uses your selected date and device.

Open **Make it yours** to choose Cat café, Lavender dream, Candy shop, Ocean air, Matcha garden, Peach sunset, Midnight violet, or Graphite. Themes are saved on this device and apply to the dashboard and settings. The cat break screen keeps its high-contrast appearance.

Drag the floating quick-action bar by its grip to place it anywhere within the window. It offers themes, cat preview, summary navigation, and a reset position button. Keyboard users can focus the grip and use arrow keys to move it; Home restores the default position. Its position is saved locally and clamped to the screen when the window resizes. Motion respects the system's reduced-motion preference.

### The connected day (0.5)

- One activity workspace replaces the duplicate Activity / Attention Map widgets. Switch between **Day timeline**, **Apps**, and **Websites** with one date/device filter.
- Click an hour to narrow the timeline; click an activity for its title, duration, classification reason, and correction control. Overnight records are clipped to the selected day. Older sparse records are proportionally distributed over their observed span, not treated as continuously active.
- App reports use friendly Windows names and cached native icons when available. Sub-minute activity shows seconds rather than `0m`. Expand an app or website to inspect its latest eight entries.
- Pet the cat for reactions; enable its optional petting sound. Full-screen movement reminders now support mute and a five-minute snooze.
- Cloud sync shows failures and the last successful upload/download, retries every 30 seconds and on reconnection, uploads changed records in batches, and paginates long histories. Local activity remains authoritative on its recording laptop. The all-laptops total sums device usage and may overlap if two laptops are active at once.
- The production web build precaches its application files for offline use, and stores the last successfully fetched cloud history in that browser. Sign out on shared devices to clear cached cloud records.

Cloud connectivity is **not preconfigured**. No account, hosted URL, or database is bundled. See setup below; the mobile app is a read-only view of laptop history, not a phone screen-time collector.

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
4. Host the contents of `dist/` from `npm run build` over HTTPS. Enter that address as **Hosted companion URL** in desktop Settings and save. Scan its QR code on your phone, verify the displayed project, and sign in with the same account. The QR carries only public project settings, never credentials or session tokens. Alternatively, enter the public project settings manually on your phone.
5. Wait for **Cloud up to date** on the laptop before turning it off. The phone then reads previously uploaded history directly from the cloud; new data requires the laptop to reconnect. Add the companion to your phone home screen if your browser supports it.

For local phone testing, run `npm run dev:web` and open the computer's LAN address on the same Wi-Fi. This is a development preview only: it stops when the laptop stops and does not enable offline installation over ordinary HTTP. The production companion needs HTTPS. Enable the supplied row-level security policies before syncing real activity. Never enter a Supabase service-role or secret key in the client.

## Accuracy model

“Screen time” here means non-idle foreground-app time while Purrductive is running. Windows does not expose past foreground history, so no app can reconstruct time from before it was installed or while it was not running. Launch-at-login and frequent atomic checkpoints make everyday totals reliable across normal shutdowns.

Classification is intentionally conservative: uncertain activity stays **Unsorted** instead of being forced into a misleading score.
