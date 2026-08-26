import type {
  Basis,
  Hub,
  MetricDef,
  MetricKey,
  MetricView,
  NationalSummary,
  SubCategorySlice,
  TrendLabels,
} from '../types'

// ---------------------------------------------------------------------------
// Metric definitions — drive the map/ranking toggle and all formatting.
//
// Three metrics, each optionally drilled into a sub-category, each expressed on
// one of two bases (counts or per 1,000). Per-1,000 is a basis rather than a
// metric so that Counts and Per 1,000 always share a numerator — see
// resolveMeasure() below, which is the single place any consumer asks "what is
// this hub's value and how do I format it".
// ---------------------------------------------------------------------------

const intFmt = (v: number) => Math.round(v).toLocaleString('en-GB')

export const METRICS: Record<MetricKey, MetricDef> = {
  total: {
    key: 'total',
    label: 'Total',
    noun: 'total activity',
    lowerIsBetter: false,
    breakdown: null,
  },
  cancer: {
    key: 'cancer',
    label: 'Cancer',
    noun: 'cancer activity',
    lowerIsBetter: false,
    breakdown: 'cancer',
  },
  rare: {
    key: 'rare',
    label: 'Rare disease',
    noun: 'rare & inherited disease activity',
    lowerIsBetter: false,
    breakdown: 'rare',
  },
}

export const METRIC_ORDER: MetricKey[] = ['total', 'cancer', 'rare']

export const BASES: Basis[] = ['count', 'per1k']

export const BASIS_LABEL: Record<Basis, string> = {
  count: 'Counts',
  per1k: 'Per 1,000',
}

/** Pull the raw count for a given metric off a hub. */
export function metricValue(hub: Hub, key: MetricKey): number {
  switch (key) {
    case 'total': return hub.totalActivity
    case 'cancer': return hub.cancerActivity
    case 'rare': return hub.rareActivity
  }
}

/** The view's default, undrilled state for a metric, preserving the basis. */
export function baseView(metric: MetricKey, basis: Basis = 'count'): MetricView {
  return { metric, subCategory: null, basis }
}

/** The sub-category list a view drills into, or [] when the metric has none. */
export function subCategoriesFor(
  source: Pick<NationalSummary, 'subCategories'>,
  metric: MetricKey,
): SubCategorySlice[] {
  const breakdown = METRICS[metric].breakdown
  return breakdown ? source.subCategories[breakdown] : []
}

// ---------------------------------------------------------------------------
// Active measure — what the map / ranked list / comparison bars actually read
// ---------------------------------------------------------------------------

export interface ActiveMeasure {
  /** Short label for compact spots. */
  label: string
  /**
   * What is being measured, with no basis attached — e.g. "Cancer activity" or
   * "Lung Cancer". Pairs with `basisLabel` on a second line so a heading keeps a
   * fixed height when the basis is switched.
   */
  name: string
  /** The basis spelled out, e.g. "Per 1,000 population". */
  basisLabel: string
  /** Full one-line label, e.g. "Lung Cancer per 1,000 population". */
  longLabel: string
  lowerIsBetter: boolean
  format: (v: number) => string
  /**
   * The hub's value, or null when this hub reports nothing for the selected
   * sub-category — distinct from 0, so the map can render "no data" rather than
   * shading a non-reporting hub as the lowest performer.
   */
  value: (hub: Hub) => number | null
}

const basisSuffix = (basis: Basis) => (basis === 'per1k' ? 'per 1,000 population' : '(12m)')

/** Second-line wording for two-line headings. */
const BASIS_SUBLABEL: Record<Basis, string> = {
  count: 'Counts, 12 months',
  per1k: 'Per 1,000 population',
}

/**
 * Shown under the trend heading when a sub-category is selected, to say what
 * the line actually plots — the trend follows the metric, not the drill-down.
 */
export const TREND_COVERAGE: Record<MetricKey, string> = {
  total: 'Covers total activity per month.',
  cancer: 'Covers total cancer activity per month.',
  rare: 'Covers total rare disease activity per month.',
}
/**
 * Rates display to 1dp — but a small sub-category's rate is ~0.002 per 1,000,
 * where 1dp renders every hub as "0.0". Below the point where 1dp carries any
 * information, add decimals rather than lie about the value.
 */
