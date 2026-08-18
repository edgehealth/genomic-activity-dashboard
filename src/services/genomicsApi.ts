// ---------------------------------------------------------------------------
// Dashboard Data API client — genomics metrics.
//
// Adapted from fingertips-dashboard/src/services/fingertipsApi.ts. That app is
// Create React App (process.env.REACT_APP_*); this one is Vite, so config comes
// from import.meta.env.VITE_* instead. Same API, different (versioned) route:
// /v1/genomics rather than /indicators.
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_DASH_API_BASE_URL
const API_KEY = import.meta.env.VITE_DASH_API_KEY

/** One row of the long-format `vw_genomics_metrics` view. */
export interface GenomicsRow {
  metric_id: string
  /** GLH region name (region_of_reporting); null for national metrics. */
  glh: string | null
  /** Always null in the current view (ICB is an intermediate only). */
  icb: string | null
  /** Breakdown value: cancer type / specialist category / age / gene site. */
  sub_category: string | null
  /** Gene name (gen_11 only); null otherwise. */
  gene: string | null
  /** The count that drives the metric — always additive. */
  numerator: number
  /** total/population for rate & % metrics; null for pure counts. */
  denominator: number | null
  time_grain: 'month' | 'year'
  /** Month-end (or year-end) date, as a Unix timestamp in milliseconds (UTC). */
  time_period: number
}

interface Pagination {
  page: number
  page_size: number
  total_records: number
  total_pages: number
}

interface GenomicsResponse {
  data: GenomicsRow[]
  pagination: Pagination
}

const PAGE_SIZE = 5000 // MAX_PAGE_SIZE on the API

function assertConfigured() {
  if (!API_BASE_URL || !API_KEY) {
    throw new Error(
      'Dashboard API is not configured. Set VITE_DASH_API_BASE_URL and ' +
        'VITE_DASH_API_KEY (see .env.example) and restart the dev server.',
    )
  }
}

async function fetchPage(page: number): Promise<GenomicsResponse> {
  const url =
    `${API_BASE_URL}/v1/genomics?code=${encodeURIComponent(API_KEY)}` +
    `&page=${page}&page_size=${PAGE_SIZE}`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`Genomics API HTTP ${response.status}`)
  }
  return (await response.json()) as GenomicsResponse
}

/** Stable identity of a row, for de-duplicating overlapping pages. */
function rowKey(r: GenomicsRow): string {
  return [
    r.metric_id,
    r.glh ?? '',
    r.icb ?? '',
    r.sub_category ?? '',
    r.gene ?? '',
    r.time_grain,
    r.time_period,
    r.numerator,
    r.denominator ?? '',
  ].join('')
}

/**
 * Fetch every genomics metric row, following pagination until all pages are in.
 * The view is small (a few thousand rows), so one or two pages is typical.
 *
 * ⚠ THE API'S PAGINATION IS NOT STABLE. Observed on /v1/genomics: page 2 re-returns
 * rows already served on page 1 (2,122 of them, all gen_11), and which rows you get
 * depends on page_size — at page_size=3000 the whole 2020 gene slice is absent while
 * `total_records` still reports 7,394. That is the signature of OFFSET paging over a
 * query with no deterministic ORDER BY.
 *
 * Consequences we handle here:
 *   • duplicates — de-duplicated below, because every consumer SUMS numerators and
 *     double-counted rows silently inflate totals (gene volumes most of all).
 *   • dropped rows — cannot be fixed client-side. If the distinct count doesn't match
 *     `total_records` we warn, so the gap is visible rather than silent.
 *
 * Remove this once the API paginates over a stable key.
 */
export async function getGenomicsMetrics(): Promise<GenomicsRow[]> {
  assertConfigured()

  const first = await fetchPage(1)
  const raw = [...first.data]

  for (let page = 2; page <= first.pagination.total_pages; page++) {
    const next = await fetchPage(page)
    raw.push(...next.data)
  }

  const seen = new Set<string>()
  const rows: GenomicsRow[] = []
  for (const r of raw) {
    const key = rowKey(r)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(r)
  }

  const duplicates = raw.length - rows.length
  const reported = first.pagination.total_records
  if (duplicates > 0 || rows.length !== reported) {
    console.warn(
      `[genomicsApi] Pagination returned ${raw.length} rows for a reported ${reported} ` +
        `total_records; ${duplicates} were duplicates, leaving ${rows.length} distinct. ` +
        'The API is paging without a stable sort key, so rows can also be missed — ' +
        'treat totals as provisional and ask the data owner to add a deterministic ORDER BY.',
    )
  }

  return rows
}
