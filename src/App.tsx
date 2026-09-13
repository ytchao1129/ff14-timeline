import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { TimelineView } from './components/TimelineView'
import { createSampleEncounter } from './data/sample'
import { useEncounters } from './hooks/useEncounters'
import { downloadTextFile, exportFileName, serializeExport } from './lib/transfer'

function App() {
  const { encounters, loadError, saveError, addEncounter, removeEncounter, importFromText } =
    useEncounters()
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = encounters.find((e) => e.id === selectedId) ?? encounters[0]

  const handleExport = () => {
    downloadTextFile(exportFileName(), serializeExport(encounters))
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const result = importFromText(await file.text())
    setImportMessage(result.ok ? `已匯入 ${result.value} 個副本` : `匯入失敗：${result.error}`)
    // Allow importing the same file again.
    input.value = ''
  }

  const handleRemove = (id: string, name: string) => {
    if (window.confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) removeEncounter(id)
  }

  return (
    <main className="app">
      <h1>FF14 副本排軸器</h1>

      {loadError && (
        <p className="alert" role="alert">
          {loadError}。原始資料已另存備份，目前以空白資料開始。
        </p>
      )}
      {saveError && (
        <p className="alert" role="alert">
          {saveError}
        </p>
      )}

      <div className="toolbar">
        <button type="button" onClick={() => addEncounter(createSampleEncounter())}>
          新增測試副本
        </button>
        <button type="button" onClick={handleExport} disabled={encounters.length === 0}>
          匯出
        </button>
        <label className="button">
          匯入
          <input type="file" accept=".json,application/json" onChange={handleImport} hidden />
        </label>
      </div>
      {importMessage && <p className="status">{importMessage}</p>}

      {encounters.length === 0 ? (
        <p className="empty">尚無副本資料</p>
      ) : (
        <ul className="encounter-list">
          {encounters.map((encounter) => (
            <li key={encounter.id} className={encounter === selected ? 'selected' : undefined}>
              <button
                type="button"
                className="encounter-select"
                onClick={() => setSelectedId(encounter.id)}
                aria-pressed={encounter === selected}
              >
                <span className="encounter-name">{encounter.name}</span>
                <span className="encounter-meta">
                  {encounter.durationSec} 秒 · 招式 {encounter.bossActions.length} 個 · 玩家{' '}
                  {encounter.players.length} 位
                </span>
              </button>
              <button type="button" onClick={() => handleRemove(encounter.id, encounter.name)}>
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && <TimelineView encounter={selected} />}
    </main>
  )
}

export default App
