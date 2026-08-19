// ---------------------------------------------------------------------------
// Domain types for the Genomic Testing Activity dashboard.
// Values are sourced live from the Dashboard Data API (/v1/genomics), which
// serves the long-format `vw_genomics_metrics` view. See src/data/transform.ts
// for how raw metric rows become the Hub[] + NationalSummary the UI consumes.
// ---------------------------------------------------------------------------

/**
 * The metrics the map / ranking can be shaded by. All are activity measures
 * from vw_genomics_metrics (there is no turnaround-time data in the source):
 *   total  — total genomic activity (cancer + rare disease), gen_06 / gen_03
 *   cancer — cancer activity, gen_04
 *   rare   — rare & inherited disease activity, gen_05
 *   per1k  — activity per 1,000 population, gen_07 (cancer) + gen_12 (rare)
 */
export type MetricKey = 'total' | 'cancer' | 'rare' | 'per1k'

export interface MetricDef {
  key: MetricKey
  /** Short label used on the toggle buttons. */
  label: string
  /** Longer label used in headings. */
  longLabel: string
  /** true when a lower value is the "better" direction. None today, but the
   *  ranking/perf code still honours it, so it stays part of the contract. */
  lowerIsBetter: boolean
  /** How to render a raw value for this metric. */
  format: (v: number) => string
  /** Labelling for the 12-month trend panel when this metric is selected. */
  trend: TrendLabels
}

export interface TrendLabels {
  /** Panel heading, e.g. "12-month cancer activity trend". */
  title: string
  /** One line under the heading explaining what is plotted. */
  subtitle: string
  /** Y-axis label, carrying the units. */
  axisLabel: string
  /** Unit suffix appended to tooltip values, e.g. "tests". */
  unit: string
}

export interface TrendPoint {
  /** Month label, e.g. "Aug 25". */
  month: string
  /** null when the feed can't supply a value for this hub/month. */
  hub: number | null
  national: number | null
}

export interface Hub {
  id: string
  /** Region name, e.g. "North East & Yorkshire". */
  name: string
  /** Full hub name, e.g. "North East & Yorkshire Genomic Laboratory Hub". */
  hubName: string
  /** Lead provider trust. */
  provider: string
  /** Catchment population in millions (from the GLH population denominator). */
  catchmentM: number

  /** Total activity over the latest 12 months (cancer + rare). */
  totalActivity: number
  /** Cancer activity over the latest 12 months. */
  cancerActivity: number
  /** Rare & inherited disease activity over the latest 12 months. */
  rareActivity: number
  /** Activity per 1,000 population, latest full year. */
  per1k: number

  /** Year-on-year growth in total activity, %. 0 when <24 months of data. */
  yoyGrowth: number
  /** per-1,000 rate vs the national mean, %. */
  perVsNat: number

  /**
   * 12-month trend per metric, this hub vs England — the trend panel plots
   * whichever series matches the metric selected on the map toggle.
   *
   * total/cancer/rare come straight from the monthly count metrics. per1k has
   * no monthly source in the feed (gen_07/gen_12 are yearly), so it is derived
   * as monthly activity ÷ catchment population — see buildTrends().
   */
  trends: Record<MetricKey, TrendPoint[]>
}

/**
 * One row of the ICB → GLH mapping (April 2026 ICBs), as held in
 * src/data/icb-to-glh.json. Mirrors the columns of the SQL table `References.ICB_to_GLH`.
 */
export interface IcbInfo {
  icbCode: string
  odsCode: string
  icbName: string
  glhId: string
  formerIcbs: string[]
}

export interface NationalSummary {
  totalActivity: number
  cancerActivity: number
  rareActivity: number
  hubCount: number
  per1k: number
  yoyGrowth: number
}
