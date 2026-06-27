# Angico — UI Audit (React frontend)

Date: 2026-06-27
Branch: `feature/react-ui`
Scope: the React + TypeScript web app under `apps/web` (welcome, login, dashboard,
full map, domain module pages, memória timeline), reviewed against the running app
(API on :8082, web on :5175) on desktop (1440px) and mobile (390px) viewports.

## Summary

The app is functional end-to-end: the sidebar routes to real pages, the Leaflet
map renders live geolocated objetos, and creating an observação flows through to the
memory graph and back into the dashboard. Visual language is consistent with the
Angico brand tokens in `styles.css`. The gaps are mostly polish, empty/loading
states, accessibility, and a few responsive rough edges.

## What's working well

- **Coherent visual system** — brand tokens (`--angico-*`), rounded cards, soft
  shadows, consistent button styles applied across pages.
- **Real, interactive map** — `MapView.tsx` (Leaflet + OSM) with type-colored pins,
  popups, filter chips, and click-to-register an observação at a clicked location.
- **Functional modules** — `ModulePage.tsx` is config-driven (`moduleConfigs.ts`),
  so every sidebar entry lists real records and has a working create form.
- **Memória timeline** — `MemoriaPage.tsx` visualizes the event log with color-coded
  entity badges, actors, and timestamps; strong product narrative.
- **Responsive shell** — `AppShell` collapses the sidebar into an off-canvas drawer
  with a hamburger at ≤900px; grids drop to single column.

## Findings (prioritized)

### P1 — should fix soon
1. **No loading skeletons.** Dashboard and module pages render fallback/empty until
   data arrives; first paint can flash demo data then swap. Add skeletons/spinners
   (`DashboardPage`, `ModulePage`, `MapPage`).
2. **Topbar search is non-functional.** The "Buscar no Angico…" box and ⌘K hint
   imply global search but do nothing. Either wire it up or visually de-emphasize
   until implemented.
3. **Sidebar user/workspace are hardcoded.** "Júlia Santos / Nível 3" and the "CJ"
   workspace chip are static placeholders unrelated to real data — misleading.
4. **Mobile horizontal fit.** Verify on a real device: ensure no element exceeds the
   viewport (search box, stat cards). `overflow-x` guards are in place; the headless
   clip we saw was a capture artifact, but confirm on iOS/Android Safari/Chrome.

### P2 — meaningful polish
5. **Empty states are thin.** `ModulePage` empty state is a single line; add an
   illustration/explainer and a stronger CTA per module.
6. **No error surfaces for failed loads.** `loadDashboard`/`loadMapPoints` swallow
   errors and silently fall back. Show a non-blocking "não foi possível carregar"
   banner so failures are visible.
7. **Map default center is fixed** to a São Paulo coordinate; should derive from the
   território (once `territorios` carries geo) or fit-bounds to the points.
8. **Donut chart is static CSS** (`.donut` conic-gradient) and not driven by
   `categoryDistribution` proportions — the legend is real but the ring isn't.
9. **Stat cards open a toast** ("Ver origem") that's explanatory only; either make it
   navigate to a filtered list or drop the affordance.
10. **No active/hover state on module list cards**; they look clickable (cursor) but
    aren't. Add detail navigation or remove the affordance.

### P3 — nice to have / accessibility
11. **Accessibility:** add `aria-label`s to icon-only controls (map zoom, hamburger
    has one — extend to others), ensure focus styles on nav links and cards, and
    check color contrast on muted text (`--angico-muted` on white is ~4.0:1).
12. **Keyboard:** modals (`NewObservacaoModal`, `ModulePage` create) lack focus trap
    and `Esc`-to-close.
13. **Iconography** uses unicode glyphs (`lib/icons.ts`); fine for now but a real icon
    set (lucide/feather) would sharpen the visual language.
14. **Toast** is single-instance and time-unbounded; consider auto-dismiss + stacking.
15. **Map markers** use a generic divIcon; distinct glyphs per type (⚠ / ⌾ / ♧) would
    improve scannability and match the legend.

## Suggested next steps (in order)

1. Loading + error states across data-driven pages (P1 #1, #6).
2. Replace hardcoded sidebar identity with the real logged-in user/workspace (P1 #3)
   — depends on adopting auth from main's v1.
3. Make the donut and map-center data-driven (P2 #8, #7).
4. Accessibility pass on modals and icon controls (P3 #11, #12).

> Note: `main` now carries a separate, more complete vanilla-JS v1 (auth, geocoding,
> messaging, deploy). This audit covers the React branch specifically; several P1/P2
> items (auth-backed identity, search) are already solved differently on `main`.
