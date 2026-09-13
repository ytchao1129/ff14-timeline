import type { ReactNode } from 'react'
import { errorId } from '../lib/fieldId'

interface FieldProps {
  inputId: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ inputId, label, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {children}
      {error ? (
        <span id={errorId(inputId)} className="field-error">
          {error}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  )
}
