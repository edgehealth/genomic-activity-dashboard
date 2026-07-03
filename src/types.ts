// ---------------------------------------------------------------------------
// Domain types for the Genomic Testing Activity dashboard.
// All values are placeholders today — see src/data/hubs.ts for where real
// figures get wired in.
// ---------------------------------------------------------------------------

/** The four metrics the map / ranking can be shaded by. */
export type MetricKey = 'tests' | 'per100k' | 'tat' | 'tatPct'

export interface MetricDef {
  key: MetricKey
  /** Short label used on the toggle buttons. */
  label: string
  /** Longer label used in headings. */
  longLabel: string
  /** true when a lower value is the "better" direction (e.g. turnaround time). */
  lowerIsBetter: boolean
  /** How to render a raw value for this metric. */
  format: (v: number) => string
}

export interface TrendPoint {
  /** Month label, e.g. "Aug 25". */
  month: string
  hub: number
  national: number
}

export interface Hub {
  id: string
  /** Region name, e.g. "North East & Yorkshire". */
  name: string
  /** Full hub name, e.g. "North East & Yorkshire Genomic Laboratory Hub". */
  hubName: string
  /** Lead provider trust. */
  provider: string
  /** Catchment population in millions. */
  catchmentM: number
  accreditations: string[]

  totalTests: number
  testsPer100k: number
  /** Median turnaround time, days. */
  medianTat: number
  /** % of tests within the TAT standard. */
  tatPct: number
  /** Year-on-year growth in test volume, %. */
  yoyGrowth: number

  /** YoY change for tests per 100k, %. */
  per100kYoy: number
  /** tests per 100k vs the national mean, %. */
  per100kVsNat: number

  /** Rough centroid on the schematic map, for future label placement. */
  trend: TrendPoint[]
}

export interface NationalSummary {
  totalTests: number
  hubCount: number
  testsPer100k: number
  medianTat: number
  tatPct: number
  yoyGrowth: number
}
