import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { BossActionTable } from './components/BossActionTable'
import type { ActionEditor } from './components/BossActionTable'
import { EncounterForm } from './components/EncounterForm'
import { TimelineView } from './components/TimelineView'
import { createSampleEncounter } from './data/sample'
import { useEncounters } from './hooks/useEncounters'
import {
  addBossAction,
  createEncounter,
  lastBossActionEndSec,
  removeBossAction,
  updateBossAction,
  updateEncounterInfo,
} from './lib/encounterOps'
import { formatTime } from './lib/timeScale'
import { downloadTextFile, exportFileName, serializeExport } from './lib/transfer'
import type { Encounter } from './types/timeline'

function App() {
  const {
    encounters,
    loadError,
    saveError,
    addEncounter,
    updateEncounter,
    removeEncounter,
    importFromText,
  } = useEncounters()
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingEncounter, setCreatingEncounter] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [actionEditor, setActionEditor] = useState<ActionEditor>(null)

  const selected = encounters.find((e) => e.id === selectedId) ?? encounters[0]

  const selectEncounter = (id: string) => {
    setSelectedId(id)
    setEditingInfo(false)
    setActionEditor(null)
  }

  const addAndSelect = (encounter: Encounter) => {
    addEncounter(encounter)
    selectEncounter(encounter.id)
  }

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

  const handleRemoveEncounter = (encounter: Encounter) => {
    if (!window.confirm(`確定要刪除副本「${encounter.name}」嗎？此操作無法復原。`)) return
    removeEncounter(encounter.id)
    if (encounter === selected) {
      setEditingInfo(false)
      setActionEditor(null)
    }
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
        <button
          type="button"
          className="primary"
          onClick={() => setCreatingEncounter(true)}
          disabled={creatingEncounter}
        >
          新增副本
        </button>
        <button type="button" onClick={() => addAndSelect(createSampleEncounter('範例副本'))}>
          新增範例副本
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

      {creatingEncounter && (
        <section className="panel">
          <h2>新增副本</h2>
          <EncounterForm
            submitLabel="建立"
            onSubmit={(values) => {
              addAndSelect(createEncounter(values))
              setCreatingEncounter(false)
            }}
            onCancel={() => setCreatingEncounter(false)}
          />
        </section>
      )}

      {encounters.length === 0 ? (
        <p className="empty">尚無副本資料，按「新增副本」開始建立。</p>
      ) : (
        <ul className="encounter-list">
          {encounters.map((encounter) => (
            <li key={encounter.id} className={encounter === selected ? 'selected' : undefined}>
              <button
                type="button"
                className="encounter-select"
                onClick={() => selectEncounter(encounter.id)}
                aria-pressed={encounter === selected}
              >
                <span className="encounter-name">{encounter.name}</span>
                <span className="encounter-meta">
                  {formatTime(encounter.durationSec)} · 招式 {encounter.bossActions.length} 個 ·
                  玩家 {encounter.players.length} 位
                </span>
              </button>
              <button type="button" onClick={() => handleRemoveEncounter(encounter)}>
                刪除
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <>
          <section className="panel">
            {editingInfo ? (
              <>
                <h2>編輯副本資訊</h2>
                <EncounterForm
                  initial={selected}
                  minDurationSec={lastBossActionEndSec(selected)}
                  submitLabel="儲存"
                  onSubmit={(values) => {
                    updateEncounter(selected.id, (e) => updateEncounterInfo(e, values))
                    setEditingInfo(false)
                  }}
                  onCancel={() => setEditingInfo(false)}
                />
              </>
            ) : (
              <div className="panel-header">
                <h2>{selected.name}</h2>
                <span className="muted">時長 {formatTime(selected.durationSec)}</span>
                <button
                  type="button"
                  className="panel-header-action"
                  onClick={() => setEditingInfo(true)}
                >
                  編輯副本資訊
                </button>
              </div>
            )}
          </section>

          <TimelineView
            encounter={selected}
            selectedBossActionId={actionEditor?.mode === 'edit' ? actionEditor.id : null}
            onBossActionClick={(id) => setActionEditor({ mode: 'edit', id })}
          />

          <BossActionTable
            encounter={selected}
            editor={actionEditor}
            onEditorChange={setActionEditor}
            onAdd={(values) => {
              updateEncounter(selected.id, (e) => addBossAction(e, values))
              setActionEditor(null)
            }}
            onUpdate={(id, values) => {
              updateEncounter(selected.id, (e) => updateBossAction(e, id, values))
              setActionEditor(null)
            }}
            onRemove={(action) => {
              if (!window.confirm(`確定要刪除招式「${action.name}」嗎？`)) return
              updateEncounter(selected.id, (e) => removeBossAction(e, action.id))
              if (actionEditor?.mode === 'edit' && actionEditor.id === action.id) {
                setActionEditor(null)
              }
            }}
          />
        </>
      )}
    </main>
  )
}

export default App
