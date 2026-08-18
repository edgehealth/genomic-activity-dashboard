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
  accreditations: string[]

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

/**
 * One (gene × cancer type) cell of gene-level testing activity, from gen_11.
 *
 * ⚠ gen_11 carries NO glh/icb — it is England-level only, so gene activity
 * cannot be broken down or filtered by GLH. It is also yearly and covers
 * 2016–2021, a different period from the monthly activity metrics.
 */
export interface GeneRow {
  gene: string
  /** Cancer type these tests sit under (gen_11 sub_category). */
  cancerType: string
  /** Tests including this gene, in this year and cancer type. */
  tests: number
  /** Total tests for the cancer type that year — the gen_11 denominator. */
  cancerTypeTests: number | null
}

export interface GeneYear {
  /** Calendar year the yearly row falls in, e.g. 2020. */
  year: number
  /** true when this year is missing cancer types that other years have. */
  partial: boolean
  /** Cancer types present in this year. */
  cancerTypes: string[]
  rows: GeneRow[]
}

export interface GeneActivity {
  /** Yearly slices, latest first. */
  years: GeneYear[]
  /** Latest year with complete cancer-type coverage — the default selection. */
  defaultYear: number | null
  /** Every cancer type seen across all years, for the filter control. */
  cancerTypes: string[]
}

export interface NationalSummary {
  totalActivity: number
  cancerActivity: number
  rareActivity: number
  hubCount: number
  per1k: number
  yoyGrowth: number
}
