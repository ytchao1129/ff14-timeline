import { JOBS, ROLES, ROLE_LABELS, findJob } from '../data/jobs'
import { describeRecast } from '../data/skills'
import { useScrollIntoView } from '../hooks/useScrollIntoView'
import type { SkillEntryValues } from '../lib/encounterInput'
import { formatTime } from '../lib/timeScale'
import type { PlayerPlan, SkillDef, SkillEntry } from '../types/timeline'
import type { ActionEditor } from './BossActionTable'
import { SkillEntryForm } from './SkillEntryForm'

function rowId(entryId: string): string {
  return `skill-entry-${entryId}`
}

interface SkillEntryTableProps {
  player: PlayerPlan
  index: number
  durationSec: number
  skills: SkillDef[]
  editor: ActionEditor
  onEditorChange: (editor: ActionEditor) => void
  onJobChange: (job: string) => void
  onAdd: (values: SkillEntryValues) => void
  onUpdate: (id: string, values: SkillEntryValues) => void
  onRemove: (entry: SkillEntry) => void
}

export function SkillEntryTable({
  player,
  index,
  durationSec,
  skills,
  editor,
  onEditorChange,
  onJobChange,
  onAdd,
  onUpdate,
  onRemove,
}: SkillEntryTableProps) {
  const addRowId = `skill-entry-new-${player.id}`
  useScrollIntoView(editor ? (editor.mode === 'add' ? addRowId : rowId(editor.id)) : null)

  const cancel = () => onEditorChange(null)
  const unknownJob = player.job !== '' && !findJob(player.job)

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>玩家 {index + 1} 技能</h2>
        <label className="job-select">
          職業
          <select value={player.job} onChange={(e) => onJobChange(e.currentTarget.value)}>
            <option value="">未指定</option>
            {unknownJob && <option value={player.job}>{player.job}（未支援）</option>}
            {ROLES.map((role) => (
              <optgroup key={role} label={ROLE_LABELS[role]}>
                {JOBS.filter((job) => job.role === role).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}（{job.id}）
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
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
            <div className="cell">技能</div>
            <div className="cell" />
          </div>

          {editor?.mode === 'add' && (
            <SkillEntryForm
              rowId={addRowId}
              durationSec={durationSec}
              skills={skills}
              onSubmit={onAdd}
              onCancel={cancel}
            />
          )}

          {player.entries.length === 0 && editor?.mode !== 'add' && (
            <p className="action-empty">尚無技能，按「新增技能」開始排軸。可排入開打前 16 秒。</p>
          )}

          {player.entries.map((entry) => {
            if (editor?.mode === 'edit' && editor.id === entry.id) {
              return (
                <SkillEntryForm
                  key={entry.id}
                  rowId={rowId(entry.id)}
                  initial={entry}
                  durationSec={durationSec}
                  skills={skills}
                  onSubmit={(values) => onUpdate(entry.id, values)}
                  onCancel={cancel}
                />
              )
            }
            const skill = entry.skillId ? skills.find((s) => s.id === entry.skillId) : undefined
            return (
              <div key={entry.id} id={rowId(entry.id)} className="action-row skill-row">
                <div className="cell cell-time">{formatTime(entry.timeSec)}</div>
                <div className="cell cell-name cell-inline">
                  {entry.label}
                  {skill ? (
                    <span className="tag">{describeRecast(skill)}</span>
                  ) : (
                    skills.length > 0 && <span className="tag">自訂</span>
                  )}
                </div>
                <div className="cell cell-actions">
                  <button type="button" onClick={() => onEditorChange({ mode: 'edit', id: entry.id })}>
                    編輯
                  </button>
                  <button type="button" onClick={() => onRemove(entry)}>
                    刪除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
