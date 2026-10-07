# 🤍✨ Luna

A cozy, pixel-art study app built by **Çağan Sezer Karaman** for Hazal, starring her real cat **Luna**: a fluffy white cat with amber eyes. It helps her focus, see her progress every day and stay motivated on the way to **YKS 2027**, and later through university and KPSS.

Luna is a web app that installs like a native app (iPhone, iPad, Android, tablet). It needs no store and no account, works offline and updates itself in place. The app itself is in Turkish.

**Install link:** <https://cagansezerkaraman00-byte.github.io/Hazal-cal-sma-/>

## Install (one link, about 20 seconds)

Open the link on the phone. A full-screen guide appears and walks through it:

- **iPhone / iPad (Safari):** Share → *Add to Home Screen* → *Add*
- **Android (Chrome):** tap *Install* (or ⋮ → *Install app*)
- **Opened inside Instagram/WhatsApp?** The guide asks to open the link in Safari or Chrome first.

From then on Luna lives on the home screen with its own icon, opens full screen and works without internet. On first launch it asks once for notification permission, which is used for timer alerts and update notices.

## 2.1.4 — consolidated update

Geliştiren: **Çağan Sezer Karaman**.

This release combines expressive companions, contextual reminders, notification branding, the compact sleeping-family timer window, five decorative color themes selectable in Settings, and mobile layout fixes. Preferences remain saved. External mini windows require browser support and a user gesture; closed-app reminders still require additional push infrastructure.

Versions use one number that only goes up (2.1.7 → 2.2 → 2.3 …): installed apps offer an update only when the new top entry in `js/surum.js` is higher than theirs. Push work in progress freely; add a new entry once a batch is finished and tested, so Hazal sees one update per batch. `tests/version-order.test.cjs` fails if the list is out of order.

## Updates (like the App Store, without downloads)

- When a new version is published, Luna shows an **"Update ready"** card, a dot on the Settings tab, a notification and a badge on the app icon.
- One tap on **Update** loads the new version and restarts the app in place. Data, settings and a running timer stay exactly as they were.
- After updating, a **What's New** window shows the release notes; all past notes are in Settings → Updates.
- If Hazal isn't in the middle of something, the update can also install quietly the next time she leaves the app.

### Publishing a new version

1. Make the change and test it locally (`python3 -m http.server 8000`).
2. Add a new entry at the **top** of the list in `js/surum.js`: version (e.g. `2.2`), date, a short title and notes. The cache version comes from this file, so `sw.js` never needs editing.
3. Push to `claude/luna-study-app-1xt2uk` (the branch GitHub Pages publishes). Pages redeploys in a minute or two and every installed copy offers the update.

### When ÖSYM announces the exam date

Edit `sinav-tarihleri.json`: set `yks.tarih` to the official date and `kesin` to `true`, then push to the same branch. Every installed Luna updates its countdown and study plan automatically and shows a short notice. If Hazal picked her own date, hers is kept, and she can switch back to the official one with one tap.

## Features

**🌌 A living sky.** The sun and moon follow the real time and location (moon phase, rise and set included). There's a weather-aware scene with rain, snow and fog, plus real seasons, holidays (New Year, Ramadan and Kurban Bayramı, national days, Valentine's Day), constellations, shooting stars and fireflies. The header shows the time, date and sunrise/sunset.

**🐾 The cats.** Luna is drawn from her photo. She sits with Hazal while she studies, plays during breaks and sleeps at night. Each focus session earns a 🐟 to feed her. **Vesper** (a black cat with blue eyes) and the little yellow kitten **Güçlü** drop by now and then.

**🎯 Focus.**
- A minimal focus screen with a session goal line and a "something came to mind?" parking box.
- Pomodoro or free timer that stays accurate even if the app is closed.
- **Full focus:** leaving the app pauses the timer after 15 seconds. **Allowed apps** (ChatGPT, Gemini, YouTube, Spotify by default) don't stop it; on return Luna asks *"Where were you?"* and keeps counting.

**🗓️ YKS plan.**
- Field choice (SAY / EA / SÖZ / DİL), countdown, and topic tracking weighted by how many questions each topic gets in YKS (2018–2025 data, sources listed in the app).
- An automatic weekly program, and today's plan on the home screen with one-tap start.

