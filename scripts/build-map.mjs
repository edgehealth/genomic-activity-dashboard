// ===========================================================================
// build-map.mjs — generate the dashboard's map layers from ONS boundaries.
//
//   node scripts/build-map.mjs
//
// 1. Reads the ONS "Integrated Care Boards (April 2026) EN BSC" boundaries
//    (super-generalised 200m) from the committed copy in
//    data-src/ons-icb-april-2026-bsc.geojson.
// 2. Simplifies further with mapshaper so the committed files stay small.
// 3. Joins each of the 36 ICB features with its GLH from
//    src/data/icb-to-glh.json (transcribed from References.ICB_to_GLH).
//    FAILS if any ICB is unmapped, any mapping row has no matching feature,
//    or a glhId is not one of the 7 known hub ids.
// 4. Dissolves the 36 ICBs into 7 GLH outline polygons.
// 5. Writes src/data/icb-features.json and src/data/glh-outlines.json.
//
// Re-run only when the boundaries or the ICB→GLH mapping change, then commit
// the two output files. When new boundaries are published (e.g. the April
// 2027 mergers), download the new GeoJSON into data-src/ from the ONS Open
// Geography Portal feature service — the current file came from:
// https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Integrated_Care_Boards_April_2026_Boundaries_EN_BSC/FeatureServer/0/query?where=1%3D1&outFields=ICB26CD,ICB26NM&outSR=4326&f=geojson
// ===========================================================================

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mapshaper from 'mapshaper'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataDir = path.join(root, 'src', 'data')

// Committed copy of the raw ONS download — the source of truth for the build.
const rawPath = path.join(root, 'data-src', 'ons-icb-april-2026-bsc.geojson')

// The 7 GLH ids the dashboard knows about (must match src/data/hubs.ts).
const GLH_IDS = new Set([
  'north-west', 'ney', 'east', 'north-thames', 'south-east', 'central-south', 'south-west',
])

console.log('Reading ONS ICB (April 2026) boundaries from data-src/…')
let raw
try {
  raw = await readFile(rawPath, 'utf8')
} catch {
  console.error(
    `Missing ${path.relative(root, rawPath)} — re-download it from the ONS feature service URL in this script's header.`,
  )
  process.exit(1)
}
const rawFc = JSON.parse(raw)
if (rawFc.type !== 'FeatureCollection' || rawFc.features.length !== 36) {
  throw new Error(`Expected a FeatureCollection of 36 ICBs, got ${rawFc.features?.length ?? rawFc.type}`)
}
console.log(`  ${rawFc.features.length} features, ${(raw.length / 1024).toFixed(0)} KB raw`)

// --- Validate the join BEFORE any geometry work -----------------------------
const mapping = JSON.parse(await readFile(path.join(dataDir, 'icb-to-glh.json'), 'utf8'))
const byCode = new Map(mapping.map((m) => [m.icbCode, m]))

const problems = []
if (mapping.length !== 36) problems.push(`mapping has ${mapping.length} rows, expected 36`)
for (const m of mapping) {
  if (!GLH_IDS.has(m.glhId)) problems.push(`${m.icbCode} has unknown glhId "${m.glhId}"`)
}
const featureCodes = new Set()
for (const f of rawFc.features) {
  const code = f.properties.ICB26CD
  featureCodes.add(code)
  if (!byCode.has(code)) problems.push(`no mapping row for feature ${code} (${f.properties.ICB26NM})`)
}
for (const m of mapping) {
  if (!featureCodes.has(m.icbCode)) problems.push(`mapping row ${m.icbCode} (${m.icbName}) has no boundary feature`)
}
if (problems.length) {
  console.error('ICB → GLH join is broken:\n  - ' + problems.join('\n  - '))
  process.exit(1)
}
console.log('  join validated: all 36 ICBs mapped to known GLHs')

// --- Simplify, tag with glhId, dissolve to GLH outlines ---------------------
console.log('Simplifying and dissolving with mapshaper…')
for (const f of rawFc.features) {
  const m = byCode.get(f.properties.ICB26CD)
  f.properties = { icbCode: m.icbCode, icbName: m.icbName, glhId: m.glhId }
}

const out = await mapshaper.applyCommands(
  [
    '-i input.geojson name=icb',
    '-simplify 20% keep-shapes',
    '-clean',
    '-o icb-features.json format=geojson precision=0.001',
    '-dissolve glhId name=glh',
    '-o glh-outlines.json format=geojson precision=0.001',
  ].join(' '),
  { 'input.geojson': JSON.stringify(rawFc) },
)

for (const name of ['icb-features.json', 'glh-outlines.json']) {
  const buf = out[name]
  const fc = JSON.parse(buf.toString())
  const expected = name.startsWith('icb') ? 36 : 7
  if (fc.features.length !== expected) {
    throw new Error(`${name}: expected ${expected} features after mapshaper, got ${fc.features.length}`)
  }
  await writeFile(path.join(dataDir, name), buf)
  console.log(`  wrote src/data/${name} (${(buf.length / 1024).toFixed(0)} KB, ${fc.features.length} features)`)
}

console.log('Done.')
