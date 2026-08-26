import type {
  Basis,
  BreakdownKey,
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
  const rate = (v: number) => (pop > 0 ? round2((v / pop) * 1000) : 0)

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

export interface GenomicsData {
  hubs: Hub[]
  national: NationalSummary
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
          hub: pop > 0 && hubCount != null ? round2((hubCount / pop) * 1000) : null,
          national: natPop > 0 && natCount != null ? round2((natCount / natPop) * 1000) : null,
        }
      })

    const forMetric = (key: MetricKey) => ({ count: series(key, 'count'), per1k: series(key, 'per1k') })
    return { total: forMetric('total'), cancer: forMetric('cancer'), rare: forMetric('rare') }
  }

  // --- Assemble the 7 hubs (always all of them; missing data → 0) ---
  const hubs: Hub[] = GLH_META.map((meta) => {
    const pop = popByGlh.get(meta.id) ?? 0
    const prev = totalPrevByGlh.get(meta.id) ?? 0
    const total = totalByGlh.get(meta.id) ?? 0
    const cancer = cancerByGlh.get(meta.id) ?? 0
    const rare = rareByGlh.get(meta.id) ?? 0
    const per1k = pop > 0 ? (total / pop) * 1000 : 0

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
      subCategories: {
        cancer: buildBreakdown('cancer', cancerBySubGlh.get(meta.id), cancer, pop, meta.name),
        rare: buildBreakdown('rare', rareBySubGlh.get(meta.id), rare, pop, meta.name),
      },
    }
  })

  return { hubs, national }
}
