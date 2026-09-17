import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { DAMAGE_TYPE_LABELS, describeDetails } from '../data/bossActionLabels'
import { describeRecast, getSkillsForJob } from '../data/skills'
import { analyzeSkillUsage, describeConflict } from '../lib/cooldowns'
import { layoutBossActions, layoutSkillEntries } from '../lib/timelineLayout'
import {
  DEFAULT_ZOOM_INDEX,
  ZOOM_LEVELS,
  buildTicks,
  chooseTickStep,
  dragTimeSec,
  formatTime,
  getTimelineRange,
  secToPx,
} from '../lib/timeScale'
import { DAMAGE_TYPES, PREPULL_SEC } from '../types/timeline'
import type { BossAction, Encounter, SkillEntry } from '../types/timeline'

const LABEL_COLUMN_PX = 112
const LANE_HEIGHT_PX = 26
const TRACK_PADDING_PX = 6
const RULER_HEIGHT_PX = 28
// Cooldown bars sit in the gap below a 22px skill marker.
const COOLDOWN_OFFSET_PX = 23
// A press that moves less than this is treated as a click.
const DRAG_THRESHOLD_PX = 4
const DRAG_STEP_SEC = 1
const DRAG_FINE_STEP_SEC = 0.1

interface SkillDrag {
  playerId: string
  entryId: string
  pointerId: number
  startX: number
  originSec: number
  timeSec: number
  moved: boolean
}

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
  const details = action.details ? describeDetails(action.details) : ''
  return [action.name, timing, details, action.note].filter(Boolean).join('\n')
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
  selectedBossActionId?: string | null
  onBossActionClick?: (id: string) => void
  selectedSkillEntryId?: string | null
  onSkillEntryClick?: (playerId: string, entryId: string) => void
  /** Called when a skill marker is dropped at a new time. */
  onSkillEntryMove?: (playerId: string, entryId: string, timeSec: number) => void
  /** Players whose skills cannot be dragged. */
  lockedPlayerIds?: ReadonlySet<string>
  onTogglePlayerLock?: (playerId: string) => void
}

