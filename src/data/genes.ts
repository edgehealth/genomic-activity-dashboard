import type { GeneRow, GeneYear } from '../types'

// ---------------------------------------------------------------------------
// Sorting / filtering for the gene-level activity table.
//
// The underlying data is one cell per (gene × cancer type). The table shows one
// row per gene, so with no cancer-type filter the cells are summed across types
// — and in that case a "share of tests" figure is meaningless, because each
// cancer type has its own denominator. Hence sharePct is null unless a single
// cancer type is selected. Do NOT substitute 0 there: 0% would read as "this
// gene is barely tested", which is the opposite of what a large multi-type
// total means.
// ---------------------------------------------------------------------------

export const ALL_CANCER_TYPES = 'all'

export type GeneSortKey = 'tests' | 'gene'

export interface GeneTableRow {
  gene: string
  /** Tests including this gene, within the current cancer-type filter. */
  tests: number
  /** Share of the cancer type's tests, only when one type is selected. */
  sharePct: number | null
  /** How many cancer types contributed to `tests`. */
  cancerTypeCount: number
  /** Cancer type name when exactly one contributed, else null. */
  cancerType: string | null
}

export interface GeneQuery {
  /** Free-text gene search, case-insensitive substring. */
  search: string
  /** A cancer type name, or ALL_CANCER_TYPES. */
  cancerType: string
  sortKey: GeneSortKey
  sortDesc: boolean
}

/** Build the display rows for a year under the given filters and sort. */
export function geneTableRows(year: GeneYear | undefined, query: GeneQuery): GeneTableRow[] {
  if (!year) return []

  const cells: GeneRow[] =
    query.cancerType === ALL_CANCER_TYPES
      ? year.rows
      : year.rows.filter((r) => r.cancerType === query.cancerType)

  // Collapse (gene × cancer type) cells to one row per gene.
  const byGene = new Map<string, { tests: number; types: Set<string>; denom: number | null }>()
  for (const cell of cells) {
    const entry = byGene.get(cell.gene)
    if (entry) {
      entry.tests += cell.tests
      entry.types.add(cell.cancerType)
    } else {
      byGene.set(cell.gene, {
        tests: cell.tests,
        types: new Set([cell.cancerType]),
        denom: cell.cancerTypeTests,
      })
    }
  }

  const needle = query.search.trim().toLowerCase()
  const rows: GeneTableRow[] = [...byGene.entries()]
    .filter(([gene]) => (needle ? gene.toLowerCase().includes(needle) : true))
    .map(([gene, e]) => {
      const single = e.types.size === 1
      return {
        gene,
        tests: e.tests,
        sharePct:
          single && e.denom != null && e.denom > 0
            ? Number(((e.tests / e.denom) * 100).toFixed(1))
            : null,
        cancerTypeCount: e.types.size,
        cancerType: single ? [...e.types][0] : null,
      }
    })

  const dir = query.sortDesc ? -1 : 1
  rows.sort((a, b) =>
    query.sortKey === 'gene'
      ? a.gene.localeCompare(b.gene) * dir
      : (a.tests - b.tests) * dir || a.gene.localeCompare(b.gene),
  )
  return rows
}

/** Total tests across the rows currently shown. */
export function totalTests(rows: GeneTableRow[]): number {
  return rows.reduce((sum, r) => sum + r.tests, 0)
}
