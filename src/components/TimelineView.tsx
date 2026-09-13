import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { layoutBossActions, layoutSkillEntries } from '../lib/timelineLayout'
import {
  DEFAULT_ZOOM_INDEX,
  ZOOM_LEVELS,
  buildTicks,
  chooseTickStep,
  formatTime,
  getTimelineRange,
  secToPx,
} from '../lib/timeScale'
import type { BossAction, Encounter } from '../types/timeline'

const LABEL_COLUMN_PX = 112
const LANE_HEIGHT_PX = 26
const TRACK_PADDING_PX = 6
const RULER_HEIGHT_PX = 28

function trackHeight(laneCount: number): number {
  return TRACK_PADDING_PX * 2 + laneCount * LANE_HEIGHT_PX
}

function laneTop(lane: number): number {
  return TRACK_PADDING_PX + lane * LANE_HEIGHT_PX
}

function describeBossAction(action: BossAction): string {
  const timing =
    action.castStartSec === action.castEndSec
      ? `瞬發 ${formatTime(action.castStartSec)}`
      : `讀條 ${formatTime(action.castStartSec)} → ${formatTime(action.castEndSec)}`
  return [action.name, timing, action.note].filter(Boolean).join('\n')
}

interface TimelineRowProps {
  label: ReactNode
  heightPx: number
  gridPx: number[]
  zeroPx: number
  shadePrepull?: boolean
  className?: string
  children?: ReactNode
}

function TimelineRow({
  label,
  heightPx,
  gridPx,
  zeroPx,
  shadePrepull = false,
  className = '',
  children,
}: TimelineRowProps) {
  return (
    <div className={`timeline-row ${className}`} style={{ height: heightPx }}>
      <div className="timeline-row-label">{label}</div>
      <div className="timeline-row-body">
        {shadePrepull && (
          <div className="timeline-prepull" style={{ width: zeroPx }} aria-hidden="true" />
        )}
        {gridPx.map((x) => (
          <div key={x} className="timeline-grid" style={{ left: x }} aria-hidden="true" />
        ))}
        <div className="timeline-zero" style={{ left: zeroPx }} aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

interface TimelineViewProps {
  encounter: Encounter
}

export function TimelineView({ encounter }: TimelineViewProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Time at the center of the visible area, kept while zooming.
  const zoomAnchorSec = useRef<number | null>(null)

  const pxPerSec = ZOOM_LEVELS[zoomIndex]
  const range = useMemo(() => getTimelineRange(encounter), [encounter])
  const widthPx = (range.endSec - range.startSec) * pxPerSec
  const zeroPx = secToPx(0, range, pxPerSec)
  const ticks = buildTicks(range, chooseTickStep(pxPerSec))
  const gridPx = ticks.map((t) => secToPx(t, range, pxPerSec))
  const boss = layoutBossActions(encounter.bossActions, range, pxPerSec)

  const changeZoom = (nextIndex: number) => {
    const clamped = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, nextIndex))
    if (clamped === zoomIndex) return
    const el = scrollRef.current
    if (el) {
      const centerPx = el.scrollLeft + (el.clientWidth - LABEL_COLUMN_PX) / 2
      zoomAnchorSec.current = range.startSec + centerPx / pxPerSec
    }
    setZoomIndex(clamped)
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    const anchorSec = zoomAnchorSec.current
    if (!el || anchorSec === null) return
    zoomAnchorSec.current = null
    el.scrollLeft =
      (anchorSec - range.startSec) * pxPerSec - (el.clientWidth - LABEL_COLUMN_PX) / 2
  }, [pxPerSec, range.startSec])

  return (
    <section className="timeline" aria-label={`${encounter.name} 時間軸`}>
      <div className="timeline-toolbar">
        <span>縮放</span>
        <button
          type="button"
          onClick={() => changeZoom(zoomIndex - 1)}
          disabled={zoomIndex === 0}
          aria-label="縮小"
        >
          −
        </button>
        <input
          type="range"
          min={0}
          max={ZOOM_LEVELS.length - 1}
          value={zoomIndex}
          onChange={(e) => changeZoom(Number(e.currentTarget.value))}
          aria-label="縮放比例"
        />
        <button
          type="button"
          onClick={() => changeZoom(zoomIndex + 1)}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          aria-label="放大"
        >
          ＋
        </button>
        <span className="timeline-toolbar-note">每秒 {pxPerSec} px</span>
      </div>

      <div
        className="timeline-scroll"
        ref={scrollRef}
        style={{ '--label-col': `${LABEL_COLUMN_PX}px` } as CSSProperties}
      >
        <div className="timeline-content" style={{ width: LABEL_COLUMN_PX + widthPx }}>
          <TimelineRow
            label="時間"
            className="timeline-ruler"
            heightPx={RULER_HEIGHT_PX}
            gridPx={gridPx}
            zeroPx={zeroPx}
          >
            {ticks.map((t, i) => (
              <span key={t} className="ruler-label" style={{ left: gridPx[i] }}>
                {formatTime(t)}
              </span>
            ))}
          </TimelineRow>

          <TimelineRow
            label={<span className="track-title">王</span>}
            className="timeline-boss"
            heightPx={trackHeight(boss.laneCount)}
            gridPx={gridPx}
            zeroPx={zeroPx}
            shadePrepull
          >
            {boss.items.length === 0 && (
              <span className="track-empty" style={{ left: zeroPx, top: laneTop(0) }}>
                尚無王招式
              </span>
            )}
            {boss.items.map(({ action, leftPx, widthPx: barPx, instant, labelOutside, lane }) => {
              const title = describeBossAction(action)
              return instant ? (
                <div
                  key={action.id}
                  className="boss-instant"
                  style={{ left: leftPx, top: laneTop(lane) }}
                  title={title}
                >
                  <span className="boss-instant-marker" aria-hidden="true" />
                  <span className="timeline-label">{action.name}</span>
                </div>
              ) : (
                <div
                  key={action.id}
                  className={labelOutside ? 'boss-cast label-outside' : 'boss-cast'}
                  style={{ left: leftPx, top: laneTop(lane), width: barPx }}
                  title={title}
                >
                  <span className="timeline-label">{action.name}</span>
                </div>
              )
            })}
          </TimelineRow>

          {encounter.players.length === 0 && (
            <TimelineRow
              label={<span className="track-title">玩家</span>}
              heightPx={trackHeight(1)}
              gridPx={gridPx}
              zeroPx={zeroPx}
            >
              <span className="track-empty" style={{ left: 0, top: laneTop(0) }}>
                尚無玩家排軸
              </span>
            </TimelineRow>
          )}
          {encounter.players.map((player, index) => {
            const layout = layoutSkillEntries(player.entries, range, pxPerSec)
            return (
              <TimelineRow
                key={player.id}
                label={
                  <>
                    <span className="track-title">玩家 {index + 1}</span>
                    {player.job && <span className="track-subtitle">{player.job}</span>}
                  </>
                }
                className="timeline-player"
                heightPx={trackHeight(layout.laneCount)}
                gridPx={gridPx}
                zeroPx={zeroPx}
              >
                {layout.items.map(({ entry, leftPx, lane }) => (
                  <div
                    key={entry.id}
                    className="skill-marker"
                    style={{ left: leftPx, top: laneTop(lane) }}
                    title={`${entry.label}\n${formatTime(entry.timeSec)}`}
                  >
                    <span className="timeline-label">{entry.label}</span>
                  </div>
                ))}
              </TimelineRow>
            )
          })}
        </div>
      </div>
    </section>
  )
}
