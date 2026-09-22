# Dockside — Track. Fix. Buy.

Product-shaped MVP for boat + trailer maintenance: **Track** schedules, **Guides** how-tos, and **Parts** shopping hooks. Monetize later with Pro.

Data stays in the browser via `localStorage` (`boatTrailerMaint.v1`). No backend or API keys.

## Stack

- Static files only: `public/index.html`, `public/styles.css`, `public/app.js`
- No build step
- Deployable on Vercel as a static site (set **Root Directory** to `public`)

## File tree

```
boat-maintenance-app/
├── README.md
├── vercel.json
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Run locally

Any static file server from the `public` folder:

```bash
cd public && python3 -m http.server 5173
# → http://localhost:5173
```

Or:

```bash
npx --yes serve public -p 5173
```

Opening `public/index.html` via `file://` usually works (`localStorage` is fine); a tiny HTTP server is still preferred on phones.

## Deploy on Vercel

1. Import the project (parent will handle git).
2. In Vercel project settings set **Root Directory** to `public`.
3. Framework: **Other**. Leave Build Command empty. Output Directory can stay default / empty when Root is `public`.
4. Deploy and open the URL on your phone. Optional: Share → Add to Home Screen.

`vercel.json` at the repo root adds `cleanUrls` and no-cache headers if you deploy from the repo root with Root Directory left as `.` — prefer Root Directory = `public` for the simplest static host.

## Features

| Screen | What it does |
|--------|----------------|
| **Track** | Stats + Overdue / Due soon (≤14 days) / Upcoming; one-tap **Done**; tap a task for detail |
| **Guides** | All how-tos from seeded tasks; filter Boat / Trailer; opens task detail focused on steps |
| **Parts** | Flat catalog of shop links grouped by asset; curated marine Amazon searches (`AMAZON_ASSOCIATE_TAG` when set) |
| **More** | Assets + Settings |
| **Task detail** | Schedule / last done / Mark done · How-to steps · Parts for this job with **Shop** |
| **Log completion** | Bottom sheet: date, optional hours/miles/cost/notes |
| **Add / Edit task** | Intervals, priority, category, last done |
| **Settings** | Reminders (browser), rename assets, meters, export/import JSON, reset seed |

Soft Pro teaser on Guides and Parts: “Pro unlocks full guide library + smarter parts picks — coming soon.”

### Default seed (first load)

**Boat (9):** Engine oil & filter · Lower unit / gearcase oil · Impeller / water pump · Fuel filter / water separator · Battery & connections · Zincs / anodes · Hull wash & wax · Winterize / dewinterize · Drain plugs check

**Trailer (8):** Hub bearings / grease · Tire pressure & tread · Lights & wiring · Winch & strap · Coupler / safety chains · Brakes (if applicable) · Leaf springs / suspension · Wheel bearings service

Each seeded task includes `steps[]` (DIY how-tos), torque/tools/warnings where relevant, and `parts[]` (`id`, `name`, `why`, Amazon search `url`). Intervals use `SCHEDULE_CATALOG` (typical OEM days/hours + human schedule labels). On load, `migrateData` refreshes guide bodies and **re-aligns `intervalDays` / `intervalHours`** from the catalog by title (does not reset `lastDoneAt`).

Last-done dates are staggered so the dashboard shows overdue, due-soon, and upcoming items on first open.

## Backup

Settings → **Export JSON**. **Import JSON** restores on the same or another browser (still local-only). Import runs the same steps/parts migration.

## Caveats

- Data is **per browser / device**. Clearing site data wipes it — export backups.
- No cloud sync (MVP by design).
- Day-based due dates drive the dashboard; optional hour intervals are stored for reference; logging hours/miles can update the asset meter.
- Shop buttons use curated marine Amazon search queries (gear-aware make/model when set).
- Affiliate-ready: set `AMAZON_ASSOCIATE_TAG` in `app.js` when Amazon Associates is approved; empty tag keeps clean search URLs (no empty `tag=`).
- Browser **Reminders** (opt-in): Notifications API nudges for overdue / due-soon jobs when the tab loads, becomes visible, or on a light interval while open. Defaults off; Gear / Settings → Reminders. No email/SMS/server push.
- Build id: `v1-oem-intervals` (see `BUILD` in `app.js`).
- Service intervals follow **typical OEM hours-or-calendar** patterns (Yamaha/Mercury/Honda-style when both apply). Always verify your engine/trailer service manual for year/model — Dockside does not claim exact OEM for your serial.

## License

Private personal use.
