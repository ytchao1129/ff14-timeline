import { DAMAGE_TYPE_LABELS, TARGET_LABELS, formatDamage } from '../data/bossActionLabels'
import { useScrollIntoView } from '../hooks/useScrollIntoView'
import type { BossActionValues } from '../lib/encounterInput'
import { formatCastLength } from '../lib/encounterOps'
import { formatTime } from '../lib/timeScale'
import type { BossAction, Encounter } from '../types/timeline'
import { BossActionForm } from './BossActionForm'

export type ActionEditor = { mode: 'add' } | { mode: 'edit'; id: string } | null

const ADD_ROW_ID = 'boss-action-new'

function rowId(actionId: string): string {
  return `boss-action-${actionId}`
}

interface BossActionTableProps {
  encounter: Encounter
  editor: ActionEditor
  onEditorChange: (editor: ActionEditor) => void
  onAdd: (values: BossActionValues) => void
  onUpdate: (id: string, values: BossActionValues) => void
  onRemove: (action: BossAction) => void
}

export function BossActionTable({
  encounter,
  editor,
  onEditorChange,
  onAdd,
  onUpdate,
  onRemove,
}: BossActionTableProps) {
  useScrollIntoView(editor ? (editor.mode === 'add' ? ADD_ROW_ID : rowId(editor.id)) : null)

  const cancel = () => onEditorChange(null)

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>王招式</h2>
        <span className="muted">{encounter.bossActions.length} 個</span>
        <button
          type="button"
          className="primary panel-header-action"
          onClick={() => onEditorChange({ mode: 'add' })}
          disabled={editor?.mode === 'add'}
        >
          新增招式
        </button>
      </div>

      <div className="action-table-scroll">
        <div className="action-table">
          <div className="action-row action-header" aria-hidden="true">
            <div className="cell">招式名稱</div>
            <div className="cell">讀條開始</div>
            <div className="cell">讀條結束</div>
            <div className="cell">長度</div>
            <div className="cell">備註</div>
            <div className="cell" />
          </div>

          {editor?.mode === 'add' && (
            <BossActionForm
              rowId={ADD_ROW_ID}
              durationSec={encounter.durationSec}
              onSubmit={onAdd}
              onCancel={cancel}
            />
          )}

          {encounter.bossActions.length === 0 && editor?.mode !== 'add' && (
            <p className="action-empty">尚無招式，按「新增招式」開始建立。</p>
          )}

          {encounter.bossActions.map((action) =>
            editor?.mode === 'edit' && editor.id === action.id ? (
              <BossActionForm
                key={action.id}
                rowId={rowId(action.id)}
                initial={action}
                durationSec={encounter.durationSec}
                onSubmit={(values) => onUpdate(action.id, values)}
                onCancel={cancel}
              />
            ) : (
              <div key={action.id} id={rowId(action.id)} className="action-row">
                <div className="cell cell-name cell-inline">
                  {action.name}
                  {action.details?.damageType && (
                    <span className={`tag damage-${action.details.damageType}`}>
                      {DAMAGE_TYPE_LABELS[action.details.damageType]}
                    </span>
                  )}
                  {action.details?.target && (
                    <span className="tag">{TARGET_LABELS[action.details.target]}</span>
                  )}
                  {action.details?.damage !== undefined && (
                    <span className="tag">{formatDamage(action.details.damage)}</span>
                  )}
                </div>
                <div className="cell cell-time">{formatTime(action.castStartSec)}</div>
                <div className="cell cell-time">
                  {action.castEndSec === action.castStartSec ? '—' : formatTime(action.castEndSec)}
                </div>
                <div className="cell cell-muted">
                  {formatCastLength(action.castStartSec, action.castEndSec)}
                </div>
                <div className="cell cell-muted cell-note">{action.note}</div>
                <div className="cell cell-actions">
                  <button type="button" onClick={() => onEditorChange({ mode: 'edit', id: action.id })}>
                    編輯
                  </button>
                  <button type="button" onClick={() => onRemove(action)}>
                    刪除
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
