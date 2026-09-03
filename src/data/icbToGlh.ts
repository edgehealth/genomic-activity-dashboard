import type { IcbInfo } from '../types'
import rawTable from './icb-to-glh.json'

// ===========================================================================
// ICB → GLH mapping (April 2026 ICBs, 36 in total).
// ---------------------------------------------------------------------------
// Transcribed from the source-of-truth SQL table `References.ICB_to_GLH`
// (DASH > Tables). Each new ICB is assigned to exactly ONE GLH, even where
// its geography historically straddled two GLH catchments (Central East and
// Essex both include areas that reported under North Thames before the
// April 2026 mergers — the table assigns the whole ICB to East).
//
// Dorset: this table says South West GLH. Independent research suggested
// Central & South (the Wessex Genomics Laboratory Service, which historically
// served Dorset, is part of Central & South). Following the SQL table as the
// source of truth — flag to the data owner if South West looks wrong.
//
// `icbCode` is the ONS GSS code (ICB26CD in the boundary file); `odsCode` is
// the NHS ODS code used in the SQL table.
// ===========================================================================

export const icbTable: IcbInfo[] = rawTable

/** Lookup by ONS GSS code (matches ICB26CD in the boundary GeoJSON). */
export const icbByCode: Record<string, IcbInfo> = Object.fromEntries(
  icbTable.map((icb) => [icb.icbCode, icb]),
)

/**
 * Lookup by NHS ODS code. The API's `icb` column carries ODS codes
 * (`QE1`, `D7T5G`), while the map and icbByCode are keyed on GSS codes
 * (`E54…`) — so anything joining API rows to the map goes through here.
 */
export const icbByOds: Record<string, IcbInfo> = Object.fromEntries(
  icbTable.map((icb) => [icb.odsCode, icb]),
)
