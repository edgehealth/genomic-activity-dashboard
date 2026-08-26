import type { Hub, MetricView } from '../types'
import { resolveMeasure } from '../data/metrics'

interface Props {
  hubs: Hub[]
  view: MetricView
  selectedId: string
  onSelect: (id: string) => void
}

export default function RankedList({ hubs, view, selectedId, onSelect }: Props) {
  const measure = resolveMeasure(view)

  // Hubs with no value for the selected cancer type are not "worst" — they are
  // unranked, so they sort to the bottom regardless of direction and show "—".
  const ranked = [...hubs].sort((a, b) => {
    const av = measure.value(a)
    const bv = measure.value(b)
    if (av === null && bv === null) return a.name.localeCompare(b.name)
    if (av === null) return 1
    if (bv === null) return -1
    return measure.lowerIsBetter ? av - bv : bv - av
  })

  let rank = 0

  return (
    <div className="ranked">
      {/* Two fixed lines: the measure name, then the basis. Keeping the basis on
          its own line means switching Counts / Per 1,000 can't reflow the
          heading and shunt the rows below it up and down. */}
      <div className="ranked__head">
        <div className="eyebrow ranked__headline" title={`Ranked · ${measure.longLabel}`}>
          Ranked · {measure.name}
        </div>
        <div className="ranked__basis">{measure.basisLabel}</div>
      </div>
      <ol className="ranked__list">
        {ranked.map((h) => {
          const selected = h.id === selectedId
          const value = measure.value(h)
          if (value !== null) rank++
          return (
            <li key={h.id}>
              <button
                className={`ranked__row${selected ? ' ranked__row--selected' : ''}${
                  value === null ? ' ranked__row--nodata' : ''
                }`}
                onClick={() => onSelect(h.id)}
              >
                <span className="ranked__rank tnum">{value === null ? '·' : rank}</span>
                <span className="ranked__name">
                  {h.name}
                  <span className="ranked__prov">{h.provider}</span>
                </span>
                <span className="ranked__val tnum">
                  {value === null ? '—' : measure.format(value)}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
