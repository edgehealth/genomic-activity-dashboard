import type {
  Basis,
  BreakdownKey,
  GeneActivity,
  GeneRow,
  GeneYear,
  Hub,
  MetricKey,
  NationalSummary,
  SubCategorySlice,
  TrendPoint,
} from '../types'
import type { GenomicsRow } from '../services/genomicsApi'
import { REMAINDER_KEY, sliceLabel } from './metrics'
import { GLH_META, resolveGlhId } from './glhMeta'

// ---------------------------------------------------------------------------
// Turn the long-format vw_genomics_metrics rows into the Hub[] + NationalSummary
// the UI consumes.
//
// Metric ids used here (see the view definition):
//   gen_01/02/03  national cancer / rare / total activity, monthly counts
//   gen_04/05/06  per-GLH cancer / rare / total activity, monthly counts
//   gen_07/12     per-GLH cancer / rare activity per 1,000 population, yearly
//                 — read ONLY for their denominator, the GLH population
//   gen_08        per-GLH cancer activity by cancer type, yearly
//   gen_09        national cancer activity by cancer type, monthly
//   gen_13        per-GLH rare disease activity by specialist category, yearly
//   gen_16/17     monthly equivalents of gen_08/gen_13, preferred when present
//
// Aggregation rules from the view's notes:
//   • numerator is always additive — SUM freely.
//   • the rate denominators are the GLH population repeated on every row, so
//     population is taken ONCE per GLH and never summed across the breakdown.
//
// Per-1,000 is derived from the same 12-month counts shown under Counts, rather
// than from gen_07/gen_12's numerators. Those bucket by calendar year, and the
// activity data runs Apr–Mar, so their latest year holds only Jan–Mar — reading
// it as a full year understated every rate roughly 4x.
// ---------------------------------------------------------------------------

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format an epoch-ms timestamp as "Aug 25", reading the date in UTC. */
function monthLabel(ms: number): string {
  const d = new Date(ms)
  return `${MONTH_ABBR[d.getUTCMonth()] ?? '???'} ${String(d.getUTCFullYear()).slice(2)}`
}

const num = (v: number | null | undefined): number => (typeof v === 'number' ? v : 0)
const round1 = (v: number): number => Number(v.toFixed(1))
const round2 = (v: number): number => Number(v.toFixed(2))

/**
 * Rates span orders of magnitude: a whole metric is ~13 per 1,000, while a small
 * sub-category can be ~0.002. Fixed-decimal rounding flattens the small ones to
 * zero and destroys the series, so keep 4 significant figures instead.
 */
const roundRate = (v: number): number => (v === 0 ? 0 : Number(v.toPrecision(4)))

/** Distinct time_period values for a metric, sorted descending (latest first). */
function periodsDesc(rows: GenomicsRow[], metricId: string): number[] {
  const set = new Set<number>()
  for (const r of rows) if (r.metric_id === metricId) set.add(r.time_period)
  return [...set].sort((a, b) => b - a)
}

/** Sum numerator per glhId for a metric over an allowed set of periods. */
function sumPerGlh(rows: GenomicsRow[], metricId: string, periods: Set<number>): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    if (r.metric_id !== metricId || !periods.has(r.time_period)) continue
    const id = resolveGlhId(r.glh)
    if (!id) continue
    out.set(id, (out.get(id) ?? 0) + num(r.numerator))
  }
  return out
}

/** Sum numerator (national metric, glh is null) over an allowed set of periods. */
function sumNational(rows: GenomicsRow[], metricId: string, periods: Set<number>): number {
  let total = 0
  for (const r of rows) {
    if (r.metric_id === metricId && periods.has(r.time_period)) total += num(r.numerator)
  }
  return total
}

const warned = new Set<string>()

/** console.warn once per distinct key, so a per-row problem logs once. */
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}

// ---------------------------------------------------------------------------
// Monthly series for the trend panel
// ---------------------------------------------------------------------------
const COUNT_SOURCES: Record<MetricKey, { hub: string; national: string }> = {
  total: { hub: 'gen_06', national: 'gen_03' },
  cancer: { hub: 'gen_04', national: 'gen_01' },
  rare: { hub: 'gen_05', national: 'gen_02' },
}

interface MonthlySeries {
  hub: Map<string, number>
  national: Map<number, number>
}

