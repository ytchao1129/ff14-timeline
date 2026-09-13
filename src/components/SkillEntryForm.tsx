import { useId, useState } from 'react'
import { describeRecast, groupSkillsByCategory } from '../data/skills'
import { MAX_NAME_LENGTH, validateSkillEntryInput } from '../lib/encounterInput'
import type { FieldErrors, SkillEntryInput, SkillEntryValues } from '../lib/encounterInput'
import { errorId } from '../lib/fieldId'
import { formatTime } from '../lib/timeScale'
import type { SkillDef, SkillEntry } from '../types/timeline'

function toInput(entry: SkillEntry | undefined, skills: SkillDef[]): SkillEntryInput {
  if (!entry) return { time: '', skillId: '', label: '' }
  const skillId = entry.skillId && skills.some((s) => s.id === entry.skillId) ? entry.skillId : ''
  return { time: formatTime(entry.timeSec), skillId, label: entry.label }
}

interface SkillEntryFormProps {
  rowId: string
  initial?: SkillEntry
  durationSec: number
  /** Skills of the player's job; empty when no job is selected. */
  skills: SkillDef[]
  onSubmit: (values: SkillEntryValues) => void
  onCancel: () => void
}

export function SkillEntryForm({
  rowId,
  initial,
  durationSec,
  skills,
  onSubmit,
  onCancel,
}: SkillEntryFormProps) {
  const id = useId()
  const [input, setInput] = useState<SkillEntryInput>(() => toInput(initial, skills))
  const [errors, setErrors] = useState<FieldErrors<keyof SkillEntryInput>>({})

  const fieldProps = (field: keyof SkillEntryInput, label: string) => ({
    id: `${id}-${field}`,
    value: input[field],
    'aria-label': label,
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? errorId(`${id}-${field}`) : undefined,
    onChange: (e: { currentTarget: { value: string } }) => {
      const { value } = e.currentTarget
      setInput((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    },
  })

  const fieldError = (field: keyof SkillEntryInput) =>
    errors[field] && (
      <span id={errorId(`${id}-${field}`)} className="field-error">
        {errors[field]}
      </span>
    )

  return (
    <form
      id={rowId}
      className="action-row action-form skill-row"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const result = validateSkillEntryInput(input, durationSec, skills)
        if (result.ok) onSubmit(result.value)
        else setErrors(result.errors)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <div className="cell">
        <input
          {...fieldProps('time', '使用時間')}
          className="time-input"
          placeholder="例：-0:10"
          inputMode="decimal"
          autoFocus
        />
        {fieldError('time')}
      </div>
      <div className="cell">
        <div className="skill-picker">
          {skills.length > 0 && (
            <select {...fieldProps('skillId', '技能')}>
              <option value="">自訂名稱</option>
              {groupSkillsByCategory(skills).map((group) => (
                <optgroup key={group.category} label={group.label}>
                  {group.skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}（{describeRecast(skill)}）
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {input.skillId === '' && (
            <input
              {...fieldProps('label', '技能名稱')}
              placeholder="技能名稱"
              maxLength={MAX_NAME_LENGTH}
            />
          )}
        </div>
        {fieldError('skillId')}
        {fieldError('label')}
      </div>
      <div className="cell cell-actions">
        <button type="submit" className="primary">
          {initial ? '儲存' : '新增'}
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