export function TimelineView({
  encounter,
  selectedBossActionId = null,
  onBossActionClick,
  selectedSkillEntryId = null,
  onSkillEntryClick,
  onSkillEntryMove,
  lockedPlayerIds,
  onTogglePlayerLock,
}: TimelineViewProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [showCooldowns, setShowCooldowns] = useState(true)
  const [drag, setDrag] = useState<SkillDrag | null>(null)
  // The click that follows a drag must not open the editor.
  const suppressClick = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)
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

  // The timeline sticks to the top of the page; rows scrolled into view below
  // it (e.g. the form opened by clicking a marker) must not end up hidden.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--timeline-sticky-height', `${el.offsetHeight}px`)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--timeline-sticky-height')
    }
  }, [])

  // Escape cancels a drag in progress.
  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      suppressClick.current = true
      setDrag(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dragging])

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
    entry: SkillEntry,
  ) => {
    suppressClick.current = false
    if (!onSkillEntryMove || lockedPlayerIds?.has(playerId) || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      playerId,
      entryId: entry.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      originSec: entry.timeSec,
      timeSec: entry.timeSec,
      moved: false,
    })
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const { clientX, pointerId, shiftKey } = event
    setDrag((current) => {
      if (!current || current.pointerId !== pointerId) return current
      const deltaPx = clientX - current.startX
      if (!current.moved && Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return current
      const timeSec = dragTimeSec(
        current.originSec,
        deltaPx,
        pxPerSec,
        shiftKey ? DRAG_FINE_STEP_SEC : DRAG_STEP_SEC,
        -PREPULL_SEC,
        encounter.durationSec,
      )
      return { ...current, moved: true, timeSec }
    })
  }

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved) {
      suppressClick.current = true
      if (drag.timeSec !== drag.originSec) {
        onSkillEntryMove?.(drag.playerId, drag.entryId, drag.timeSec)
      }
    }
    setDrag(null)
  }

  const activeDrag = drag?.moved ? drag : null

  return (
    <section ref={sectionRef} className="timeline" aria-label={`${encounter.name} 時間軸`}>
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
        <label className="timeline-toggle">
          <input
            type="checkbox"
            checked={showCooldowns}
            onChange={(e) => setShowCooldowns(e.currentTarget.checked)}
          />
          顯示持續時間與冷卻
        </label>
      </div>

      {encounter.bossActions.some((a) => a.details?.damageType) && (
        <div className="timeline-legend" aria-label="王招式傷害類型圖例">
          {DAMAGE_TYPES.map((type) => (
            <span key={type} className={`legend-item damage-${type}`}>
              <span className="legend-swatch" aria-hidden="true" />
              {DAMAGE_TYPE_LABELS[type]}
            </span>
          ))}
          <span className="legend-item">
            <span className="legend-swatch" aria-hidden="true" />
            未設定
          </span>
        </div>
      )}

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
              const classes = [
                instant ? 'boss-instant' : 'boss-cast',
                action.details?.damageType && `damage-${action.details.damageType}`,
                labelOutside && 'label-outside',
                action.id === selectedBossActionId && 'selected',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={action.id}
                  type="button"
                  className={classes}
                  style={{
                    left: leftPx,
                    top: laneTop(lane),
                    width: instant ? undefined : barPx,
                  }}
                  title={describeBossAction(action)}
                  aria-pressed={action.id === selectedBossActionId}
                  onClick={() => onBossActionClick?.(action.id)}
                >
                  {instant && <span className="boss-instant-marker" aria-hidden="true" />}
                  <span className="timeline-label">{action.name}</span>
                </button>
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
            const skills = getSkillsForJob(player.job)
            const skillById = new Map(skills.map((s) => [s.id, s]))
            // While dragging, draw the entry (and its cooldown) at the new time.
            const entries =
              activeDrag?.playerId === player.id
                ? player.entries.map((e) =>
                    e.id === activeDrag.entryId ? { ...e, timeSec: activeDrag.timeSec } : e,
                  )
                : player.entries
            const usage = analyzeSkillUsage(entries, skills)
            // Each skill gets its own lines so its uses and cooldowns line up.
            const layout = layoutSkillEntries(entries, range, pxPerSec, (entry) =>
              entry.skillId && skillById.has(entry.skillId) ? entry.skillId : '',
            )
            const laneOf = new Map(layout.items.map((item) => [item.entry.id, item.lane]))
            const locked = lockedPlayerIds?.has(player.id) ?? false
            const canDrag = Boolean(onSkillEntryMove) && !locked
            return (
              <TimelineRow
                key={player.id}
                label={
                  <>
                    <span className="track-title-row">
                      <span className="track-title">玩家 {index + 1}</span>
                      {onSkillEntryMove && onTogglePlayerLock && (
                        <button
                          type="button"
                          className="track-lock"
                          aria-pressed={locked}
                          aria-label={`${locked ? '解除鎖定' : '鎖定'}玩家 ${index + 1}`}
                          title={locked ? '已鎖定：技能不能拖曳，點擊解除' : '鎖定後技能不能拖曳'}
                          onClick={() => onTogglePlayerLock(player.id)}
                        >
                          {locked ? '🔒' : '🔓'}
                        </button>
                      )}
                    </span>
                    {player.job && <span className="track-subtitle">{player.job}</span>}
                  </>
                }
                className="timeline-player"
                heightPx={trackHeight(layout.laneCount)}
                gridPx={gridPx}
                zeroPx={zeroPx}
              >
                {showCooldowns &&
                  layout.items.map(({ entry, leftPx, lane }) => {
                    const durationSec = entry.skillId
                      ? skillById.get(entry.skillId)?.durationSec
                      : undefined
                    return durationSec ? (
                      <div
                        key={`effect-${entry.id}`}
                        className="skill-effect"
                        style={{ left: leftPx, top: laneTop(lane), width: durationSec * pxPerSec }}
                        aria-hidden="true"
                      />
                    ) : null
                  })}
                {showCooldowns &&
                  usage.cooldowns.map((cooldown) => (
                    <div
                      key={`cooldown-${cooldown.entryId}`}
                      className="skill-cooldown"
                      style={{
                        left: secToPx(cooldown.startSec, range, pxPerSec),
                        top: laneTop(laneOf.get(cooldown.entryId) ?? 0) + COOLDOWN_OFFSET_PX,
                        width: (cooldown.endSec - cooldown.startSec) * pxPerSec,
                      }}
                      title={`冷卻至 ${formatTime(cooldown.endSec)}`}
                      aria-hidden="true"
                    />
                  ))}
                {layout.items.map(({ entry, leftPx, lane }) => {
                  const skill = entry.skillId ? skillById.get(entry.skillId) : undefined
                  const readyAtSec = usage.conflicts.get(entry.id)
                  const isDragged = activeDrag?.entryId === entry.id
                  const classes = [
                    'skill-marker',
                    canDrag && 'draggable',
                    isDragged && 'dragging',
                    readyAtSec !== undefined && 'conflict',
                    entry.id === selectedSkillEntryId && 'selected',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  const title = [
                    entry.label,
                    formatTime(entry.timeSec),
                    skill && describeRecast(skill),
                    skill?.durationSec && `持續 ${skill.durationSec} 秒`,
                    readyAtSec !== undefined && `⚠ ${describeConflict(entry.timeSec, readyAtSec)}`,
                    canDrag && '可拖曳調整時間（按住 Shift 以 0.1 秒微調）',
                    onSkillEntryMove && locked && '🔒 此玩家已鎖定，不能拖曳',
                  ]
                    .filter(Boolean)
                    .join('\n')
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={classes}
                      style={{ left: leftPx, top: laneTop(lane) }}
                      title={isDragged ? undefined : title}
                      aria-pressed={entry.id === selectedSkillEntryId}
                      onPointerDown={(e) => startDrag(e, player.id, entry)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={() => setDrag(null)}
                      onClick={(e) => {
                        // detail is 0 for keyboard activation, which never follows a drag.
                        if (suppressClick.current && e.detail !== 0) {
                          suppressClick.current = false
                          return
                        }
                        onSkillEntryClick?.(player.id, entry.id)
                      }}
                    >
                      <span className="timeline-label">
                        {entry.label}
                        {isDragged && (
                          <span className="drag-time"> {formatTime(entry.timeSec)}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </TimelineRow>
            )
          })}
        </div>
      </div>
    </section>
  )
}