/** Monthly hub + national values for one count metric pair. */
function monthlySeries(rows: GenomicsRow[], src: { hub: string; national: string }): MonthlySeries {
  const hub = new Map<string, number>()
  const national = new Map<number, number>()
  for (const r of rows) {
    if (r.metric_id === src.national) {
      national.set(r.time_period, num(r.numerator))
    } else if (r.metric_id === src.hub) {
      const id = resolveGlhId(r.glh)
      if (id) hub.set(`${id}|${r.time_period}`, num(r.numerator))
    }
  }
  return { hub, national }
}

// ---------------------------------------------------------------------------
// Sub-category breakdowns
// ---------------------------------------------------------------------------
// Neither breakdown covers its whole metric: the source itemises ~52% of cancer
// activity and ~92% of rare disease activity, and the headline totals are
// independently reported figures rather than the sum of their own breakdowns.
// (Two complete re-cuts of the cancer total — age categories, and the HaemOnc /
// Solid Tumour split — agree with each other to 0.15% but both fall ~8.8% short
// of the headline.) So each list carries a derived remainder, which is what
// makes it reconcile to the KPI above it.

/** Per-GLH sub-category sources: monthly branch preferred, yearly fallback. */
const BREAKDOWN_SOURCES: Record<BreakdownKey, { monthly: string; yearly: string; national?: string }> = {
  cancer: { monthly: 'gen_16', yearly: 'gen_08', national: 'gen_09' },
  rare: { monthly: 'gen_17', yearly: 'gen_13' },
}

/** Sum numerator per (glhId, sub_category) for a metric over allowed periods. */
function sumPerGlhBySub(
  rows: GenomicsRow[],
  metricId: string,
  periods: Set<number>,
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (r.metric_id !== metricId || !periods.has(r.time_period) || !r.sub_category) continue
    const id = resolveGlhId(r.glh)
    if (!id) continue
    let bySub = out.get(id)
    if (!bySub) {
      bySub = new Map()
      out.set(id, bySub)
    }
    bySub.set(r.sub_category, (bySub.get(r.sub_category) ?? 0) + num(r.numerator))
  }
  return out
}

/** Sum numerator per sub_category for a national metric over allowed periods. */
function sumNationalBySub(
  rows: GenomicsRow[],
  metricId: string,
  periods: Set<number>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    if (r.metric_id !== metricId || !periods.has(r.time_period) || !r.sub_category) continue
    out.set(r.sub_category, (out.get(r.sub_category) ?? 0) + num(r.numerator))
  }
  return out
}

/** Collapse a per-GLH breakdown into one national map (numerators are additive). */
function collapseToNational(byGlh: Map<string, Map<string, number>>): Map<string, number> {
  const out = new Map<string, number>()
  for (const bySub of byGlh.values()) {
    for (const [sub, v] of bySub) out.set(sub, (out.get(sub) ?? 0) + v)
  }
  return out
}

// --- Monthly sub-category series (for the trend panel) ---------------------

/** `${glhId}|${sub}|${period}` -> count, from a monthly per-GLH breakdown. */
function subMonthlyPerGlh(rows: GenomicsRow[], metricId: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    if (r.metric_id !== metricId || !r.sub_category) continue
    const id = resolveGlhId(r.glh)
    if (!id) continue
    const key = `${id}|${r.sub_category}|${r.time_period}`
    out.set(key, (out.get(key) ?? 0) + num(r.numerator))
  }
  return out
}

/** `${sub}|${period}` -> count, from a monthly national breakdown metric. */
function subMonthlyNational(rows: GenomicsRow[], metricId: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    if (r.metric_id !== metricId || !r.sub_category) continue
    const key = `${r.sub_category}|${r.time_period}`
    out.set(key, (out.get(key) ?? 0) + num(r.numerator))
  }
  return out
}

/** Roll a per-GLH monthly sub map up to national totals, for breakdowns with
 *  no national metric of their own (rare disease has none). */
function subMonthlyToNational(perGlh: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>()
  for (const [k, v] of perGlh) {
    const [, sub, period] = k.split('|')
    const key = `${sub}|${period}`
    out.set(key, (out.get(key) ?? 0) + v)
  }
  return out
}

