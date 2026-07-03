import type { Hub, MetricKey } from '../types'
import { METRIC_ORDER, METRICS } from '../data/hubs'
import RegionMap from './RegionMap'
import RankedList from './RankedList'

interface Props {
  hubs: Hub[]
  metric: MetricKey
  selectedId: string
  onSelectMetric: (m: MetricKey) => void
  onSelectHub: (id: string) => void
}

export default function MapPanel({ hubs, metric, selectedId, onSelectMetric, onSelectHub }: Props) {
  return (
    <section className="panel mappanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Genomic Laboratory Hubs — England</h3>
          <p className="panel__sub">Shaded by selected metric. Click a region for detail.</p>
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
          <RegionMap hubs={hubs} metric={metric} selectedId={selectedId} onSelect={onSelectHub} />
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
