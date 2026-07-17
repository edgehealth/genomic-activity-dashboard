import type { Hub, IcbInfo } from '../types'
import PerformanceBars from './PerformanceBars'
import TrendChart from './TrendChart'

interface Props {
  hub: Hub
  /** Set when the hub was reached by clicking an ICB on the map. */
  icb?: IcbInfo
}

export default function DetailPanel({ hub, icb }: Props) {
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
        <div className="detail__badges">
          {hub.accreditations.map((a) => (
            <span className="badge" key={a}>{a}</span>
          ))}
        </div>
      </div>

      <div className="detail__stats">
        <div className="stat">
          <div className="stat__label">Total tests (12m)</div>
          <div className="stat__value tnum">{hub.totalTests.toLocaleString('en-GB')}</div>
          <div className="stat__foot delta-good">▲ {hub.yoyGrowth}% YoY</div>
        </div>
        <div className="stat">
          <div className="stat__label">Tests per 100k</div>
          <div className="stat__value tnum">{hub.testsPer100k.toLocaleString('en-GB')}</div>
          <div className={`stat__foot ${hub.per100kVsNat >= 0 ? 'delta-good' : 'delta-bad'}`}>
            {hub.per100kVsNat >= 0 ? '▲' : '▼'} {Math.abs(hub.per100kVsNat)}% vs nat
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Median TAT</div>
          <div className="stat__value tnum">{hub.medianTat.toFixed(1)}<span className="stat__unit">d</span></div>
        </div>
        <div className="stat">
          <div className="stat__label">Within TAT standard</div>
          <div className="stat__value tnum">{hub.tatPct.toFixed(1)}<span className="stat__unit">%</span></div>
        </div>
      </div>

      <div className="detail__section">
        <h4 className="detail__sectitle">Performance vs national average</h4>
        <p className="detail__secsub">Dashed line marks the population-weighted England mean.</p>
        <PerformanceBars hub={hub} />
      </div>

      <div className="detail__section">
        <h4 className="detail__sectitle">12-month activity trend</h4>
        <p className="detail__secsub">Tests per 100k over time, this hub vs England.</p>
        <TrendChart data={hub.trend} />
      </div>
    </aside>
  )
}