export function formatRate(v: number): string {
  return v.toFixed(rateDecimals(Math.abs(v)))
}

/**
 * Decimals wide enough for the largest value in a series, applied uniformly —
 * an axis with mixed decimal counts across its ticks reads as noise.
 *
 * At or above 1 this stays at the 1dp house style. Below it, the count scales
 * with magnitude so the largest value keeps two significant figures: a series
 * peaking at 0.0055 needs 4dp, and anything coarser is a flat row of zeroes.
 */
export function rateDecimals(maxAbs: number): number {
  if (maxAbs === 0) return 1
  if (maxAbs >= 1) return 1
  return Math.min(6, Math.ceil(-Math.log10(maxAbs)) + 1)
}

const basisFormat = (basis: Basis) => (basis === 'per1k' ? formatRate : intFmt)

export function resolveMeasure(view: MetricView): ActiveMeasure {
  const def = METRICS[view.metric]
  const perThousand = view.basis === 'per1k'
  const format = basisFormat(view.basis)

  // Undrilled: the metric's own headline figure.
  if (!def.breakdown || !view.subCategory) {
    const noun = def.noun.replace(/^./, (c) => c.toUpperCase())
    return {
      label: def.label,
      // Short form on purpose: the full noun ("Rare & inherited disease
      // activity") wraps in the sidebar, so headings would be two lines for one
      // metric and one for the others. The basis line below carries the detail.
      name: def.label,
      basisLabel: BASIS_SUBLABEL[view.basis],
      longLabel: `${noun} ${basisSuffix(view.basis)}`,
      lowerIsBetter: def.lowerIsBetter,
      format,
      // Per-1,000 shares the count's numerator, so derive rather than store.
      value: (hub) =>
        perThousand ? rateFrom(metricValue(hub, view.metric), hub) : metricValue(hub, view.metric),
    }
  }

  const breakdown = def.breakdown
  const key = view.subCategory

  const name = sliceLabel(breakdown, key)
  return {
    label: name,
    name,
    basisLabel: BASIS_SUBLABEL[view.basis],
    longLabel: `${name} ${basisSuffix(view.basis)}`,
    lowerIsBetter: false,
    format,
    value: (hub) => {
      const slice = hub.subCategories[breakdown].find((t) => t.key === key)
      if (!slice) return null
      return perThousand ? slice.per1k : slice.value
    },
  }
}

/**
 * Per-1,000 for a headline count. Returns null when no population is known for
 * this hub, so the map renders "no data" rather than a spurious 0.
 */
function rateFrom(count: number, hub: Hub): number | null {
  if (hub.population <= 0) return null
  return Number(((count / hub.population) * 1000).toFixed(2))
}

/**
 * Display label for a sub-category key. Mirrors transform.ts, so a key can be
 * labelled without the slice in hand (the map/ranked headings need this).
 */
export function sliceLabel(breakdown: 'cancer' | 'rare', key: string): string {
  if (key === REMAINDER_KEY.cancer) return 'Other: Cancer'
  if (key === REMAINDER_KEY.rare) return 'Not categorised'
  return breakdown === 'cancer'
    ? key.replace(/\s+Activity$/i, '')
    : key.replace(/^Rare\s*&\s*Inherited Disease\s*-\s*/i, '')
}

/** Keys for the derived remainder rows. Distinct per breakdown, because the
 *  rare-disease source already has its own "…- Other" category. */
export const REMAINDER_KEY = {
  cancer: '__other_cancer',
  rare: '__not_categorised',
} as const

// ---------------------------------------------------------------------------
// Trend labelling — derived from the view rather than stored per combination.
// ---------------------------------------------------------------------------

/**
 * `subject` overrides the metric noun when a sub-category has its own monthly
 * series, so the panel names what is actually plotted.
 */
export function trendLabels(view: MetricView, subject?: string): TrendLabels {
  const noun = subject ?? METRICS[view.metric].noun
  const perThousand = view.basis === 'per1k'
  return {
    title: `12-month ${noun} trend`,
    subtitle: perThousand
      ? `Monthly ${noun} per 1,000 population, this hub vs the England average.`
      : `Monthly ${noun}, this hub vs the England average.`,
    axisLabel: perThousand ? 'Per 1,000 per month' : 'Tests per month',
    unit: perThousand ? 'per 1,000' : 'tests',
  }
}
