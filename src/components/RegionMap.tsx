import type { Hub, MetricKey } from '../types'
import { metricValue } from '../data/hubs'

// ---------------------------------------------------------------------------
// SCHEMATIC map. These polygons are a stylised approximation of the seven
// English GLH regions — enough to be interactive and colour-coded, but NOT
// geographically accurate. Swap in real boundary GeoJSON to bring it to life
// (see README "Wiring in real data" → map).
// ---------------------------------------------------------------------------
const SHAPES: Record<string, { points: string; label: [number, number] }> = {
  'north-west': { points: '110,40 165,30 170,85 150,120 112,118 90,78', label: [128, 78] },
  'ney': { points: '165,30 216,52 222,120 170,132 150,120 170,85', label: [190, 82] },
  'east': { points: '222,120 250,165 244,222 196,224 180,178 170,132', label: [214, 178] },
  'central-south': { points: '110,118 150,120 170,132 180,178 172,216 126,214', label: [145, 168] },
  'south-west': { points: '126,214 150,256 122,306 78,324 62,290 96,246 108,200', label: [98, 268] },
  'north-thames': { points: '172,216 198,224 206,250 186,268 166,250', label: [186, 244] },
  'south-east': { points: '122,300 150,256 166,250 186,268 190,300 150,316', label: [152, 288] },
}

const LIGHT = [238, 244, 241]
const DARK = [14, 79, 75]

function scaleColor(t: number): string {
  const c = LIGHT.map((l, i) => Math.round(l + (DARK[i] - l) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

interface Props {
  hubs: Hub[]
  metric: MetricKey
  selectedId: string
  onSelect: (id: string) => void
}

export default function RegionMap({ hubs, metric, selectedId, onSelect }: Props) {
  const values = hubs.map((h) => metricValue(h, metric))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min))

  return (
    <svg className="map__svg" viewBox="0 0 300 350" role="group" aria-label="Map of English Genomic Laboratory Hub regions">
      {hubs.map((h) => {
        const shape = SHAPES[h.id]
        if (!shape) return null
        const t = 0.12 + norm(metricValue(h, metric)) * 0.88
        const selected = h.id === selectedId
        return (
          <polygon
            key={h.id}
            className={`map__region${selected ? ' map__region--selected' : ''}`}
            points={shape.points}
            fill={scaleColor(t)}
            onClick={() => onSelect(h.id)}
            tabIndex={0}
            role="button"
            aria-label={`${h.name} region`}
            aria-pressed={selected}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(h.id)
              }
            }}
          />
        )
      })}
      {/* Label the selected region, mirroring the reference layout. */}
      {(() => {
        const sel = hubs.find((h) => h.id === selectedId)
        const shape = sel && SHAPES[sel.id]
        if (!sel || !shape) return null
        return (
          <text className="map__label" x={shape.label[0]} y={shape.label[1]} textAnchor="middle">
            {sel.name}
          </text>
        )
      })()}
    </svg>
  )
}
