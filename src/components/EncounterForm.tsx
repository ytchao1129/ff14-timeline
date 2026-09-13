import { useId, useState } from 'react'
import { MAX_NAME_LENGTH, validateEncounterInput } from '../lib/encounterInput'
import type { EncounterInput, EncounterValues, FieldErrors } from '../lib/encounterInput'
import { errorId } from '../lib/fieldId'
import { formatTime } from '../lib/timeScale'
import { Field } from './Field'

const DEFAULT_DURATION_SEC = 600

interface EncounterFormProps {
  initial?: EncounterValues
  /** Duration may not be shorter than this (the last boss action end). */
  minDurationSec?: number
  submitLabel: string
  onSubmit: (values: EncounterValues) => void
  onCancel: () => void
}

export function EncounterForm({
  initial,
  minDurationSec = 0,
  submitLabel,
  onSubmit,
  onCancel,
}: EncounterFormProps) {
  const id = useId()
  const [input, setInput] = useState<EncounterInput>({
    name: initial?.name ?? '',
    duration: formatTime(initial?.durationSec ?? DEFAULT_DURATION_SEC),
  })
  const [errors, setErrors] = useState<FieldErrors<keyof EncounterInput>>({})

  const update = (field: keyof EncounterInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  return (
    <form
      className="inline-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const result = validateEncounterInput(input, minDurationSec)
        if (result.ok) onSubmit(result.value)
        else setErrors(result.errors)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <Field inputId={`${id}-name`} label="副本名稱" error={errors.name}>
        <input
          id={`${id}-name`}
          value={input.name}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? errorId(`${id}-name`) : undefined}
          onChange={(e) => update('name', e.currentTarget.value)}
        />
      </Field>
      <Field
        inputId={`${id}-duration`}
        label="副本時長"
        hint="秒數或 分:秒，例如 600 或 10:00"
        error={errors.duration}
      >
        <input
          id={`${id}-duration`}
          className="time-input"
          value={input.duration}
          inputMode="decimal"
          aria-invalid={Boolean(errors.duration)}
          aria-describedby={errors.duration ? errorId(`${id}-duration`) : undefined}
          onChange={(e) => update('duration', e.currentTarget.value)}
        />
      </Field>
      <div className="form-actions">
        <button type="submit" className="primary">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
