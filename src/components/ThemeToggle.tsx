import { useTheme } from '../hooks/useTheme'
import type { ThemePreference } from '../lib/theme'

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '跟隨系統' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="theme-toggle" role="group" aria-label="版面顏色">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          onClick={() => setPreference(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