/**
 * Pick the per-GLH periods to read for a breakdown.
 *
 * Prefers the dedicated monthly metric when the feed carries it, else falls back
 * to the base metric — but the window is chosen from the rows' own `time_grain`
 * rather than the metric id, so it stays correct whether the monthly data
 * arrives as a new metric or as a re-grained version of the existing one.
 *
 * Monthly rows use the same 12-month window as every other count. Yearly rows
 * bucket by calendar year, and the window straddles two buckets (Apr–Dec, then
 * Jan–Mar), so we take every bucket whose year the window touches — exact while
 * the feed holds 12 months, but it can't express a rolling window, so once a
 * 13th month lands it over-counts. buildBreakdown() warns if that pushes a
 * remainder negative.
 */
function breakdownPeriods(
  rows: GenomicsRow[],
  breakdown: BreakdownKey,
  last12: Set<number>,
): { metricId: string; periods: Set<number> } {
  const src = BREAKDOWN_SOURCES[breakdown]
  const metricId = rows.some((r) => r.metric_id === src.monthly) ? src.monthly : src.yearly
  const grain = rows.find((r) => r.metric_id === metricId)?.time_grain

  if (grain === 'month') return { metricId, periods: last12 }

  const windowYears = new Set([...last12].map((p) => new Date(p).getUTCFullYear()))
  return {
    metricId,
    periods: new Set(
      periodsDesc(rows, metricId).filter((p) => windowYears.has(new Date(p).getUTCFullYear())),
    ),
  }
}

/**
 * Turn per-sub-category counts into breakdown rows, sorted descending with the
 * derived remainder pinned last. Returns [] when nothing is itemised, so the UI
 * can say "not reported" rather than render a single 100% remainder bar.
 *
 * `total` is the independently reported headline the rows must sum to.
 */
function buildBreakdown(
  breakdown: BreakdownKey,
  perSub: Map<string, number> | undefined,
  total: number,
  pop: number,
  context: string,
): SubCategorySlice[] {
  const share = (v: number) => (total > 0 ? v / total : 0)
  const rate = (v: number) => (pop > 0 ? roundRate((v / pop) * 1000) : 0)

  const itemised: SubCategorySlice[] = [...(perSub?.entries() ?? [])]
    .filter(([, value]) => value > 0)
    .map(([sub, value]) => ({
      key: sub,
      label: sliceLabel(breakdown, sub),
      value,
      share: share(value),
      per1k: rate(value),
      isRemainder: false,
    }))
    .sort((a, b) => b.value - a.value)

  if (itemised.length === 0) return []

  const itemisedTotal = itemised.reduce((sum, t) => sum + t.value, 0)
  const remainder = total - itemisedTotal

  // A negative remainder means the itemised rows out-total the headline — either
  // double-counting in the source, or the yearly fallback's calendar-year
  // buckets have drifted out of step with the 12-month window. Clamping keeps
  // the chart sane, but this must not pass silently.
  if (remainder < 0) {
    console.warn(
      `[transform] ${context} / ${breakdown}: itemised rows (${itemisedTotal}) exceed the ` +
        `headline total (${total}). Clamping the remainder to 0 — check that the ` +
        'breakdown source covers the same months as the headline metric.',
    )
  }

  const value = Math.max(0, remainder)
  if (value === 0) return itemised

  const key = REMAINDER_KEY[breakdown]
  return [
    ...itemised,
    {
      key,
      label: sliceLabel(breakdown, key),
      value,
      share: share(value),
      per1k: rate(value),
      isRemainder: true,
    },
  ]
}

// ---------------------------------------------------------------------------
// Gene-level activity (gen_11)
// ---------------------------------------------------------------------------
// One row per (cancer type, gene, year): numerator = tests including that gene,
// denominator = total tests for that cancer type in the year.
//
// ⚠ TWO LIMITS, both inherent to the extract — surface them in the UI, don't
// paper over them:
//   1. glh and icb are null on every row, so there is NO regional breakdown.
//      Gene activity cannot be filtered by the selected GLH.
//   2. It is yearly and spans 2016–2021, not the 2025/26 window the monthly
//      activity metrics cover. The final year is partial (2 of 13 cancer
//      types), so defaultYear is the latest year with full coverage.
const GENE_METRIC_ID = 'gen_11'

/** Calendar year of an epoch-ms timestamp, read in UTC. */
function yearOf(ms: number): number {
  return new Date(ms).getUTCFullYear()
}

