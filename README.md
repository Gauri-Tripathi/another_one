# Purrductive

A local-first screen-time tracker with a choice of realistic feline movement coaches.

## 0.9 — macOS port (awaiting real-Mac verification)

Added a native Swift foreground/title/browser collector, Mac permission controls, Safari recognition, menu-bar/Dock behavior, Spaces-aware break overlays, and Apple Silicon + Intel DMG/ZIP build targets. Windows support is preserved. See [Mac build, signing and testing instructions](docs/MACOS.md). A manual GitHub Actions workflow can compile and package on a hosted Mac after you push these changes. No Mac installer has been built or live-tested from this Windows workspace; do not describe this port as release-verified yet. iPhone/iPad remain web-companion-only.

## 0.8 — timing, optional semantic recognition, realistic cats

- Foreground timing now uses a dedicated fast reader (~250 ms cadence); the slower address-bar reader runs separately. Fractional seconds remain attached to the app that actually occupied that sampled interval. No cross-app rounding carry. Monotonic duration survives wall-clock changes; pause, lock, sleep, failures and gaps over 3 seconds are not filled in. This is sampling, not exact OS/browser event recording: very fast switches can still be missed. Browser domains may arrive later than titles or remain unavailable; unknown website time stays at app level. Old inaccurate logs cannot be reconstructed.
- **Settings → Smart recognition** adds optional OpenAI semantic classification. Enter an API key in the app, describe your work/study context, opt in, then save settings. Without configuration the existing local rules remain active; the dashboard explicitly shows this. API billing/account access is separate from ChatGPT. No key is bundled, no live cloud-model accuracy test has been performed, and no browsing data was sent during development.
- Sends only app name, title (up to 300 characters), domain and your supplied work context. URLs/emails in titles are redacted best-effort; other sensitive title text can remain. Never sends screenshots, page bodies, keystrokes or raw address-bar paths/queries. Exclusions cover apps and domains/subdomains; unknown browser domains stay local so exclusions cannot silently be bypassed. Password-manager process names are excluded by default. Requests use `store:false`, not a promise of zero provider retention. Implementation follows the [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- Decisions below 0.75 model-reported confidence remain unsorted; confidence is an estimate, not a calibrated probability. Exact corrections and explicit rules always beat AI. Disabling recognition aborts in-flight work and discards late results. Failures retain local classification, with visible status and retry backoff.
- API key is encrypted through Electron `safeStorage` for the Windows account in `recognition-key.bin`, outside activity JSON, renderer snapshots, CSV and cloud sync. Remove it in Settings. Recognition is limited to contexts accumulating 3 seconds, 50 queued contexts, 500 cached contexts per run, one request at a time and at least 5 seconds between requests. Default limit: 100 requests per UTC day (including failures), not a currency cap; configure a provider billing budget too. Existing history is not bulk-uploaded for AI classification.
- **Focus & breaks** has four cats: Miso (silver longhair), Socks (tuxedo), Chai (Siamese), Marmalade (ginger). Choice persists and applies to the desktop break overlay. These are photorealistic transparent cutouts with breathing/nuzzle/bob and screen-travel animation, **not articulated realistic walking video**. Assets and exact built-in generation prompts: [public/cats/PROMPTS.md](public/cats/PROMPTS.md). Full UI/overlay visual behavior still needs live-device verification.
- **Existing Supabase users:** run [migration-008-precise-time.sql](supabase/migration-008-precise-time.sql) once before syncing this version. It changes `seconds` from integer to double precision without deleting history. Fresh projects use the updated schema. Local tracking continues if the cloud schema is outdated; sync reports the migration requirement.

Verification: 46 automated tests (including simulated cloud responses, consent, failures, fractional persistence and scheduler), production build, and 12 real fast Windows-reader samples. Cloud AI requires the user's key and subsequent real-use evaluation; automated mock tests do not establish semantic accuracy.

## What works

- Samples the foreground app and window title roughly every 250 ms, independently of browser lookups.
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

The Windows installer for this version is `release/Purrductive Setup 0.7.1.exe` after packaging. Because this is a local development build and has no paid code-signing certificate, Windows SmartScreen may show an **Unknown publisher** warning.

### Tracking integrity and sidebar navigation (0.7.1)

- Foreground samples are timestamped in the Windows collector before address-bar lookup. If the foreground window or its title changes during lookup, the ambiguous result is discarded instead of combining potentially unrelated context. Output from retired collector processes is ignored. This is still approximately two-second polling, not a lossless event log; very fast switches can be missed, and a title/URL that remains unchanged cannot reveal your intent.
- The timeline defaults to presentation-only sessions grouped by contiguous app, site, device, visit, and category. No stored rows are removed or their totals rewritten. **Inspect raw entries** reveals the original records. Session details offer individual entries for correction; titles and category names are visible in the list instead of only domains and colored dots.
- Selecting an hour clips both chart and entry-detail durations to that hour. Times include seconds. New exact corrections are website-scoped and update matching earlier automatic entries, without overwriting manual corrections. Old rules without a website no longer spill into known websites with the same title; existing manual records remain unchanged, and you can correct a new entry to teach its website-scoped context.
- Gossip gets an explicit entertainment signal; ambiguous words such as project/dashboard no longer imply productivity. Contradictory work and entertainment evidence remains unsorted. Use Settings → Recheck saved activity to revise old automatic labels; missing old time is not reconstructed.
- **Tracking diagnostics** reports stable/skipped samples, most recent observation, and read latency. These are since-launch diagnostics, not an accuracy percentage.
- **Reminders**, **Goals**, and **Focus & breaks** now have their own sidebar pages, leaving the main page focused on usage. Planner persistence and notification scheduling are unchanged.

### Better context, little reminders, a walking cat (0.7)

- Classification is more conservative: a tutorial on YouTube can be productive; generic Spotify, Discord, WhatsApp, or social-site use stays unsorted without clear context. Exact corrections no longer leak into unrelated titles through a shared word. These are explainable local heuristics, not an AI model.
- In **Settings → Teach the cat your context**, add exact app-process or website-domain rules, save, then use **Recheck saved activity** to apply the current classifier to non-manual history. Individual manual corrections always win and are preserved. This changes labels, not recorded timing.
- Sampling now attempts every two seconds, accrues elapsed time without rounding each poll upward, and attributes each observed interval to the previously active app. Minute/hour durations retain seconds. Switches inside a polling interval remain approximate, delayed reads can reduce resolution, and missing historical activity cannot be reconstructed.
- Enable **Count passive reading/video time while unlocked** if no-input reading/video should count. Default input-idle detection is retained otherwise. Passive mode cannot distinguish watching from being away: lock your laptop when leaving. Sleep, lock, pause, and unobserved long gaps do not count as usage.
- Reminders accept a title with an optional local date/time. Undated notes remain pinned until ticked; completed notes can be reopened. Scheduled notes request a Windows notification while the app runs, including in the tray. Missed deadlines are picked up on restart/unlock, and due notes stay on the dashboard regardless of OS notification delivery. Windows Do Not Disturb or notification settings can silence alerts. The app cannot notify while shut down.
- Goals support persistent manual step counts or a daily productive-minute target based on today's local laptop history (not the dashboard's selected date). Goals can be archived/restored. Reminders and goals are persisted in the local data file and its backup, but are **not yet cloud-synced**.
- Break scheduling has its own one-second timer, independent of foreground reads. It counts awake, unlocked laptop time—including no-input viewing—rather than claiming to detect physical sitting. Pause/lock stops it; resume from sleep starts a fresh interval. Break previews do not reset your countdown.
- The cat now blinks, breathes, swishes its tail, and walks in on articulated legs in a large transparent, always-on-top desktop overlay. Empty overlay space passes mouse input through; its message has movement acknowledgement, mute, and snooze controls. Use **Test desktop cat now** in Settings to check behavior on your Windows display. The illustration/overlay and OS notification delivery still require live-device visual testing; automated tests cover scheduler/IPC behavior with a simulated Electron environment.

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
