import type { Hub } from '../types'
import { national } from '../data/hubs'

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

function pct(v: number, lo: number, hi: number) {
  return Math.max(0.04, Math.min(0.96, (v - lo) / (hi - lo)))
}

export default function PerformanceBars({ hub }: { hub: Hub }) {
  const rows: Row[] = [
    {
      label: 'Tests per 100k population',
      hubValue: hub.testsPer100k.toLocaleString('en-GB'),
      natValue: `Nat ${national.testsPer100k}`,
      hubPos: pct(hub.testsPer100k, 820, 1180),
      natPos: pct(national.testsPer100k, 820, 1180),
      delta: `${hub.per100kVsNat >= 0 ? '+' : ''}${hub.per100kVsNat}%`,
      better: hub.per100kVsNat >= 0,
    },
    {
      label: 'Median turnaround time',
      hubValue: `${hub.medianTat.toFixed(1)} d`,
      natValue: `Nat ${national.medianTat}`,
      // lower is better → invert the fill direction
      hubPos: 1 - pct(hub.medianTat, 15, 21),
      natPos: 1 - pct(national.medianTat, 15, 21),
      delta: `${(hub.medianTat - national.medianTat).toFixed(1)} d`,
      better: hub.medianTat <= national.medianTat,
    },
    {
      label: '% within TAT standard',
      hubValue: `${hub.tatPct.toFixed(1)}%`,
      natValue: `Nat ${national.tatPct}%`,
      hubPos: pct(hub.tatPct, 72, 86),
      natPos: pct(national.tatPct, 72, 86),
      delta: `${(hub.tatPct - national.tatPct >= 0 ? '+' : '')}${(hub.tatPct - national.tatPct).toFixed(1)}pp`,
      better: hub.tatPct >= national.tatPct,
    },
    {
      label: 'Year-on-year growth',
      hubValue: `${hub.yoyGrowth.toFixed(1)}%`,
      natValue: `Nat ${national.yoyGrowth}%`,
      hubPos: pct(hub.yoyGrowth, 8, 15),
      natPos: pct(national.yoyGrowth, 8, 15),
      delta: `${(hub.yoyGrowth - national.yoyGrowth >= 0 ? '+' : '')}${(hub.yoyGrowth - national.yoyGrowth).toFixed(1)}pp`,
      better: hub.yoyGrowth >= national.yoyGrowth,
    },
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
            {r.better ? '▲' : '▼'} {r.delta} vs national · {r.better ? 'better' : 'below'}
          </div>
        </div>
      ))}
    </div>
  )
}
