import type { Hub, MetricKey } from '../types'
import { METRIC_ORDER, METRICS } from '../data/metrics'
import RegionMap from './RegionMap'
import RankedList from './RankedList'

interface Props {
  hubs: Hub[]
  metric: MetricKey
  selectedId: string
  selectedIcb: string | null
  onSelectMetric: (m: MetricKey) => void
  onSelectHub: (id: string) => void
  onSelectIcb: (icbCode: string, glhId: string) => void
}

export default function MapPanel({ hubs, metric, selectedId, selectedIcb, onSelectMetric, onSelectHub, onSelectIcb }: Props) {
  return (
    <section className="panel mappanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Genomic Laboratory Hubs — England</h3>
          <p className="panel__sub">Shaded by selected metric. Click an ICB to see its hub's detail.</p>
        </div>
        <div className="toggle" role="tablist" aria-label="Map metric">
          {METRIC_ORDER.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={m === metric}
              className={`toggle__btn${m === metric ? ' toggle__btn--on' : ''}`}
              onClick={() => onSelectMetric(m)}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mappanel__body">
        <div className="mappanel__map">
          <RegionMap
            hubs={hubs}
            metric={metric}
            selectedId={selectedId}
            selectedIcb={selectedIcb}
            onSelectIcb={onSelectIcb}
          />
          <div className="legend">
            <span>Lower</span>
            <span className="legend__bar" aria-hidden />
            <span>Higher</span>
          </div>
        </div>
        <RankedList hubs={hubs} metric={metric} selectedId={selectedId} onSelect={onSelectHub} />
      </div>
    </section>
  )
}