function buildGeneActivity(rows: GenomicsRow[]): GeneActivity {
  // year -> `${gene}|${cancerType}` -> row
  const byYear = new Map<number, Map<string, GeneRow>>()
  // `${year}|${cancerType}` -> cancer-type total for the year
  const denominators = new Map<string, number>()
  const allCancerTypes = new Set<string>()

  for (const r of rows) {
    if (r.metric_id !== GENE_METRIC_ID) continue
    // gen_11 is the only metric carrying `gene`; a row without both gene and
    // cancer type can't be placed in the table, so skip rather than guess.
    if (!r.gene || !r.sub_category) continue
    if (r.glh != null) {
      warnOnce(
        'gene-has-glh',
        `[transform] ${GENE_METRIC_ID} unexpectedly carries a glh ("${r.glh}"). Gene activity ` +
          'is treated as England-level — revisit buildGeneActivity() if the view now has regions.',
      )
    }

    const year = yearOf(r.time_period)
    allCancerTypes.add(r.sub_category)
    if (r.denominator != null && r.denominator > 0) {
      denominators.set(`${year}|${r.sub_category}`, r.denominator)
    }

    let cells = byYear.get(year)
    if (!cells) {
      cells = new Map<string, GeneRow>()
      byYear.set(year, cells)
    }
    const key = `${r.gene}|${r.sub_category}`
    const existing = cells.get(key)
    if (existing) {
      // Same gene/type/year appearing twice — numerators are additive.
      existing.tests += num(r.numerator)
    } else {
      cells.set(key, {
        gene: r.gene,
        cancerType: r.sub_category,
        tests: num(r.numerator),
        cancerTypeTests: null,
      })
    }
  }

  const fullCoverage = allCancerTypes.size
  const years: GeneYear[] = [...byYear.entries()]
    .map(([year, cells]) => {
      const rowsForYear = [...cells.values()].map((row) => ({
        ...row,
        cancerTypeTests: denominators.get(`${year}|${row.cancerType}`) ?? null,
      }))
      const cancerTypes = [...new Set(rowsForYear.map((r) => r.cancerType))].sort()
      return { year, partial: cancerTypes.length < fullCoverage, cancerTypes, rows: rowsForYear }
    })
    .sort((a, b) => b.year - a.year)

  // Default to the latest COMPLETE year — the latest year overall is partial in
  // the current feed, and opening on it would understate every gene.
  const defaultYear = years.find((y) => !y.partial)?.year ?? years[0]?.year ?? null

  return { years, defaultYear, cancerTypes: [...allCancerTypes].sort() }
}

export interface GenomicsData {
  hubs: Hub[]
  national: NationalSummary
  /** England-level gene testing volumes — see the note above buildGeneActivity. */
  genes: GeneActivity
}

