# AGENTS.md — vejledning til AI-kodningsagenter

## Projektoverblik

**herstedhoje-wind** er en lille dansksproget single-page React-app, der viser live-vindforhold på **Herstedhøje** (Albertslund, Danmark) og anbefaler de bedste træningsskråninger for paragliding/ground handling.

- Appen henter vinddata fra **Open-Meteo API** (gratis, ingen API-nøgle nødvendig) — se `src/App.jsx`.
- Vinddata vises på et **Leaflet-kort** (OpenStreetMap-fliser) med 8 farvekodede skråninger (N, NØ, Ø, SØ, S, SV, V, NV), en live-vindpil og et sidepanel med aktuel vind, solop/solned og time-for-time-prognose.
- Alt app-logik ligger i **én komponent** (`src/App.jsx`, ~250 linjer). Der er ingen router, ingen state-håndtering udenfor React-hooks og ingen test-suite.

## Teknologier

| Område | Valg |
|---|---|
| UI-bibliotek | React 19 (`react`, `react-dom`) |
| Kort | `leaflet` 1.9 + `react-leaflet` 5 |
| Build-værktøj | Vite 8 med `@vitejs/plugin-react` |
| Linter | oxlint (konfig i `.oxlintrc.json`) |
| Sprog | JavaScript (JSX) — **ikke** TypeScript (`@types/react` er kun til redaktørstøtte) |
| Styling | Almindelig CSS (`src/App.css` + placeholder `src/index.css`), mørkt tema |
| Data | Open-Meteo Forecast API (client-side `fetch`, ingen backend) |

## Byg- og kør-kommandoer

```bash
npm install             # installér afhængigheder
npm run dev             # udviklingsserver på http://localhost:5173
npm run dev -- --host   # tilgængelig på hele lokalnettet
npm run build           # produktionsbuild → dist/
npm run preview         # forhåndsvis produktionsbuild
npm run lint            # kør oxlint (linteren er ikke del af build'et)
```

## Kodens organisering

```
src/
├── main.jsx      # Entry point: renderer <App /> i #root med StrictMode
├── App.jsx       # HELE app'en: datahentning, vindvurdering, kort og panel
├── App.css       # Alle styles (overskriver index.css, som kun er en placeholder)
├── index.css     # Placeholder: "/* overridden by App.css */"
└── assets/       # Ubrugte Vite-skabelon-aktiver + hero.png
public/           # favicon.svg, icons.svg (statiske filer)
```

Nøgledele i `src/App.jsx`:

- `SUMMIT` — toppens koordinater (`55.690558, 12.362768`). Andre tilpasbare konstanter: `SLOPE_RADIUS_M` (afstand til skråningsmarkører) og `rateSlope()` (grænser: 2,5–8 m/s, gusty hvis stød-diff > 6 m/s).
- `destPoint()` — sfærisk destination-punkt-udregning til placering af skråninger og vindpil.
- `ASPECTS` / `rateSlope()` / `COLORS` — de 8 skråningsretninger og farvekodningen (good/ok/light/gusty/strong/off).
- `useEffect` i `App` — henter Open-Meteo-data ved mount og derefter hvert 10. minut (`setInterval(load, 10 * 60 * 1000)`).
- `WindArrow` — underkomponent der tegner vindpilen på kortet.

## Kodestil og konventioner

- **Sprog i kode**: Kommentarer, UI-tekster, README og denne fil er på **dansk** — behold dansk for nye kommentarer og brugertekster.
- JSX-filer bruger `.jsx`-endelse; ES-moduler (`"type": "module"`); ingen semikolon-stilændring — match den eksisterende stil i filen.
- Ingen eksterne CSS-rammer eller komponentbiblioteker; hold styling i `App.css`.
- Linteren oxlint kører med plugins `react` og `oxc`; `react/rules-of-hooks` fejler bygget ved `npm run lint` (men lint køres ikke automatisk).
- Bemærk: `npm run lint` giver pt. 1 warning (ubrugt import `useMap` fra `react-leaflet` i `src/App.jsx:2`) — pre-eksisterende, ikke indført af nye ændringer.

## Test og CI

- **Der er ingen test-suite** (hverken unit-, integrations- eller e2e-tests) og ingen testkørsel i `package.json`.
- **Der er ingen CI/CD** — ingen `.github/workflows`, ingen deploy-konfiguration. Repo'et (`github.com/jonathan-dk/herstedhoje-wind`) ser ud til at deployes manuelt; `dist/` er gitignored og bygges lokalt.
- Verifikation af ændringer sker derfor manuelt: `npm run lint` + `npm run dev` og visuel kontrol i browseren. Byg produktionsbuildet (`npm run build`) før større ændringer for at fange import-/syntaksfejl.

## Sikkerhed og datahensyn

- Ingen hemmeligheder i repo'et — ingen `.env`, ingen API-nøgler (Open-Meteo kræver ingen nøgle).
- Appen kalder Open-Meteo direkte fra browseren (`fetch` client-side), så der er ingen backend at beskytte.
- Forespørgslens parametre (koordinater, tidssone `Europe/Copenhagen`, `wind_speed_unit=ms`) er hårdkodet i `src/App.jsx:82-86` — ændres de, skal UI'ens visning (`toFixed`, enheder) holdes i sync.