**🎓 University, KPSS and master's modes.** Courses, weekly schedule, exam calendar, attendance, GPA, an automatic spaced-review plan and calendar export (.ics). YKS data is kept when switching.

**📝 Practice exams.** Nets are calculated automatically, with a progress chart, per-subject table and a weak-topic list.

**✍️ Session log.**
- After each session: what she studied, where it got hard, how many questions she solved, focus rating and mood.
- The hard parts go to a review list; today's solved questions show on the home screen.

**📚 Notes tab.**
- **Notes** (with drafts that survive closing the app) and **flashcards** (Leitner spaced repetition).
- **Library:** photos, PDFs and lesson videos per subject, with an in-app PDF viewer and video player. Files stay on the device, or optionally in Google Drive.
- **Mistakes:** a photo mistake notebook with spaced re-solving.
- **Sources:** article and book search with APA 7 / Vancouver / IEEE citations.

**📈 Progress.** Daily and hourly charts, subject balance, streaks, a 16-week star map, and Luna's encouraging weekly report.

**💌 Motivation.** Time-of-day messages, love notes from her partner (a secret note unlocks when the daily goal is reached), and 63 badges, each with a short note inside.

**🎧 Music.** Spotify playlists inside the app (optional account link), plus a rain, waves, fireplace and library ambience mixer.

**🎨 Look.** Light, dark or automatic theme (dark at sunset). Built for iPhone, Android and tablets, with safe areas, large touch targets and landscape support.

## Data

- Everything is saved automatically on the device as it's typed, and again when the app is closed or hidden. Nothing is lost on close, update or restart.
- Settings never reset. If stored data ever can't be read, it isn't wiped: a rescue copy is kept and offered for download.
- **Settings → Data → Backup / Import** moves everything to a new phone. Import can merge (nothing deleted) or replace.
- The installed app asks the browser for persistent storage so data isn't evicted.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

**Settings → 🔧 Diagnostics** shows the version, device, weather and Spotify status, connection tests and the last 20 errors.

## Hosting

The app is served by GitHub Pages from the app branch: **Settings → Pages → Deploy from a branch → `claude/luna-study-app-1xt2uk` / (root)**. Every push to that branch is published automatically; `.github/workflows/pages.yml` prints which branch Pages is serving and its latest build. If the app is later merged into `main`, switch the Pages branch to `main` and push releases there; the address stays the same, so installed copies keep working.

## App Store / Play Store

Luna already installs and updates like a store app, for free, from a single link. If store listings are wanted later, the same code can be packaged:
- **Play Store:** a Trusted Web Activity (Bubblewrap or PWABuilder); needs a Google Play developer account (one-time fee).
- **App Store:** a Capacitor wrapper; needs the Apple Developer Program (yearly fee) and Xcode.

## Files

| File | Purpose |
|---|---|
| `index.html`, `css/style.css` | Page structure and the starry design |
| `js/app.js` | UI and the glue between modules |
| `js/storage.js` | Local data, backup, import and merge |
| `js/scene.js`, `js/takvim.js`, `js/weather.js` | Sky, sun and moon math, seasons and holidays, weather (Open-Meteo) |
| `js/timer.js`, `js/stats.js` | Timer, statistics and Luna's report |
| `js/yks.js`, `js/plan.js`, `js/deneme.js` | YKS topics and weights, study plan, practice exams |
| `js/uni.js`, `js/uni-ui.js` | University / KPSS / master's mode |
| `js/notes.js` | Notes and flashcards |
| `js/depo.js`, `js/depo-ui.js`, `js/giris.js` | Library: device or Google Drive storage, PDF, photo and video viewer |
| `js/hata.js` | Mistake notebook |
| `js/kaynak.js`, `js/kaynak-ui.js` | Sources and citations |
| `js/badges.js`, `js/messages.js` | Badges and Luna's messages |
| `js/spotify.js`, `js/audio.js` | Spotify and sounds |
| `js/diag.js` | Diagnostics |
| `js/surum.js` | Version number and release notes |
| `js/guncelleme.js` | Update checks, What's New, install guide, notifications |
| `sinav-tarihleri.json` | Official exam dates that installed apps follow |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installing, offline mode and the app icon |
| `vendor/pdfjs/` | Mozilla PDF.js (Apache-2.0), loaded only when a PDF is opened |

---

Made with love by Çağan Sezer Karaman for Hazal. 🤍
