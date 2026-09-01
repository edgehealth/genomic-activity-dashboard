import type { Basis, Hub, MetricKey, MetricView, NationalSummary } from '../types'
import {
  BASES,
  BASIS_LABEL,
  METRIC_ORDER,
  METRICS,
  resolveMeasure,
  subCategoriesFor,
} from '../data/metrics'
import RegionMap from './RegionMap'
import RankedList from './RankedList'

/** Control label per metric. Total has no breakdown, so it stays generic. */
const SUBCATEGORY_LABEL: Record<MetricKey, string> = {
  total: 'Type',
  cancer: 'Cancer type',
  rare: 'Disease type',
}

interface Props {
  hubs: Hub[]
  view: MetricView
  /** England summary — its breakdowns populate the sub-category dropdown. */
  national: NationalSummary
  selectedId: string
  selectedIcb: string | null
  onSelectMetric: (m: MetricKey) => void
  onSelectSubCategory: (key: string | null) => void
  onSelectBasis: (b: Basis) => void
  onSelectHub: (id: string) => void
  onSelectIcb: (icbCode: string, glhId: string) => void
}

export default function MapPanel({
  hubs,
  view,
  national,
  selectedId,
  selectedIcb,
  onSelectMetric,
  onSelectSubCategory,
  onSelectBasis,
  onSelectHub,
  onSelectIcb,
}: Props) {
  const measure = resolveMeasure(view)
  const options = subCategoriesFor(national, view.metric)
  // Total has no breakdown: the control stays in place but disabled, so the
  // row doesn't reflow when switching metrics.
  const canDrill = options.length > 0
  const drilled = view.subCategory !== null

  return (
    <section className="panel mappanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Genomic Laboratory Hubs — England</h3>
          <p className="panel__sub">
            {/* Not lower-cased: sub-category labels are proper nouns
                ("Audiology", "CNS Cancer") and read wrong in lower case. */}
            Shaded by {measure.longLabel}. Click an ICB to see its hub's detail.
          </p>
        </div>
        <div className="toggle" role="tablist" aria-label="Map metric">
          {METRIC_ORDER.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={m === view.metric}
              className={`toggle__btn${m === view.metric ? ' toggle__btn--on' : ''}`}
              onClick={() => onSelectMetric(m)}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>

      <div className="subctl">
        <label className="subctl__group">
          <span className="subctl__label">{SUBCATEGORY_LABEL[view.metric]}</span>
          <select
            className="subctl__select"
            value={view.subCategory ?? ''}
            disabled={!canDrill}
            title={
              canDrill ? undefined : 'Total genomic testing activity has no sub-category breakdown'
            }
            onChange={(e) => onSelectSubCategory(e.target.value || null)}
          >
            <option value="">
              {canDrill ? `All ${METRICS[view.metric].label.toLowerCase()}` : 'Not applicable'}
            </option>
            {options.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <div className="subctl__group">
          <span className="subctl__label">Measure</span>
          <div className="toggle toggle--sm" role="tablist" aria-label="Measure basis">
            {BASES.map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={b === view.basis}
                className={`toggle__btn${b === view.basis ? ' toggle__btn--on' : ''}`}
                onClick={() => onSelectBasis(b)}
              >
                {BASIS_LABEL[b]}
              </button>
            ))}
          </div>
        </div>

        {drilled && view.metric === 'cancer' && (
          <p className="subctl__note">
            Central &amp; South reports no cancer-type detail, so it shows as no data.
          </p>
        )}
      </div>

      <div className="mappanel__body">
        <div className="mappanel__map">
          <RegionMap
            hubs={hubs}
            view={view}
            selectedId={selectedId}
            selectedIcb={selectedIcb}
            onSelectIcb={onSelectIcb}
          />
          <div className="legend">
            <span>Lower</span>
            <span className="legend__bar" aria-hidden />
            <span>Higher</span>
            {drilled && (
              <span className="legend__nodata">
                <span className="legend__nodataswatch" aria-hidden /> no data
              </span>
            )}
          </div>
        </div>
        <RankedList hubs={hubs} view={view} selectedId={selectedId} onSelect={onSelectHub} />
      </div>
    </section>
  )
}
