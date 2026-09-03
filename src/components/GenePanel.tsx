import { useMemo, useState } from 'react'
import type { GeneActivity } from '../types'
import { icbByCode } from '../data/icbToGlh'
import {
  ALL_CANCER_TYPES,
  geneTableRows,
  totalTests,
  type GeneSortKey,
} from '../data/genes'

const fmt = (v: number) => Math.round(v).toLocaleString('en-GB')

interface Props {
  genes: GeneActivity
  /**
   * Selected ICB, lifted so the map above and this table stay in step.
   * '' = England, from gen_11 (all years, gene x cancer site). A GSS code =
   * that ICB, from gen_16/gen_17 (latest year only), which has no per-gene site
   * split — hence the separate site breakdown below.
   */
  icbCode: string
  onSelectIcb: (code: string) => void
}

export default function GenePanel({ genes, icbCode, onSelectIcb }: Props) {
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

  const icbOptions = useMemo(
    () =>
      Object.keys(genes.icb.byIcb)
        .map((code) => ({ code, name: icbByCode[code]?.icbName ?? code }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [genes.icb.byIcb],
  )

  const icbRows = useMemo(() => {
    if (!icbCode) return null
    const q = search.trim().toLowerCase()
    const all = genes.icb.byIcb[icbCode] ?? []
    const filtered = q ? all.filter((r) => r.label.toLowerCase().includes(q)) : all
    return [...filtered].sort((a, b) =>
      sortKey === 'gene'
        ? a.label.localeCompare(b.label) * (sortDesc ? -1 : 1)
        : (a.tests - b.tests) * (sortDesc ? -1 : 1),
    )
  }, [icbCode, genes.icb.byIcb, search, sortKey, sortDesc])

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

  const icbName = icbCode ? (icbByCode[icbCode]?.icbName ?? icbCode) : null

  return (
    <section className="panel genepanel">
      <div className="mappanel__head">
        <div>
          <h3 className="panel__title">Gene-level testing activity</h3>
          <p className="panel__sub">
            Tests including each gene{icbName ? ` in ${icbName}` : ', England-wide'}. Search
            or sort to find a gene.
          </p>
        </div>
        <div className="genepanel__controls">
          <label className="genepanel__field">
            <span>Area</span>
            <select value={icbCode} onChange={(e) => onSelectIcb(e.target.value)}>
              <option value="">England (all ICBs)</option>
              {icbOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="genepanel__field">
            <span>Year</span>
            {/* ICB figures are published for a single year, so the picker is
                pinned rather than offering years that would return nothing. */}
            <select
              value={icbCode ? (genes.icb.year ?? '') : (year ?? '')}
              disabled={!!icbCode}
              title={icbCode ? 'ICB figures are published for one year only' : undefined}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {icbCode
                ? genes.icb.year != null && (
                    <option value={genes.icb.year}>{genes.icb.year}</option>
                  )
                : genes.years.map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                      {y.partial ? ' (partial)' : ''}
                    </option>
                  ))}
            </select>
          </label>
          <label className="genepanel__field">
            <span>Cancer type</span>
            <select
              value={cancerType}
              disabled={!!icbCode}
              title={
                icbCode
                  ? 'The ICB extract has no per-gene cancer-site split — see the site breakdown below'
                  : undefined
              }
              onChange={(e) => setCancerType(e.target.value)}
            >
              <option value={ALL_CANCER_TYPES}>All cancer types</option>
              {(activeYear?.cancerTypes ?? genes.cancerTypes).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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

      {/* Different dataset and period from the GLH activity tab, so these
          totals will not tie back to its KPIs. Say so rather than let it be
          assumed. */}
      <p className="genepanel__scope" role="note">
        <strong>A different dataset.</strong> These are NDRS cancer registry gene counts,
        reported yearly — not the Genomic Laboratory Hub activity return, so the totals are
        not comparable with the GLH activity tab.
        {icbCode ? (
          <> ICB figures cover {genes.icb.year} only.</>
        ) : (
          activeYear?.partial && (
            <>
              {' '}
              <strong>{activeYear.year} is partial</strong> — it covers{' '}
              {activeYear.cancerTypes.length} of {genes.cancerTypes.length} cancer types, so
              totals are not comparable with complete years.
            </>
          )
        )}
      </p>

      {icbRows ? (
        <>
          <div className="genetable__wrap">
            <table className="genetable">
              <caption className="genetable__caption">
                {fmt(icbRows.length)} gene{icbRows.length === 1 ? '' : 's'} ·{' '}
                {fmt(genes.icb.totalByIcb[icbCode] ?? 0)} tests · {icbName}
                {genes.icb.year != null ? ` · ${genes.icb.year}` : ''}
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
                    Share of ICB
                  </th>
                </tr>
              </thead>
              <tbody>
                {icbRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="genetable__empty">
                      No genes match “{search}”.
                    </td>
                  </tr>
                )}
                {icbRows.map((r) => (
                  <tr key={r.label}>
                    <td className="genetable__gene">{r.label}</td>
                    <td className="genetable__num tnum">{fmt(r.tests)}</td>
                    <td className="genetable__num tnum">{(r.share * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* gen_16 carries no per-gene site split, so the site cut is shown
              alongside rather than folded into the table above. */}
          <div className="genesites">
            <h4 className="genesites__title">Cancer sites in {icbName}</h4>
            <div className="genesites__rows">
              {(genes.icb.sitesByIcb[icbCode] ?? []).map((r) => (
                <div className="genesites__row" key={r.label}>
                  <span className="genesites__label">{r.label}</span>
                  <span className="genesites__bar" aria-hidden>
                    <span className="genesites__fill" style={{ width: `${r.share * 100}%` }} />
                  </span>
                  <span className="genesites__val tnum">
                    {fmt(r.tests)} · {(r.share * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
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
      )}
    </section>
  )
}
