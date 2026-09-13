import { useId, useState } from 'react'
import { DAMAGE_TYPE_LABELS, TARGET_LABELS } from '../data/bossActionLabels'
import {
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  validateBossActionInput,
} from '../lib/encounterInput'
import type { BossActionInput, BossActionValues, FieldErrors } from '../lib/encounterInput'
import { formatCastLength } from '../lib/encounterOps'
import { errorId } from '../lib/fieldId'
import { parseTimeInput } from '../lib/timeInput'
import { formatTime } from '../lib/timeScale'
import { ACTION_TARGETS, DAMAGE_TYPES } from '../types/timeline'
import type { BossAction } from '../types/timeline'

function toInput(action?: BossAction): BossActionInput {
  if (!action) {
    return { name: '', start: '', end: '', note: '', damageType: '', target: '', damage: '' }
  }
  const { details } = action
  return {
    name: action.name,
    start: formatTime(action.castStartSec),
    end: action.castEndSec === action.castStartSec ? '' : formatTime(action.castEndSec),
    note: action.note ?? '',
    damageType: details?.damageType ?? '',
    target: details?.target ?? '',
    damage: details?.damage !== undefined ? String(details.damage) : '',
  }
}

function previewLength(input: BossActionInput): string {
  const start = parseTimeInput(input.start)
  const end = input.end.trim() ? parseTimeInput(input.end) : start
  return start !== null && end !== null && end >= start ? formatCastLength(start, end) : '—'
}

interface BossActionFormProps {
  rowId: string
  initial?: BossAction
  durationSec: number
  onSubmit: (values: BossActionValues) => void
  onCancel: () => void
}

export function BossActionForm({
  rowId,
  initial,
  durationSec,
  onSubmit,
  onCancel,
}: BossActionFormProps) {
  const id = useId()
  const [input, setInput] = useState<BossActionInput>(() => toInput(initial))
  const [errors, setErrors] = useState<FieldErrors<keyof BossActionInput>>({})

  const fieldProps = (field: keyof BossActionInput, label: string) => ({
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

  const fieldError = (field: keyof BossActionInput) =>
    errors[field] && (
      <span id={errorId(`${id}-${field}`)} className="field-error">
        {errors[field]}
      </span>
    )

  return (
    <form
      id={rowId}
      className="action-row action-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const result = validateBossActionInput(input, durationSec)
        if (result.ok) onSubmit(result.value)
        else setErrors(result.errors)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <div className="cell">
        <input
          {...fieldProps('name', '招式名稱')}
          placeholder="招式名稱"
          maxLength={MAX_NAME_LENGTH}
          autoFocus
        />
        {fieldError('name')}
      </div>
      <div className="cell">
        <input
          {...fieldProps('start', '讀條開始時間')}
          className="time-input"
          placeholder="例：1:15"
          inputMode="decimal"
        />
        {fieldError('start')}
      </div>
      <div className="cell">
        <input
          {...fieldProps('end', '讀條結束時間（留空表示瞬發）')}
          className="time-input"
          placeholder="留空＝瞬發"
          inputMode="decimal"
        />
        {fieldError('end')}
      </div>
      <div className="cell cell-muted">{previewLength(input)}</div>
      <div className="cell">
        <input {...fieldProps('note', '備註')} placeholder="備註（選填）" maxLength={MAX_NOTE_LENGTH} />
        {fieldError('note')}
      </div>
      <div className="cell cell-actions">
        <button type="submit" className="primary">
          {initial ? '儲存' : '新增'}
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>

      <div className="action-form-details">
        <label className="inline-field">
          傷害類型
          <select {...fieldProps('damageType', '傷害類型')}>
            <option value="">未設定</option>
            {DAMAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {DAMAGE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          攻擊對象
          <select {...fieldProps('target', '攻擊對象')}>
            <option value="">未設定</option>
            {ACTION_TARGETS.map((target) => (
              <option key={target} value={target}>
                {TARGET_LABELS[target]}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          傷害量
          <input
            {...fieldProps('damage', '傷害量')}
            className="damage-input"
            placeholder="選填，例：120000"
            inputMode="numeric"
          />
        </label>
        {fieldError('damageType')}
        {fieldError('target')}
        {fieldError('damage')}
      </div>
    </form>
  )
}
