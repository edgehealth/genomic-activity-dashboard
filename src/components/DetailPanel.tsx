import type { Hub, IcbInfo, NationalSummary, MetricView } from '../types'
import { TREND_COVERAGE, trendLabels } from '../data/metrics'
import PerformanceBars from './PerformanceBars'
import TrendChart from './TrendChart'

interface Props {
  hub: Hub
  national: NationalSummary
  /** What the map toggle is showing — the trend panel follows it. */
  view: MetricView
  /** Set when the hub was reached by clicking an ICB on the map. */
  icb?: IcbInfo
}

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')

export default function DetailPanel({ hub, national, view, icb }: Props) {
  const trend = trendLabels(view)
  return (
    <aside className="detail">
      <div className="detail__head">
        <div className="eyebrow">Genomic Laboratory Hub</div>
        <h2 className="detail__name">{hub.name}</h2>
        <div className="detail__hubname">{hub.hubName}</div>
        {icb && <div className="detail__icb">via {icb.icbName}</div>}
        <div className="detail__prov">
          {hub.provider} · catchment {hub.catchmentM}m
        </div>
      </div>

      <div className="detail__stats">
        <div className="stat">
          <div className="stat__label">Total activity (12m)</div>
          <div className="stat__value tnum">{fmt(hub.totalActivity)}</div>
          {hub.yoyGrowth !== 0 && (
            <div className={`stat__foot ${hub.yoyGrowth >= 0 ? 'delta-good' : 'delta-bad'}`}>
              {hub.yoyGrowth >= 0 ? '▲' : '▼'} {Math.abs(hub.yoyGrowth)}% YoY
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat__label">Activity per 1,000</div>
          <div className="stat__value tnum">{hub.per1k.toFixed(1)}</div>
          <div className={`stat__foot ${hub.perVsNat >= 0 ? 'delta-good' : 'delta-bad'}`}>
            {hub.perVsNat >= 0 ? '▲' : '▼'} {Math.abs(hub.perVsNat)}% vs nat
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Cancer activity (12m)</div>
          <div className="stat__value tnum">{fmt(hub.cancerActivity)}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Rare disease (12m)</div>
          <div className="stat__value tnum">{fmt(hub.rareActivity)}</div>
        </div>
      </div>

      <div className="detail__section">
        <h4 className="detail__sectitle">Performance vs national average</h4>
        <p className="detail__secsub">Dashed line marks the England mean across the 7 hubs.</p>
        <PerformanceBars hub={hub} national={national} view={view} />
      </div>

      <div className="detail__section">
        <h4 className="detail__sectitle">{trend.title}</h4>
        <p className="detail__secsub">
          {trend.subtitle}
          {view.subCategory !== null && ` ${TREND_COVERAGE[view.metric]}`}
        </p>
        <TrendChart data={hub.trends[view.metric][view.basis]} view={view} />
      </div>
    </aside>
  )
}
