// ---------------------------------------------------------------------------
// Loading skeletons.
//
// These mirror the real components' structure — same cards, same grid columns,
// same row counts — so the layout doesn't jump when data arrives. Each shape
// reuses the live class names for its container and only swaps the text/marks
// for shimmer blocks.
//
// One <Shimmer> primitive carries the animation; everything else is layout.
// ---------------------------------------------------------------------------

/** A single shimmering block. `w` accepts any CSS length or percentage. */
function Shimmer({ w, h, className }: { w?: string | number; h: number; className?: string }) {
  return (
    <span
      className={`shim${className ? ` ${className}` : ''}`}
      style={{ width: typeof w === 'number' ? `${w}px` : (w ?? '100%'), height: `${h}px` }}
    />
  )
}

/** Four KPI cards, matching KpiRow's 4-column grid. */
export function KpiRowSkeleton() {
  return (
    <div className="kpirow" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div className="kpi" key={i}>
          <Shimmer w="62%" h={9} />
          <div className="skel__gap-8">
            <Shimmer w="72%" h={28} />
          </div>
          <div className="skel__gap-8">
            <Shimmer w="52%" h={9} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The map panel: header, controls, and the map/ranked-list two-column body.
 * The map area keeps its aspect box so the panel is the right height, and the
 * ranked list shows 7 rows because there are always 7 GLHs.
 */
export function MapPanelSkeleton() {
  return (
    <section className="panel mappanel" aria-hidden>
      <div className="mappanel__head">
        <div className="skel__grow">
          <Shimmer w={260} h={12} />
          <div className="skel__gap-6">
            <Shimmer w={330} h={10} />
          </div>
        </div>
        <Shimmer w={210} h={30} className="shim--pill" />
      </div>

      <div className="subctl">
        <div className="subctl__group">
          <Shimmer w={70} h={8} />
          <Shimmer w={190} h={31} className="shim--field" />
        </div>
        <div className="subctl__group">
          <Shimmer w={54} h={8} />
          <Shimmer w={150} h={31} className="shim--pill" />
        </div>
      </div>

      <div className="mappanel__body">
        <div className="mappanel__map">
          <div className="skel__map">
            <Shimmer h={0} className="shim--map" />
          </div>
        </div>

        <div className="ranked">
          <div className="ranked__head">
            <Shimmer w={110} h={9} />
            <div className="skel__gap-4">
              <Shimmer w={86} h={8} />
            </div>
          </div>
          <div className="skel__rows">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div className="skel__row" key={i}>
                <Shimmer w={12} h={10} />
                <div className="skel__grow">
                  <Shimmer w="78%" h={10} />
                  <div className="skel__gap-4">
                    <Shimmer w="56%" h={8} />
                  </div>
                </div>
                <Shimmer w={38} h={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** The detail sidebar: head, 2x2 stat grid, comparison bars, trend chart. */
export function DetailPanelSkeleton() {
  return (
    <aside className="detail" aria-hidden>
      <div className="detail__head">
        <Shimmer w={130} h={8} />
        <div className="skel__gap-8">
          <Shimmer w="66%" h={19} />
        </div>
        <div className="skel__gap-6">
          <Shimmer w="88%" h={10} />
        </div>
        <div className="skel__gap-6">
          <Shimmer w="74%" h={10} />
        </div>
      </div>

      <div className="detail__stats">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat" key={i}>
            <Shimmer w="76%" h={9} />
            <div className="skel__gap-6">
              <Shimmer w="58%" h={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="detail__section">
        <Shimmer w={190} h={11} />
        <div className="skel__gap-6">
          <Shimmer w="82%" h={9} />
        </div>
        <div className="skel__bars">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="skel__barhead">
                <Shimmer w="52%" h={9} />
                <Shimmer w={62} h={9} />
              </div>
              <div className="skel__gap-6">
                <Shimmer h={7} className="shim--track" />
              </div>
              <div className="skel__gap-5">
                <Shimmer w="44%" h={8} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail__section">
        <Shimmer w={210} h={11} />
        <div className="skel__gap-6">
          <Shimmer w="90%" h={9} />
        </div>
        <div className="skel__gap-12">
          <Shimmer h={150} className="shim--chart" />
        </div>
      </div>
    </aside>
  )
}
