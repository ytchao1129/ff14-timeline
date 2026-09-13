import type { PresetEncounter, PresetLoadResult } from '../lib/presets'
import { formatTime } from '../lib/timeScale'

interface PresetPanelProps {
  presets: PresetLoadResult
  onAdd: (preset: PresetEncounter) => void
  onClose: () => void
}

export function PresetPanel({ presets, onAdd, onClose }: PresetPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>預設排軸</h2>
        <span className="muted">{presets.encounters.length} 個</span>
        <div className="panel-header-buttons">
          <button type="button" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>

      {presets.errors.map((error) => (
        <p key={error.fileName} className="alert" role="alert">
          無法讀取 {error.fileName}：{error.error}
        </p>
      ))}

      {presets.encounters.length === 0 ? (
        <p className="empty">
          目前沒有預設排軸。把從排軸器匯出的 JSON 檔放進專案的 <code>presets</code>{' '}
          資料夾，就會出現在這裡。
        </p>
      ) : (
        <ul className="preset-list">
          {presets.encounters.map((preset) => (
            <li key={preset.key}>
              <span className="encounter-name">{preset.encounter.name}</span>
              <span className="encounter-meta">
                {formatTime(preset.encounter.durationSec)} · 招式{' '}
                {preset.encounter.bossActions.length} 個 · 玩家 {preset.encounter.players.length}{' '}
                位 · {preset.fileName}
              </span>
              <button type="button" className="primary" onClick={() => onAdd(preset)}>
                加入
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
