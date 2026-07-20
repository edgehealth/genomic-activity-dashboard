import type { Hub, NationalSummary } from '../types'

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

export default function PerformanceBars({ hub, national }: { hub: Hub; national: NationalSummary }) {
  const n = national.hubCount || 7
  const rows: Row[] = [
    compareRow('Activity per 1,000 population', hub.per1k, national.per1k, (v) => v.toFixed(1)),
    compareRow('Total activity (12m)', hub.totalActivity, national.totalActivity / n, fmt),
    compareRow('Cancer activity (12m)', hub.cancerActivity, national.cancerActivity / n, fmt),
    compareRow('Rare disease activity (12m)', hub.rareActivity, national.rareActivity / n, fmt),
  ]

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
