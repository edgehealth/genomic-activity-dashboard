import type { Hub, MetricKey, NationalSummary, TrendPoint } from '../types'
import type { GenomicsRow } from '../services/genomicsApi'
import { GLH_META, resolveGlhId } from './glhMeta'

// ---------------------------------------------------------------------------
// Turn the long-format vw_genomics_metrics rows into the Hub[] + NationalSummary
// the UI consumes.
//
// Metric ids used here (see the view definition):
//   gen_01/02/03  national cancer / rare / total activity, monthly counts
//   gen_04/05/06  per-GLH cancer / rare / total activity, monthly counts
//   gen_07/12     per-GLH cancer / rare activity per 1,000 population, yearly
//                 (numerator = activity, denominator = GLH population)
//
// Aggregation rules from the view's notes:
//   • numerator is always additive — SUM freely.
//   • the rate denominators (gen_07/gen_12) are the GLH population repeated on
//     each yearly row, so we take population ONCE (per GLH, latest year) rather
//     than summing it.
// ---------------------------------------------------------------------------

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Format an epoch-ms timestamp as "Aug 25", reading the date in UTC. */
function monthLabel(ms: number): string {
  const d = new Date(ms)
  return `${MONTH_ABBR[d.getUTCMonth()] ?? '???'} ${String(d.getUTCFullYear()).slice(2)}`
}

const num = (v: number | null | undefined): number => (typeof v === 'number' ? v : 0)

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

const round1 = (v: number): number => Number(v.toFixed(1))

// ---------------------------------------------------------------------------
// Monthly series for the trend panel
// ---------------------------------------------------------------------------
// Each count metric has a per-GLH id and a matching national id, so the trend
// panel can plot hub vs England on whichever metric is selected.
const COUNT_SOURCES = {
  total: { hub: 'gen_06', national: 'gen_03' },
  cancer: { hub: 'gen_04', national: 'gen_01' },
  rare: { hub: 'gen_05', national: 'gen_02' },
} as const

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

