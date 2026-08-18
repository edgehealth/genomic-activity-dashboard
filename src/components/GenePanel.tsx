import { useMemo, useState } from 'react'
import type { GeneActivity } from '../types'
import {
  ALL_CANCER_TYPES,
  geneTableRows,
  totalTests,
  type GeneSortKey,
} from '../data/genes'

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')

interface Props {
  genes: GeneActivity
  /** Name of the hub selected elsewhere on the page, for the scope note. */
  selectedHubName: string
}

export default function GenePanel({ genes, selectedHubName }: Props) {
  const [year, setYear] = useState<number | null>(genes.defaultYear)
  const [search, setSearch] = useState('')
  const [cancerType, setCancerType] = useState<string>(ALL_CANCER_TYPES)
  const [sortKey, setSortKey] = useState<GeneSortKey>('tests')
  const [sortDesc, setSortDesc] = useState(true)

  const activeYear = genes.years.find((y) => y.year === year)
  const rows = useMemo(
    () => geneTableRows(activeYear, { search, cancerType, sortKey, sortDesc }),
    [activeYear, search, cancerType, sortKey, sortDesc],
  )

  function sortBy(key: GeneSortKey) {
    if (key === sortKey) {
      setSortDesc(!sortDesc)
    } else {
      setSortKey(key)
      setSortDesc(key === 'tests')
    }
  }

  const ariaSort = (key: GeneSortKey) =>
    sortKey === key ? (sortDesc ? 'descending' : 'ascending') : 'none'

  if (genes.years.length === 0) {
    return (
      <section className="panel">
        <h3 className="panel__title">Gene-level testing activity</h3>
        <p className="panel__sub">No gene-level rows in the source feed.</p>
      </section>
    )
  }

  return (
    <section className="panel genepanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Gene-level testing activity</h3>
          <p className="panel__sub">
            Tests including each gene, England-wide. Search or sort to find a gene.
          </p>
        </div>
        <div className="genepanel__controls">
          <label className="genepanel__field">
            <span>Year</span>
            <select value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
              {genes.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                  {y.partial ? ' (partial)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="genepanel__field">
            <span>Cancer type</span>
            <select value={cancerType} onChange={(e) => setCancerType(e.target.value)}>
              <option value={ALL_CANCER_TYPES}>All cancer types</option>
              {(activeYear?.cancerTypes ?? genes.cancerTypes).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="genepanel__field">
            <span>Gene</span>
            <input
              type="search"
              value={search}
              placeholder="e.g. BRAF"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* The extract has no GLH dimension, so this panel cannot honour the
          region selection. Say so explicitly — showing England figures inside a
          page scoped to one hub would otherwise be read as that hub's numbers. */}
      <p className="genepanel__scope" role="note">
        <strong>England-wide figures.</strong> The gene-level extract carries no Genomic
        Laboratory Hub breakdown, so this table is not filtered by your selected region
        ({selectedHubName}). It is also reported yearly for 2016–2021, a different period
        from the 12-month activity above.
        {activeYear?.partial && (
          <>
            {' '}
            <strong>{activeYear.year} is partial</strong> — it covers{' '}
            {activeYear.cancerTypes.length} of {genes.cancerTypes.length} cancer types, so
            totals are not comparable with complete years.
          </>
        )}
      </p>

      <div className="genetable__wrap">
        <table className="genetable">
          <caption className="genetable__caption">
            {fmt(rows.length)} gene{rows.length === 1 ? '' : 's'} ·{' '}
            {fmt(totalTests(rows))} tests
            {cancerType === ALL_CANCER_TYPES ? ' across all cancer types' : ` · ${cancerType}`}
            {activeYear ? ` · ${activeYear.year}` : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={ariaSort('gene')}>
                <button type="button" className="genetable__sort" onClick={() => sortBy('gene')}>
                  Gene {sortKey === 'gene' ? (sortDesc ? '▼' : '▲') : ''}
                </button>
              </th>
              <th scope="col" className="genetable__num" aria-sort={ariaSort('tests')}>
                <button type="button" className="genetable__sort" onClick={() => sortBy('tests')}>
                  Tests {sortKey === 'tests' ? (sortDesc ? '▼' : '▲') : ''}
                </button>
              </th>
              <th scope="col" className="genetable__num">
                Share of cancer type
              </th>
              <th scope="col">Cancer type</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="genetable__empty">
                  No genes match “{search}”.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.gene}>
                <td className="genetable__gene">{r.gene}</td>
                <td className="genetable__num tnum">{fmt(r.tests)}</td>
                <td className="genetable__num tnum">
                  {r.sharePct != null ? (
                    `${r.sharePct.toFixed(1)}%`
                  ) : (
                    <span
                      className="genetable__muted"
                      title="Each cancer type has its own denominator, so a share is only meaningful within a single type."
                    >
                      —
                    </span>
                  )}
                </td>
                <td className="genetable__type">
                  {r.cancerType ?? `${r.cancerTypeCount} cancer types`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
