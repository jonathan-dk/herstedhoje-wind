# 🪂 Herstedhøje Wind — Paragliding Training Map

En lille React-app der viser live-vindforhold på **Herstedhøje** (Albertslund) med forslag til de bedste træningsskråninger for paragliding/ground handling.

![tech](https://img.shields.io/badge/React-Vite-blue) ![data](https://img.shields.io/badge/data-Open--Meteo-green)

## Features

- 🗺️ Kort over Herstedhøje (OpenStreetMap / Leaflet)
- 🧭 8 skråninger (N, NE, Ø, SE, S, SV, V, NV) farvekodet efter aktuel vind:
  - 🟢 **Grøn** — optimal (vind 2,5–8 m/s, inden for ±45° af skråningens retning)
  - 🟢 **Lime** — OK (skrå vind, 45–75°)
  - 🟡 **Gul** — for svag (< 2,5 m/s)
  - 🟠 **Orange** — gusty (stød >6 m/s over middelvind)
  - 🔴 **Rød** — for hård (> 8 m/s)
  - ⬛ **Grå** — bagvind/off
- ➡️ Vindpil på kortet (live retning)
- 📊 Vind lige nu: m/s, stød, retning, temperatur + vind i 80/120 m højde
- 🕐 Time-for-time vindprognose de næste ~14 timer
- 🔄 Auto-opdatering hvert 10. minut

## Data

Vinddata fra [Open-Meteo](https://open-meteo.com) (gratis, ingen API-nøgle).
Position: **55.690558, 12.362768**

## Kom i gang

```bash
npm install
npm run dev          # udvikling på http://localhost:5173
npm run dev -- --host   # tilgængelig på hele lokalnettet
```

## Build

```bash
npm run build        # output i dist/
npm run preview      # forhåndsvis produktions-build
```

## Tilpasning

Rediger konstanterne i `src/App.jsx`:

| Konstant | Betydning | Standard |
|---|---|---|
| `SUMMIT` | Toppens koordinater | `55.690558, 12.362768` |
| `SLOPE_RADIUS_M` | Afstand fra top til skråningsmarkører | `120` |
| `rateSlope()` | Grænser for svag/hård/gusty | 2,5–8 m/s, stød-diff 6 m/s |