/** Sum numerator (national metric, glh is null) over an allowed set of periods. */
function sumNational(rows: GenomicsRow[], metricId: string, periods: Set<number>): number {
  let total = 0
  for (const r of rows) {
    if (r.metric_id === metricId && periods.has(r.time_period)) total += num(r.numerator)
  }
  return total
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

  // --- Latest full year for the per-1,000 rate metrics ---
  const rateYears = periodsDesc(rows, 'gen_07')
  const latestYear = new Set(rateYears.slice(0, 1))

  // --- Monthly count sums per GLH (latest 12 months) ---
  const totalByGlh = sumPerGlh(rows, 'gen_06', last12)
  const cancerByGlh = sumPerGlh(rows, 'gen_04', last12)
  const rareByGlh = sumPerGlh(rows, 'gen_05', last12)
  const totalPrevByGlh = sumPerGlh(rows, 'gen_06', prev12)

  // --- Per-1,000 rate inputs (latest year): numerators + population (once) ---
  const cancerRateNum = sumPerGlh(rows, 'gen_07', latestYear)
  const rareRateNum = sumPerGlh(rows, 'gen_12', latestYear)
  // Population = denominator of the rate rows; identical across gen_07/gen_12,
  // so take it once per GLH from whichever rows are present.
  const popByGlh = new Map<string, number>()
  for (const r of rows) {
    if ((r.metric_id !== 'gen_07' && r.metric_id !== 'gen_12') || !latestYear.has(r.time_period)) continue
    const id = resolveGlhId(r.glh)
    if (!id || r.denominator == null) continue
    if (!popByGlh.has(id)) popByGlh.set(id, num(r.denominator))
  }

  // --- National monthly totals ---
  const natTotal = sumNational(rows, 'gen_03', last12)
  const natCancer = sumNational(rows, 'gen_01', last12)
  const natRare = sumNational(rows, 'gen_02', last12)
  const natTotalPrev = sumNational(rows, 'gen_03', prev12)

  // National per-1,000 = national activity / national population * 1000.
  let natRateNum = 0
  let natPop = 0
  for (const [id, pop] of popByGlh) {
    natPop += pop
    natRateNum += (cancerRateNum.get(id) ?? 0) + (rareRateNum.get(id) ?? 0)
  }
  const nationalPer1k = natPop > 0 ? (natRateNum / natPop) * 1000 : 0

  const national: NationalSummary = {
    totalActivity: natTotal,
    cancerActivity: natCancer,
    rareActivity: natRare,
    hubCount: GLH_META.length,
    per1k: Number(nationalPer1k.toFixed(2)),
    yoyGrowth: hasYoY && natTotalPrev > 0
      ? Number((((natTotal - natTotalPrev) / natTotalPrev) * 100).toFixed(1))
      : 0,
  }

  // --- Monthly series behind the trend panel, one per metric ---------------
  // The panel plots whichever metric is selected on the map toggle, so every
  // metric needs its own hub + England series.
  const monthly: Record<'total' | 'cancer' | 'rare', MonthlySeries> = {
    total: monthlySeries(rows, COUNT_SOURCES.total),
    cancer: monthlySeries(rows, COUNT_SOURCES.cancer),
    rare: monthlySeries(rows, COUNT_SOURCES.rare),
  }

  // England denominator for the per-1,000 series: the population of the hubs
  const ratedGlhIds = GLH_META.map((m) => m.id).filter((id) => (popByGlh.get(id) ?? 0) > 0)
  const ratedPop = ratedGlhIds.reduce((sum, id) => sum + (popByGlh.get(id) ?? 0), 0)

  /** Build the four trend series for one hub. */
  function buildTrends(glhId: string): Record<MetricKey, TrendPoint[]> {
    const pop = popByGlh.get(glhId) ?? 0

    const counts = (key: 'total' | 'cancer' | 'rare'): TrendPoint[] =>
      trendMonths.map((period) => ({
        month: monthLabel(period),
        hub: monthly[key].hub.get(`${glhId}|${period}`) ?? null,
        national: monthly[key].national.get(period) ?? null,
      }))

    const per1k: TrendPoint[] = trendMonths.map((period) => {
      const hubCount = monthly.total.hub.get(`${glhId}|${period}`)
      const natCount = ratedGlhIds.reduce(
        (sum, id) => sum + (monthly.total.hub.get(`${id}|${period}`) ?? 0),
        0,
      )
      return {
        month: monthLabel(period),
        hub: pop > 0 && hubCount != null ? round1((hubCount / pop) * 1000) : null,
        national: ratedPop > 0 ? round1((natCount / ratedPop) * 1000) : null,
      }
    })

    return { total: counts('total'), cancer: counts('cancer'), rare: counts('rare'), per1k }
  }

  // --- Assemble the 7 hubs (always all of them; missing data → 0) ---
  const hubs: Hub[] = GLH_META.map((meta) => {
    const pop = popByGlh.get(meta.id) ?? 0
    const rateNum = (cancerRateNum.get(meta.id) ?? 0) + (rareRateNum.get(meta.id) ?? 0)
    const per1k = pop > 0 ? (rateNum / pop) * 1000 : 0
    const prev = totalPrevByGlh.get(meta.id) ?? 0
    const total = totalByGlh.get(meta.id) ?? 0

    return {
      id: meta.id,
      name: meta.name,
      hubName: meta.hubName,
      provider: meta.provider,
      accreditations: meta.accreditations,
      catchmentM: Number((pop / 1_000_000).toFixed(1)),
      totalActivity: total,
      cancerActivity: cancerByGlh.get(meta.id) ?? 0,
      rareActivity: rareByGlh.get(meta.id) ?? 0,
      per1k: Number(per1k.toFixed(1)),
      yoyGrowth: hasYoY && prev > 0 ? Number((((total - prev) / prev) * 100).toFixed(1)) : 0,
      perVsNat: national.per1k > 0 ? Number((((per1k - national.per1k) / national.per1k) * 100).toFixed(1)) : 0,
      trends: buildTrends(meta.id),
    }
  })

  return { hubs, national }
}
