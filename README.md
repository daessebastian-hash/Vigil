# Vigil

A mobile-first fitness wearable companion app built around three daily scores: **Sleep**, **Recovery** and **Strain**. It follows the design language of WHOOP: a dark slate interface, ring gauges, recovery colour-coded green, yellow and red, blue strain on a 0–21 scale, and steel-blue sleep.

Vigil is an independent project. It is not affiliated with or endorsed by WHOOP, and it uses none of WHOOP's logos, wordmarks or assets.

There is no band to pair yet. The app runs on a **simulated member**: 120 days of physiology generated from a fixed seed, so the numbers are consistent and stay the same on every reload.

- Last night's sleep and HRV drive this morning's recovery.
- Recovery sets today's optimal strain range.
- Workouts build strain from time spent in each heart-rate zone.
- Today's strain and sleep debt set tonight's sleep need.

## Screens

| Screen | What's on it |
| --- | --- |
| **Home** | Sleep / Recovery / Strain dials, day switcher, Daily Outlook, today's activities, Health Monitor, Stress Monitor (0–3), steps and calories |
| **Recovery** | Recovery ring, HRV, resting HR, respiratory rate, SpO₂ and skin temp against 30-day baselines, coach insight, 1W/1M/3M trend |
| **Strain** | Strain ring with the optimal-strain band, all-day heart rate with workouts highlighted, HR zone breakdown, trend |
| **Sleep** | Performance ring, hours vs. need, hypnogram (Awake / REM / Light / SWS), stage breakdown, efficiency and consistency, sleep-need breakdown, Sleep Planner with adjustable wake time |
| **Activity** | Per-workout strain, HR curve coloured by zone, zones, calories, distance |
| **Start Activity → Live** | Live heart rate, zone, strain building in real time, pause/end, demo speed (1× / 10× / 60×) |
| **Add Activity** | Manual entry with type, start time, duration and effort, with a live strain estimate |
| **Health** | Health Monitor ranges, Healthspan ("Vigil Age" and pace of aging with contributing factors), 30-day HRV and RHR |
| **Coach** | Chat that answers questions about your sleep, recovery, training and bedtime from your data |
| **Community** | Team leaderboard by recovery, strain or sleep |
| **More / Journal** | Band status, units (metric/imperial), daily behaviour journal, demo reset |

Added activities, journal answers, units and in-progress live sessions are saved in `localStorage`.

## Run it

Requires Node 22.12 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # data-model unit tests
npm run build        # production build in dist/
npm run build:single # one self-contained dist-single/index.html
```

On a phone, open the deployed site and use **Add to Home Screen**. It runs full-screen with its own icon (manifest and iOS meta tags are included). On desktop it renders inside a phone frame.

The build uses relative paths and hash routing, so `dist/` can be served from any static host, including GitHub Pages under a sub-path.

## Project layout

```
src/
  data/        simulation and domain logic (no React)
    generate.ts    120-day seeded history: sleep, HRV/RHR, recovery, workouts, HR, stress
    physiology.ts  strain scale, HR zones, recovery zones, activity metrics, day totals
    insights.ts    baselines, health-monitor ranges, healthspan, sleep planner, coach replies
    live.ts        live-session clock and heart-rate simulation
  state/store.tsx  app state (selected day, user activities, journal, units, live session)
  components/      Ring, BarChart, LineChart, Hypnogram, TrendCard, shared UI
  screens/         one file per screen
  styles/global.css  design tokens and all styles
```

To connect a real device later, replace `generateHistory` with data from the device's API, mapped to the `Day` type in `src/data/types.ts`. The screens only read `Day` objects.
