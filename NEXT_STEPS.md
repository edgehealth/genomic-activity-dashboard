# Next steps — making the dashboard production-ready

This is the concrete roadmap to take the dashboard from **placeholder data + schematic
map** to a real, published tool. Three workstreams: **the map**, **the data/API**, and
**QA**. They're independent — do them in any order.

The whole component tree only depends on the shapes in `src/types.ts` (`Hub[]` +
`NationalSummary`), so each piece can be swapped in without touching the rest.

---

## 1. The map — ✅ DONE (real ICB-level map, April 2026 boundaries)

Implemented on branch `PBD-16-interactive-map`. `RegionMap.tsx` now renders the **official
ONS "Integrated Care Boards (April 2026)" boundaries** — the 36 post-merger ICBs — grouped
into the 7 GLHs, projected with the same linear lng/lat → SVG approach as the
fingertips-dashboard map (`src/hooks/useMap.ts` — planar SVG fills, so GeoJSON winding
order can't break rendering, which is what broke the earlier `d3-geo` version).
Interaction is at **ICB level**: clicking an ICB selects it
and its parent GLH, so all GLH-level panels keep working unchanged. Hovering shows the ICB
name + GLH; shading is by the parent GLH's value on the active metric (data is GLH-level
today — switch to per-ICB shading in `RegionMap.tsx` if ICB-level data arrives).

### How it fits together
- **`src/data/icb-to-glh.json`** — the ICB → GLH mapping, transcribed from the
  source-of-truth SQL table **`References.ICB_to_GLH`** (DASH > Tables). One row per new
  ICB: ONS GSS code (`E54…`), ODS code, name, `glhId`, former (pre-merger) ICBs.
- **`src/data/icbToGlh.ts`** — typed wrapper + lookup by code. Swap the JSON for an API
  response later and nothing downstream changes.
- **`scripts/build-map.mjs`** (`npm run build:map`) — reads the raw ONS boundaries from
  the committed copy in `data-src/ons-icb-april-2026-bsc.geojson` (the download URL for
  future boundary updates is in the script header; the pipeline itself runs fully offline),
  validates the join (fails if any of the 36 ICBs is unmapped or a `glhId` is unknown),
  simplifies with mapshaper, dissolves GLH outlines, and writes the two committed layers:
  `src/data/icb-features.json` (36 ICBs, ~79 KB) and `src/data/glh-outlines.json` (7 GLHs,
  ~41 KB). Re-run only when boundaries or the mapping change.

### Follow-ups for the map
- **⚠️ Dorset ICB is mapped to South West GLH** (per `References.ICB_to_GLH`). Independent
  research suggested **Central & South** (the Wessex Genomics Laboratory Service, which
  historically covers Dorset, is part of Central & South GLH). Confirm with the data owner.
- **GLH-straddling ICBs**: the new **Central East** and **Essex** ICBs both include areas
  that reported under **North Thames** GLH pre-merger (Hertfordshire, West Essex); the
  mapping assigns both wholly to **East**. Fine for filtering, but be aware when comparing
  with historic GLH-attributed activity.
- **April 2027**: a second merger wave takes England from 36 → ~26 ICBs. When ONS publishes
  the new boundaries, update `icb-to-glh.json` and re-run `npm run build:map`.

---

## 2. The data — wire in the real API

`src/data/hubs.ts` currently exports static placeholder objects (`hubs` + `national`), with a
12-month `trend` synthesised by `makeTrend`.

### Steps
1. **Add a data layer.** Create `src/data/useGenomicData.ts` — a `useQuery`-style hook (add
   `@tanstack/react-query`) pointing at your API / the NHS England Genomic Testing Activity feed.
2. **Map the response** into the existing `Hub` / `NationalSummary` types. Nothing downstream
   changes as long as the shapes match.
3. **Drop `makeTrend`** once the feed supplies real monthly `TrendPoint[]` per hub.

### Fields to source per hub
total tests · tests per 100k · median TAT · % within TAT standard · YoY growth ·
catchment population · lead provider · accreditations · 12-month trend.

### Known data corrections
- **Central & South lead provider** in `hubs.ts` says *"Oxford University Hospitals NHS FT"* —
  the official lead is **"Birmingham Women's and Children's NHS FT"**. Fix this line. (The other
  six providers are correct.)
- **Catchment** is shown in **millions** ("catchment 6.7m") — confirm the real unit before publishing.
- All numeric figures in `hubs.ts` are illustrative placeholders — replace wholesale.

---

## 3. QA — before publishing

### Loading / empty / error states
No state handles a failed or in-flight fetch yet. Add:
- Skeletons for the KPI cards, map, and sidebar while data loads.
- An error banner for a failed fetch.
- An empty state if the feed returns no hubs.

### Automated tests
Add **Vitest + React Testing Library**, covering at least:
- The ranking sort in `RankedList.tsx` (including `lowerIsBetter` metrics like TAT).
- The vs-national delta logic in `PerformanceBars.tsx`.
- `metricValue()` returning the right field per `MetricKey`.
- Map: every hub `id` resolves to a GeoJSON feature (guards against a bad join).

### Accessibility
- Map regions are keyboard-focusable buttons — audit focus order and `aria` labels.
- Check colour contrast on the lighter choropleth shades (WCAG AA).

### Data integrity
- Verify all 7 provider trusts against the official GLH list.
- Confirm the reporting period (the header's "Q3 2025/26" is currently static).

### Embedding
If this goes in an iframe (Edge Health labs hub), check `#root { max-width: 1400px }` and the
sticky sidebar behave inside the host page.

---

## Nice-to-haves
- Time-period selector (header period is static).
- Sidebar trend to follow the active map metric (currently always tests-per-100k).
- Deep-link selected hub + metric to the URL (`?hub=ney&metric=tat`).
