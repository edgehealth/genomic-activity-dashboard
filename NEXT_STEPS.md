# Next steps — making the dashboard production-ready

This is the concrete roadmap to take the dashboard from **placeholder data + schematic
map** to a real, published tool. Three workstreams: **the map**, **the data/API**, and
**QA**. They're independent — do them in any order.

The whole component tree only depends on the shapes in `src/types.ts` (`Hub[]` +
`NationalSummary`), so each piece can be swapped in without touching the rest.

---

## 1. The map — real GLH boundaries (GeoJSON)

Today `src/components/RegionMap.tsx` draws **hand-drawn placeholder polygons** — interactive
and colour-coded, but not geographically accurate.

### Why we can't use the "Regions" file directly
The ONS *Regions (December 2023)* file is the **9 statutory English regions**. The 7 Genomic
Laboratory Hubs (GLHs) **split geography below region level** — e.g. West Essex → North
Thames but the rest of Essex → East GLH; London splits across North Thames + South East.
Those split lines fall on **ICB (Integrated Care Board) boundaries**, so ICBs are the correct
building block.

### Steps
1. **Download ICB boundaries.** ONS Open Geography Portal → search
   *"Integrated Care Boards April 2023 Boundaries EN"* → grab the **BUC** (ultra-generalised,
   small) version → export **GeoJSON**. This gives 42 ICB polygons.
2. **Dissolve 42 ICBs → 7 GLHs** using the mapping below (in [mapshaper.org](https://mapshaper.org)
   or via code), tagging each merged polygon with the hub `id`.
3. **Simplify** to ~5–10% in mapshaper (shrinks MB → KB for the web).
4. **Save** the result as `src/data/glh.geojson` (or `public/glh.geojson`).
5. **Render it.** Add `react-simple-maps` (or `d3-geo`), rewrite `RegionMap.tsx` to draw real
   `<Geography>` paths keyed by hub `id`, reusing the existing `scaleColor` shading + click
   handlers. Nothing else in the dashboard changes.

### ICB → GLH mapping
| GLH (`id`) | ICBs |
|---|---|
| **North West** (`north-west`) | Greater Manchester · Cheshire & Merseyside · Lancashire & South Cumbria |
| **North East & Yorkshire** (`ney`) | North East & North Cumbria · Humber & North Yorkshire · West Yorkshire · South Yorkshire |
| **East** (`east`) | Derby & Derbyshire · Nottingham & Nottinghamshire · Leicester, Leicestershire & Rutland · Northamptonshire · Lincolnshire · Cambridgeshire & Peterborough · Norfolk & Waveney · Suffolk & North East Essex · Mid & South Essex |
| **North Thames** (`north-thames`) | North Central London · North East London · North West London · Hertfordshire & West Essex |
| **South East** (`south-east`) | South East London · South West London · Kent & Medway · Sussex · Surrey Heartlands |
| **Central & South** (`central-south`) | Birmingham & Solihull · Black Country · Coventry & Warwickshire · Herefordshire & Worcestershire · Staffordshire & Stoke-on-Trent · Shropshire, Telford & Wrekin · Buckinghamshire, Oxfordshire & Berkshire West · Frimley · Hampshire & Isle of Wight |
| **South West** (`south-west`) | Bristol, North Somerset & South Gloucestershire · Gloucestershire · Somerset · Bath & NE Somerset, Swindon & Wiltshire · Devon · Cornwall & Isles of Scilly |

**⚠️ Three ICBs still to confirm** (not named in the official GLH coverage text):
- **Dorset ICB** — likely **Central & South** (historic Wessex), unconfirmed.
- **Bedfordshire, Luton & Milton Keynes ICB** — either **East** or **North Thames**.
- **Frimley ICB** — straddles Surrey/Berkshire/Hampshire; provisionally **Central & South**,
  could be **South East**.

Once those three land, all 42 ICBs are assigned.

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
