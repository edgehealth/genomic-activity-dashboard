import type { Hub, MetricView, NationalSummary } from '../types'
import { METRICS, resolveMeasure, subCategoriesFor } from '../data/metrics'

interface Row {
  label: string
  hubValue: string
  natValue: string
  /** hub position 0..1 along the bar. */
  hubPos: number
  /** national mean position 0..1 (dashed marker). */
  natPos: number
  /** signed delta vs national, formatted. */
  delta: string
  better: boolean
}

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')

function pct(v: number, lo: number, hi: number) {
  if (hi <= lo) return 0.5
  return Math.max(0.04, Math.min(0.96, (v - lo) / (hi - lo)))
}

/** Build a "higher is better" row comparing a hub value to the national mean. */
function compareRow(label: string, hubVal: number, natMean: number, format: (v: number) => string): Row {
  const deltaPct = natMean > 0 ? ((hubVal - natMean) / natMean) * 100 : 0
  // Scale the bar so the national mean sits at the midpoint.
  const hi = natMean > 0 ? natMean * 2 : Math.max(hubVal, 1)
  return {
    label,
    hubValue: format(hubVal),
    natValue: `Nat ${format(natMean)}`,
    hubPos: pct(hubVal, 0, hi),
    natPos: pct(natMean, 0, hi),
    delta: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`,
    better: hubVal >= natMean,
  }
}

interface Props {
  hub: Hub
  national: NationalSummary
  view: MetricView
}

export default function PerformanceBars({ hub, national, view }: Props) {
  const n = national.hubCount || 7
  const perThousand = view.basis === 'per1k'
  const rate = (count: number, pop: number) => (pop > 0 ? (count / pop) * 1000 : 0)

  // Rows follow the basis: counts compare against the England per-hub mean,
  // per-1,000 against the England population-weighted rate.
  const rows: Row[] = perThousand
    ? [
        compareRow('Total genomic tests per 1,000', hub.per1k, national.per1k, (v) => v.toFixed(1)),
        compareRow(
          'Cancer genomic tests per 1,000',
          rate(hub.cancerActivity, hub.population),
          rate(national.cancerActivity, national.population),
          (v) => v.toFixed(1),
        ),
        compareRow(
          'Rare & inherited disease per 1,000',
          rate(hub.rareActivity, hub.population),
          rate(national.rareActivity, national.population),
          (v) => v.toFixed(1),
        ),
      ]
    : [
        compareRow('Total genomic tests (12m)', hub.totalActivity, national.totalActivity / n, fmt),
        compareRow('Cancer genomic tests (12m)', hub.cancerActivity, national.cancerActivity / n, fmt),
        compareRow('Rare & inherited disease activity (12m)', hub.rareActivity, national.rareActivity / n, fmt),
      ]

  // When a sub-category is drilled into, lead with it. Omitted when this hub
  // doesn't report it, since there is nothing to compare against.
  const breakdown = METRICS[view.metric].breakdown
  if (breakdown && view.subCategory) {
    const measure = resolveMeasure(view)
    const hubValue = measure.value(hub)
    const natSlice = subCategoriesFor(national, view.metric).find((t) => t.key === view.subCategory)
    if (hubValue !== null && natSlice) {
      const natMean = perThousand ? natSlice.per1k : natSlice.value / n
      rows.unshift(compareRow(measure.longLabel, hubValue, natMean, measure.format))
    }
  }

  return (
    <div className="perf">
      {rows.map((r) => (
        <div className="perf__row" key={r.label}>
          <div className="perf__top">
            <span className="perf__label">{r.label}</span>
            <span className="perf__vals tnum">
              <strong>{r.hubValue}</strong>
              <span className="perf__nat">{r.natValue}</span>
            </span>
          </div>
          <div className="perf__track">
            <div
              className={`perf__fill${r.better ? '' : ' perf__fill--bad'}`}
              style={{ width: `${r.hubPos * 100}%` }}
            />
            <div className="perf__natmark" style={{ left: `${r.natPos * 100}%` }} aria-hidden />
          </div>
          <div className={`perf__delta ${r.better ? 'delta-good' : 'delta-bad'}`}>
            {r.better ? '▲' : '▼'} {r.delta} vs national · {r.better ? 'above' : 'below'} mean
          </div>
        </div>
      ))}
    </div>
  )
}