export function buildGenomicsData(rows: GenomicsRow[]): GenomicsData {
  // --- Monthly windows: latest 12 months, and the 12 before that (for YoY) ---
  const months = periodsDesc(rows, 'gen_06')
  const last12 = new Set(months.slice(0, 12))
  const prev12 = new Set(months.slice(12, 24))
  const hasYoY = months.length >= 24
  // Trend axis: latest 12 months, ascending.
  const trendMonths = months.slice(0, 12).reverse()

  // --- GLH population: the denominator repeated on every gen_07/gen_12 row, so
  // take it once per GLH from whichever row appears first. Not restricted to a
  // single year — a GLH missing from the latest year would otherwise lose its
  // population and drop out of every per-1,000 figure. ---
  const popByGlh = new Map<string, number>()
  for (const r of rows) {
    if (r.metric_id !== 'gen_07' && r.metric_id !== 'gen_12') continue
    const id = resolveGlhId(r.glh)
    if (!id || r.denominator == null) continue
    if (!popByGlh.has(id)) popByGlh.set(id, num(r.denominator))
  }

  // --- Monthly count sums per GLH (latest 12 months) ---
  const totalByGlh = sumPerGlh(rows, 'gen_06', last12)
  const cancerByGlh = sumPerGlh(rows, 'gen_04', last12)
  const rareByGlh = sumPerGlh(rows, 'gen_05', last12)
  const totalPrevByGlh = sumPerGlh(rows, 'gen_06', prev12)

  // --- National monthly totals ---
  const natTotal = sumNational(rows, 'gen_03', last12)
  const natCancer = sumNational(rows, 'gen_01', last12)
  const natRare = sumNational(rows, 'gen_02', last12)
  const natTotalPrev = sumNational(rows, 'gen_03', prev12)

  let natPop = 0
  for (const pop of popByGlh.values()) natPop += pop
  const nationalPer1k = natPop > 0 ? (natTotal / natPop) * 1000 : 0

  // --- Sub-category breakdown inputs -----------------------------------------
  const cancerSrc = breakdownPeriods(rows, 'cancer', last12)
  const rareSrc = breakdownPeriods(rows, 'rare', last12)
  const cancerBySubGlh = sumPerGlhBySub(rows, cancerSrc.metricId, cancerSrc.periods)
  const rareBySubGlh = sumPerGlhBySub(rows, rareSrc.metricId, rareSrc.periods)

  // Cancer has a national-by-type metric (gen_09). Rare disease has none — the
  // view only breaks rare disease down per GLH — so England is the GLH sum.
  const cancerBySubNat = sumNationalBySub(rows, 'gen_09', last12)
  const rareBySubNat = collapseToNational(rareBySubGlh)

  // --- Monthly sub-category series for the trend panel ----------------------
  // Only meaningful when the breakdown source is monthly; a yearly source
  // yields periods that match no trend month, so the series comes back empty
  // and the panel falls back to the parent metric's line.
  const subMonthly: Record<BreakdownKey, { hub: Map<string, number>; national: Map<string, number> }> = {
    cancer: (() => {
      const hub = subMonthlyPerGlh(rows, cancerSrc.metricId)
      return { hub, national: subMonthlyNational(rows, 'gen_09') }
    })(),
    rare: (() => {
      const hub = subMonthlyPerGlh(rows, rareSrc.metricId)
      return { hub, national: subMonthlyToNational(hub) }
    })(),
  }

  const national: NationalSummary = {
    totalActivity: natTotal,
    cancerActivity: natCancer,
    rareActivity: natRare,
    hubCount: GLH_META.length,
    population: natPop,
    per1k: round2(nationalPer1k),
    yoyGrowth: hasYoY && natTotalPrev > 0
      ? round1(((natTotal - natTotalPrev) / natTotalPrev) * 100)
      : 0,
    subCategories: {
      cancer: buildBreakdown('cancer', cancerBySubNat, natCancer, natPop, 'England'),
      rare: buildBreakdown('rare', rareBySubNat, natRare, natPop, 'England'),
    },
  }

  // --- Monthly series behind the trend panel, one per metric ---
  const monthly: Record<MetricKey, MonthlySeries> = {
    total: monthlySeries(rows, COUNT_SOURCES.total),
    cancer: monthlySeries(rows, COUNT_SOURCES.cancer),
    rare: monthlySeries(rows, COUNT_SOURCES.rare),
  }

  /** Build both bases of all three trend series for one hub. */
  function buildTrends(glhId: string): Record<MetricKey, Record<Basis, TrendPoint[]>> {
    const pop = popByGlh.get(glhId) ?? 0

    const series = (key: MetricKey, basis: Basis): TrendPoint[] =>
      trendMonths.map((period) => {
        const hubCount = monthly[key].hub.get(`${glhId}|${period}`)
        const natCount = monthly[key].national.get(period)
        if (basis === 'count') {
          return {
            month: monthLabel(period),
            hub: hubCount ?? null,
            // England shown as the per-hub mean, so it sits on the hub's scale.
            national: natCount != null ? Math.round(natCount / GLH_META.length) : null,
          }
        }
        return {
          month: monthLabel(period),
          hub: pop > 0 && hubCount != null ? roundRate((hubCount / pop) * 1000) : null,
          national: natPop > 0 && natCount != null ? roundRate((natCount / natPop) * 1000) : null,
        }
      })

    const forMetric = (key: MetricKey) => ({ count: series(key, 'count'), per1k: series(key, 'per1k') })
    return { total: forMetric('total'), cancer: forMetric('cancer'), rare: forMetric('rare') }
  }

  /**
   * One 12-month series per sub-category this hub reports, both bases.
   *
   * The derived remainder gets a series too, computed per month as the metric
   * total minus that month's itemised rows — so selecting "Other: Cancer" plots
   * a real line rather than nothing. England is shown as the per-hub mean on
   * counts (matching the metric-level series) and population-weighted on rates.
   */
  function buildSubTrends(
    glhId: string,
    slices: Record<BreakdownKey, SubCategorySlice[]>,
  ): Record<string, Record<Basis, TrendPoint[]>> {
    const pop = popByGlh.get(glhId) ?? 0
    const out: Record<string, Record<Basis, TrendPoint[]>> = {}

    for (const breakdown of ['cancer', 'rare'] as BreakdownKey[]) {
      const metricKey: MetricKey = breakdown
      const src = subMonthly[breakdown]
      const itemised = slices[breakdown].filter((s) => !s.isRemainder)
      if (itemised.length === 0) continue

      /** Monthly value for one sub-category, hub and national. */
      const at = (sub: string, period: number) => ({
        hub: src.hub.get(`${glhId}|${sub}|${period}`),
        national: src.national.get(`${sub}|${period}`),
      })

      for (const slice of slices[breakdown]) {
        // Remainder: metric total for the month, less every itemised row.
        const monthly = trendMonths.map((period) => {
          if (!slice.isRemainder) return { period, ...at(slice.key, period) }
          const hubTotal = monthly_(metricKey).hub.get(`${glhId}|${period}`)
          const natTotal = monthly_(metricKey).national.get(period)
          let hubItem = 0
          let natItem = 0
          for (const s of itemised) {
            const v = at(s.key, period)
            hubItem += v.hub ?? 0
            natItem += v.national ?? 0
          }
          return {
            period,
            hub: hubTotal == null ? undefined : Math.max(0, hubTotal - hubItem),
            national: natTotal == null ? undefined : Math.max(0, natTotal - natItem),
          }
        })

        // A sub-category with no monthly rows at all (yearly source, or simply
        // unreported here) is left out, so the panel falls back to the metric.
        if (monthly.every((m) => m.hub == null && m.national == null)) continue

        out[slice.key] = {
          count: monthly.map((m) => ({
            month: monthLabel(m.period),
            hub: m.hub ?? null,
            national: m.national != null ? Math.round(m.national / GLH_META.length) : null,
          })),
          per1k: monthly.map((m) => ({
            month: monthLabel(m.period),
            hub: pop > 0 && m.hub != null ? roundRate((m.hub / pop) * 1000) : null,
            national: natPop > 0 && m.national != null ? roundRate((m.national / natPop) * 1000) : null,
          })),
        }
      }
    }
    return out
  }

  /** monthly[] accessor, kept as a function so buildSubTrends reads clearly. */
  function monthly_(key: MetricKey): MonthlySeries {
    return monthly[key]
  }

  // --- Assemble the 7 hubs (always all of them; missing data → 0) ---
  const hubs: Hub[] = GLH_META.map((meta) => {
    const pop = popByGlh.get(meta.id) ?? 0
    const prev = totalPrevByGlh.get(meta.id) ?? 0
    const total = totalByGlh.get(meta.id) ?? 0
    const cancer = cancerByGlh.get(meta.id) ?? 0
    const rare = rareByGlh.get(meta.id) ?? 0
    const per1k = pop > 0 ? (total / pop) * 1000 : 0
    const subCategories = {
      cancer: buildBreakdown('cancer', cancerBySubGlh.get(meta.id), cancer, pop, meta.name),
      rare: buildBreakdown('rare', rareBySubGlh.get(meta.id), rare, pop, meta.name),
    }

    return {
      id: meta.id,
      name: meta.name,
      hubName: meta.hubName,
      provider: meta.provider,
      catchmentM: round1(pop / 1_000_000),
      population: pop,
      totalActivity: total,
      cancerActivity: cancer,
      rareActivity: rare,
      per1k: round2(per1k),
      yoyGrowth: hasYoY && prev > 0 ? round1(((total - prev) / prev) * 100) : 0,
      perVsNat: national.per1k > 0 ? round1(((per1k - national.per1k) / national.per1k) * 100) : 0,
      trends: buildTrends(meta.id),
      subCategories,
      subTrends: buildSubTrends(meta.id, subCategories),
    }
  })

  return { hubs, national, genes: buildGeneActivity(rows) }
}
