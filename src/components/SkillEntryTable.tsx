import { useScrollIntoView } from '../hooks/useScrollIntoView'
import type { SkillEntryValues } from '../lib/encounterInput'
import { formatTime } from '../lib/timeScale'
import type { PlayerPlan, SkillEntry } from '../types/timeline'
import type { ActionEditor } from './BossActionTable'
import { SkillEntryForm } from './SkillEntryForm'

function rowId(entryId: string): string {
  return `skill-entry-${entryId}`
}

interface SkillEntryTableProps {
  player: PlayerPlan
  index: number
  durationSec: number
  editor: ActionEditor
  onEditorChange: (editor: ActionEditor) => void
  onAdd: (values: SkillEntryValues) => void
  onUpdate: (id: string, values: SkillEntryValues) => void
  onRemove: (entry: SkillEntry) => void
}

export function SkillEntryTable({
  player,
  index,
  durationSec,
  editor,
  onEditorChange,
  onAdd,
  onUpdate,
  onRemove,
}: SkillEntryTableProps) {
  const addRowId = `skill-entry-new-${player.id}`
  useScrollIntoView(editor ? (editor.mode === 'add' ? addRowId : rowId(editor.id)) : null)

  const cancel = () => onEditorChange(null)

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>玩家 {index + 1} 技能</h2>
        {player.job && <span className="muted">{player.job}</span>}
        <span className="muted">{player.entries.length} 個</span>
        <button
          type="button"
          className="primary panel-header-action"
          onClick={() => onEditorChange({ mode: 'add' })}
          disabled={editor?.mode === 'add'}
        >
          新增技能
        </button>
      </div>

      <div className="action-table-scroll">
        <div className="action-table skill-table">
          <div className="action-row skill-row action-header" aria-hidden="true">
            <div className="cell">使用時間</div>
            <div className="cell">技能名稱</div>
            <div className="cell" />
          </div>

          {editor?.mode === 'add' && (
            <SkillEntryForm
              rowId={addRowId}
              durationSec={durationSec}
              onSubmit={onAdd}
              onCancel={cancel}
            />
          )}

          {player.entries.length === 0 && editor?.mode !== 'add' && (
            <p className="action-empty">尚無技能，按「新增技能」開始排軸。可排入開打前 16 秒。</p>
          )}

          {player.entries.map((entry) =>
            editor?.mode === 'edit' && editor.id === entry.id ? (
              <SkillEntryForm
                key={entry.id}
                rowId={rowId(entry.id)}
                initial={entry}
                durationSec={durationSec}
                onSubmit={(values) => onUpdate(entry.id, values)}
                onCancel={cancel}
              />
            ) : (
              <div key={entry.id} id={rowId(entry.id)} className="action-row skill-row">
                <div className="cell cell-time">{formatTime(entry.timeSec)}</div>
                <div className="cell cell-name">{entry.label}</div>
                <div className="cell cell-actions">
                  <button type="button" onClick={() => onEditorChange({ mode: 'edit', id: entry.id })}>
                    編輯
                  </button>
                  <button type="button" onClick={() => onRemove(entry)}>
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
