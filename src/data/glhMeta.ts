// ---------------------------------------------------------------------------
// Static reference data for the 7 Genomic Laboratory Hubs.
//
// The API returns activity numbers only. Provider trust and accreditations are
// stable, public facts that don't live in vw_genomics_metrics, so they are kept
// here as reference data and merged onto the fetched activity in transform.ts.
// (name / hubName are also used to label the map and panels.)
// ---------------------------------------------------------------------------

export interface GlhMeta {
  id: string
  name: string
  hubName: string
  provider: string
  accreditations: string[]
}

export const GLH_META: GlhMeta[] = [
  { id: 'north-west',    name: 'North West',              hubName: 'North West Genomic Laboratory Hub',              provider: 'Manchester University NHS FT',        accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'ney',           name: 'North East & Yorkshire',  hubName: 'North East & Yorkshire Genomic Laboratory Hub',  provider: 'Newcastle upon Tyne Hospitals NHS FT', accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'east',          name: 'East',                    hubName: 'East Genomic Laboratory Hub',                    provider: 'Cambridge University Hospitals NHS FT', accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'north-thames',  name: 'North Thames',            hubName: 'North Thames Genomic Laboratory Hub',            provider: 'Great Ormond Street Hospital NHS FT',  accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'south-east',    name: 'South East',              hubName: 'South East Genomic Laboratory Hub',              provider: "Guy's and St Thomas' NHS FT",          accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'central-south', name: 'Central & South',         hubName: 'Central & South Genomic Laboratory Hub',         provider: 'Oxford University Hospitals NHS FT',    accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
  { id: 'south-west',    name: 'South West',              hubName: 'South West Genomic Laboratory Hub',              provider: 'North Bristol NHS Trust',              accreditations: ['UKAS ISO 15189', 'WGS-ready'] },
]

export const glhById: Record<string, GlhMeta> = Object.fromEntries(
  GLH_META.map((g) => [g.id, g]),
)

// ---------------------------------------------------------------------------
// region_of_reporting → glhId
// ---------------------------------------------------------------------------
// The API's `glh` column carries the raw `region_of_reporting` strings from the
// activity table, which we DON'T control. This map translates them to our slug
// ids. The keys below are normalised (lowercase, "glh"/"genomic laboratory hub"
// and punctuation stripped) — see normaliseRegion().
//
// ⚠ CONFIRM AGAINST LIVE DATA: if a region name comes back that isn't matched
// here, resolveGlhId() logs a console.warn and the hub is dropped. Add the
// missing spelling to this map when that happens.
const REGION_TO_GLH: Record<string, string> = {
  'north west': 'north-west',
  'north east and yorkshire': 'ney',
  'north east yorkshire': 'ney',
  'east': 'east',
  'east of england': 'east',
  'north thames': 'north-thames',
  'south east': 'south-east',
  'central and south': 'central-south',
  'central south': 'central-south',
  'south west': 'south-west',
}

function normaliseRegion(region: string): string {
  return region
    .toLowerCase()
    .replace(/genomic laboratory hub/g, '')
    .replace(/\bglh\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

const warnedRegions = new Set<string>()

/** Map a raw region_of_reporting value to a glhId, or null if unrecognised. */
export function resolveGlhId(region: string | null): string | null {
  if (!region) return null
  const key = normaliseRegion(region)
  const id = REGION_TO_GLH[key]
  if (!id && !warnedRegions.has(key)) {
    warnedRegions.add(key)
    console.warn(
      `[glhMeta] Unmapped GLH region "${region}" (normalised "${key}"). ` +
        'Add it to REGION_TO_GLH in src/data/glhMeta.ts.',
    )
  }
  return id ?? null
}
