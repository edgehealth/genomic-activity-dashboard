// ---------------------------------------------------------------------------
// Domain types for the Genomic Testing Activity dashboard.
// Values are sourced live from the Dashboard Data API (/v1/genomics), which
// serves the long-format `vw_genomics_metrics` view. See src/data/transform.ts
// for how raw metric rows become the Hub[] + NationalSummary the UI consumes.
// ---------------------------------------------------------------------------

/**
 * The three activity measures the map / ranking can show. All are counts from
 * vw_genomics_metrics (there is no turnaround-time data in the source):
 *   total  — total genomic activity (cancer + rare disease), gen_06 / gen_03
 *   cancer — cancer activity, gen_04 / gen_01
 *   rare   — rare & inherited disease activity, gen_05 / gen_02
 *
 * Per-1,000 is deliberately NOT a metric — it is a Basis that applies to all
 * three, so Counts and Per 1,000 are always two views of the same numerator.
 */
export type MetricKey = 'total' | 'cancer' | 'rare'

/** How a metric's value is expressed. Applies to every metric and sub-category. */
export type Basis = 'count' | 'per1k'

/** The metrics that carry a sub-category breakdown. Total has none. */
export type BreakdownKey = 'cancer' | 'rare'

/**
 * What the map and ranked list are currently showing.
 *
 * `subCategory` drills a metric into one of its breakdown rows — a raw
 * `sub_category` key, or a derived remainder key. It is only meaningful for
 * metrics whose MetricDef declares a `breakdown`; Total ignores it.
 *
 * Sub-categories are deliberately not extra MetricKeys: their per-GLH sources
 * (gen_08 / gen_13) are yearly, so they can shade the map and rank hubs but
 * can't drive the monthly trend panel until the monthly branches land.
 */
export interface MetricView {
  metric: MetricKey
  subCategory: string | null
  basis: Basis
}

export interface MetricDef {
  key: MetricKey
  /** Short label used on the toggle buttons. */
  label: string
  /** Lower-case noun used to build headings and trend labels. */
  noun: string
  /** true when a lower value is the "better" direction. None today, but the
   *  ranking/perf code still honours it, so it stays part of the contract. */
  lowerIsBetter: boolean
  /** Which sub-category list this metric drills into, or null for none. */
  breakdown: BreakdownKey | null
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

/**
 * One row of a metric's sub-category breakdown.
 *
 * Cancer types come from gen_08 (per GLH, or gen_16 when available) and gen_09
 * (national); rare disease specialist categories from gen_13. Neither list
 * covers its whole metric — cancer itemises ~52% of cancer activity and rare
 * disease ~92% — so each list carries a derived remainder row that makes it sum
 * to the headline figure. See buildBreakdown() in src/data/transform.ts.
 */
export interface SubCategorySlice {
  /** Raw `sub_category` value, or a derived remainder key. */
  key: string
  /** Display label, with the source's boilerplate prefix/suffix stripped. */
  label: string
  /** Activity count over the latest 12 months. */
  value: number
  /** Share of the metric total this list belongs to, 0..1. */
  share: number
  /**
   * `value` per 1,000 population — the like-for-like comparison across GLHs,
   * whose catchments differ by nearly 3x. 0 when no population is known.
   */
  per1k: number
  /** true for a derived remainder row, which is not a source category. */
  isRemainder: boolean
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
  /** Raw catchment population — the denominator behind every per-1,000 figure.
   *  Kept unrounded (catchmentM is display-rounded and would skew the rate). */
  population: number

  /** Total activity over the latest 12 months (cancer + rare). */
  totalActivity: number
  /** Cancer activity over the latest 12 months. */
  cancerActivity: number
  /** Rare & inherited disease activity over the latest 12 months. */
  rareActivity: number
  /** Total activity per 1,000 population over the same 12 months. */
  per1k: number

  /** Year-on-year growth in total activity, %. 0 when <24 months of data. */
  yoyGrowth: number
  /** per-1,000 rate vs the national mean, %. */
  perVsNat: number

  /**
   * 12-month trend per metric per basis, this hub vs England. The trend panel
   * plots whichever series matches the current MetricView.
   */
  trends: Record<MetricKey, Record<Basis, TrendPoint[]>>

  /**
   * 12-month trend per sub-category, keyed by the slice's `key` (unique across
   * both breakdowns). Sourced from the monthly per-GLH breakdown metrics, so a
   * drilled-in view plots the sub-category itself rather than its parent metric.
   * A key is absent when this hub reports no monthly rows for it.
   */
  subTrends: Record<string, Record<Basis, TrendPoint[]>>

  /**
   * Sub-category breakdowns, each sorted descending with its derived remainder
   * pinned last and summing to the matching headline figure. A list is empty
   * when this hub reports no itemised rows for it at all — Central & South
   * currently reports no cancer types (see transform.ts).
   */
  subCategories: Record<BreakdownKey, SubCategorySlice[]>
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
  /** Summed GLH population — the denominator behind England's per-1,000 rates. */
  population: number
  /** Total activity per 1,000 England population. */
  per1k: number
  yoyGrowth: number
  /** England breakdowns, same shape as Hub.subCategories — drives the dropdown. */
  subCategories: Record<BreakdownKey, SubCategorySlice[]>
}
