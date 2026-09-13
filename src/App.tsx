import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { BossActionTable } from './components/BossActionTable'
import type { ActionEditor } from './components/BossActionTable'
import { EncounterForm } from './components/EncounterForm'
import { SkillEntryTable } from './components/SkillEntryTable'
import { TimelineView } from './components/TimelineView'
import { createSampleEncounter } from './data/sample'
import { getSkillsForJob } from './data/skills'
import { useEncounters } from './hooks/useEncounters'
import {
  addBossAction,
  addPlayer,
  addSkillEntry,
  countInvalidSkillEntries,
  createEncounter,
  latestUsedSec,
  removeBossAction,
  removePlayer,
  removeSkillEntry,
  setPlayerJob,
  updateBossAction,
  updateEncounterInfo,
  updateSkillEntry,
} from './lib/encounterOps'
import { formatTime } from './lib/timeScale'
import { downloadTextFile, exportFileName, serializeExport } from './lib/transfer'
import { MAX_PLAYERS } from './types/timeline'
import type { Encounter } from './types/timeline'

/** Only one add/edit form is open at a time, either for the boss or for one player. */
type Editor =
  | { target: 'boss'; state: NonNullable<ActionEditor> }
  | { target: 'player'; playerId: string; state: NonNullable<ActionEditor> }
  | null

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
  const [editor, setEditor] = useState<Editor>(null)
  const [bossCollapsed, setBossCollapsed] = useState(false)
  const [collapsedPlayerIds, setCollapsedPlayerIds] = useState<ReadonlySet<string>>(new Set())

  const selected = encounters.find((e) => e.id === selectedId) ?? encounters[0]

  const allPlayersCollapsed =
    selected !== undefined &&
    selected.players.length > 0 &&
    selected.players.every((p) => collapsedPlayerIds.has(p.id))
  const togglePlayerCollapsed = (playerId: string) => {
    setCollapsedPlayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const bossEditor = editor?.target === 'boss' ? editor.state : null
  const setBossEditor = (state: ActionEditor) => {
    setEditor(state ? { target: 'boss', state } : null)
  }
  const playerEditor = (playerId: string) =>
    editor?.target === 'player' && editor.playerId === playerId ? editor.state : null
  const setPlayerEditor = (playerId: string) => (state: ActionEditor) => {
    setEditor(state ? { target: 'player', playerId, state } : null)
  }
  const isEditing = (id: string) => editor?.state.mode === 'edit' && editor.state.id === id

  const selectEncounter = (id: string) => {
    setSelectedId(id)
    setEditingInfo(false)
    setEditor(null)
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
      setEditor(null)
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
                  minDurationSec={latestUsedSec(selected)}
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
            selectedBossActionId={bossEditor?.mode === 'edit' ? bossEditor.id : null}
            onBossActionClick={(id) => setBossEditor({ mode: 'edit', id })}
            selectedSkillEntryId={
              editor?.target === 'player' && editor.state.mode === 'edit' ? editor.state.id : null
            }
            onSkillEntryClick={(playerId, id) => setPlayerEditor(playerId)({ mode: 'edit', id })}
          />

          <BossActionTable
            encounter={selected}
            editor={bossEditor}
            onEditorChange={setBossEditor}
            onAdd={(values) => {
              updateEncounter(selected.id, (e) => addBossAction(e, values))
              setEditor(null)
            }}
            onUpdate={(id, values) => {
              updateEncounter(selected.id, (e) => updateBossAction(e, id, values))
              setEditor(null)
            }}
            onRemove={(action) => {
              if (!window.confirm(`確定要刪除招式「${action.name}」嗎？`)) return
              updateEncounter(selected.id, (e) => removeBossAction(e, action.id))
              if (isEditing(action.id)) setEditor(null)
            }}
            collapsed={bossCollapsed}
            onToggleCollapsed={() => setBossCollapsed((c) => !c)}
          />

          <div className="players-header">
            <h2>玩家技能</h2>
            <span className="muted">
              {selected.players.length} / {MAX_PLAYERS} 位
            </span>
            <div className="panel-header-buttons">
              <button
                type="button"
                onClick={() =>
                  setCollapsedPlayerIds(
                    allPlayersCollapsed ? new Set() : new Set(selected.players.map((p) => p.id)),
                  )
                }
                disabled={selected.players.length === 0}
              >
                {allPlayersCollapsed ? '全部展開' : '全部收合'}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => updateEncounter(selected.id, addPlayer)}
                disabled={selected.players.length >= MAX_PLAYERS}
              >
                新增玩家
              </button>
            </div>
          </div>
          {selected.players.length === 0 && (
            <p className="empty">尚無玩家軌道，按「新增玩家」開始。</p>
          )}
          {selected.players.map((player, index) => (
              <SkillEntryTable
                key={player.id}
                player={player}
                index={index}
                collapsed={collapsedPlayerIds.has(player.id)}
                onToggleCollapsed={() => togglePlayerCollapsed(player.id)}
                durationSec={selected.durationSec}
                skills={getSkillsForJob(player.job)}
                editor={playerEditor(player.id)}
                onEditorChange={setPlayerEditor(player.id)}
                onJobChange={(job) => {
                  if (job === player.job) return
                  const available = new Set(getSkillsForJob(job).map((s) => s.id))
                  const isValid = (skillId: string) => available.has(skillId)
                  const affected = countInvalidSkillEntries(player, isValid)
                  if (
                    affected > 0 &&
                    !window.confirm(
                      `有 ${affected} 個技能不屬於新職業，切換後會保留名稱並改為自訂技能。確定要切換嗎？`,
                    )
                  ) {
                    return
                  }
                  updateEncounter(selected.id, (e) => setPlayerJob(e, player.id, job, isValid))
                  if (editor?.target === 'player' && editor.playerId === player.id) setEditor(null)
                }}
                onAdd={(values) => {
                  updateEncounter(selected.id, (e) => addSkillEntry(e, player.id, values))
                  setEditor(null)
                }}
                onUpdate={(id, values) => {
                  updateEncounter(selected.id, (e) => updateSkillEntry(e, player.id, id, values))
                  setEditor(null)
                }}
                onRemove={(entry) => {
                  if (!window.confirm(`確定要刪除技能「${entry.label}」嗎？`)) return
                  updateEncounter(selected.id, (e) => removeSkillEntry(e, player.id, entry.id))
                  if (isEditing(entry.id)) setEditor(null)
                }}
                onRemovePlayer={() => {
                  const entryCount = player.entries.length
                  const message =
                    entryCount > 0
                      ? `確定要移除玩家 ${index + 1} 嗎？其 ${entryCount} 個技能會一併刪除，此操作無法復原。`
                      : `確定要移除玩家 ${index + 1} 嗎？`
                  if (!window.confirm(message)) return
                  updateEncounter(selected.id, (e) => removePlayer(e, player.id))
                  if (editor?.target === 'player' && editor.playerId === player.id) setEditor(null)
                }}
              />
            ))}
        </>
      )}
    </main>
  )
}

export default App
