import { useMemo } from 'react'
import type { GeneActivity, Hub, MetricView } from '../types'
import { icbByCode } from '../data/icbToGlh'
import RegionMap from './RegionMap'

// ---------------------------------------------------------------------------
// ICB map for the gene tab.
//
// Unlike the GLH map, this shades each ICB by its OWN figure — gen_16/gen_17
// are genuinely ICB-level, so every ICB in a hub no longer shares one value.
// RegionMap does the drawing; this supplies the per-ICB lookup and the ranked
// list beside it.
//
// Counts only. A per-1,000 basis would need ICB population, and the feed
// carries population at GLH level only (the gen_07/gen_12 denominator) — so
// the toggle is deliberately absent rather than present and empty. Adding an
// ICB-population metric to the view would unlock it.
// ---------------------------------------------------------------------------

const format = (v: number) => Math.round(v).toLocaleString('en-GB')

interface Props {
  genes: GeneActivity
  hubs: Hub[]
  selectedIcb: string | null
  onSelectIcb: (icbCode: string) => void
}

export default function GeneMapPanel({ genes, hubs, selectedIcb, onSelectIcb }: Props) {
  const valueFor = useMemo(() => {
    return (icbCode: string): number | null => genes.icb.totalByIcb[icbCode] ?? null
  }, [genes.icb.totalByIcb])

  const ranked = useMemo(
    () =>
      Object.keys(genes.icb.totalByIcb)
        .map((code) => ({
          code,
          name: icbByCode[code]?.icbName ?? code,
          value: valueFor(code),
        }))
        .sort((a, b) => {
          if (a.value === null && b.value === null) return a.name.localeCompare(b.name)
          if (a.value === null) return 1
          if (b.value === null) return -1
          return b.value - a.value
        }),
    [genes.icb.totalByIcb, valueFor],
  )

  // The map needs a parent GLH to outline; follow the selected ICB so the
  // grouping lines stay meaningful, and default to the first hub otherwise.
  const selectedGlhId = selectedIcb ? (icbByCode[selectedIcb]?.glhId ?? hubs[0]?.id) : hubs[0]?.id
  const view: MetricView = { metric: 'total', subCategory: null, basis: 'count' }

  return (
    <section className="panel mappanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Gene testing by ICB (2022)</h3>
          <p className="panel__sub">
            Total tests across all cancer sites
            {genes.icb.year != null ? `, ${genes.icb.year}` : ''}. Click an ICB to filter the
            table below.
          </p>
        </div>
      </div>

      <div className="mappanel__body">
        <div className="mappanel__map">
          <RegionMap
            hubs={hubs}
            view={view}
            selectedId={selectedGlhId ?? ''}
            selectedIcb={selectedIcb}
            onSelectIcb={(icbCode) => onSelectIcb(icbCode)}
            icbValue={valueFor}
            formatIcbValue={format}
          />
          <div className="legend">
            <span>Lower</span>
            <span className="legend__bar" aria-hidden />
            <span>Higher</span>
            <span className="legend__nodata">
              <span className="legend__nodataswatch" aria-hidden /> no data
            </span>
          </div>
        </div>

        <div className="ranked">
          <div className="ranked__head">
            <div className="eyebrow ranked__headline">Ranked · ICB</div>
            <div className="ranked__basis">Tests, all cancer sites</div>
          </div>
          <ol className="ranked__list">
            {ranked.map((r, i) => (
              <li key={r.code}>
                <button
                  className={`ranked__row${r.code === selectedIcb ? ' ranked__row--selected' : ''}${
                    r.value === null ? ' ranked__row--nodata' : ''
                  }`}
                  onClick={() => onSelectIcb(r.code)}
                >
                  <span className="ranked__rank tnum">{r.value === null ? '·' : i + 1}</span>
                  <span className="ranked__name">{r.name}</span>
                  <span className="ranked__val tnum">
                    {r.value === null ? '—' : format(r.value)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
