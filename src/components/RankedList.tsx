import type { Hub, MetricKey } from '../types'
import { METRICS, metricValue } from '../data/metrics'

interface Props {
  hubs: Hub[]
  metric: MetricKey
  selectedId: string
  onSelect: (id: string) => void
}

export default function RankedList({ hubs, metric, selectedId, onSelect }: Props) {
  const def = METRICS[metric]
  const ranked = [...hubs].sort((a, b) => {
    const av = metricValue(a, metric)
    const bv = metricValue(b, metric)
    return def.lowerIsBetter ? av - bv : bv - av
  })

  return (
    <div className="ranked">
      <div className="eyebrow ranked__head">Ranked · {def.longLabel}</div>
      <ol className="ranked__list">
        {ranked.map((h, i) => {
          const selected = h.id === selectedId
          return (
            <li key={h.id}>
              <button
                className={`ranked__row${selected ? ' ranked__row--selected' : ''}`}
                onClick={() => onSelect(h.id)}
              >
                <span className="ranked__rank tnum">{i + 1}</span>
                <span className="ranked__name">
                  {h.name}
                  <span className="ranked__prov">{h.provider}</span>
                </span>
                <span className="ranked__val tnum">{def.format(metricValue(h, metric))}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
