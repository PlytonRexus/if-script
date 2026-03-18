import { useEffect, useState } from 'react'
import type {
  AuthorGraphNode,
  ChoiceIndexEntry,
  SectionContentIndexEntry,
  SectionSettingsIndexEntry,
  SectionWriterInput,
  WriterChoiceInput,
  WriterSectionBlockInput
} from '../types/interfaces'

interface GraphSectionWriterPaneProps {
  section: SectionSettingsIndexEntry | null
  sectionContent: SectionContentIndexEntry | null
  selectedNode: AuthorGraphNode | null
  selectedGroupLabel: string | null
  selectedChoices: ChoiceIndexEntry[]
  unsupportedReason: string | null
  onApply: (input: SectionWriterInput) => void
  onDeleteSection: () => void
  onOpenSource: () => void
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function choiceToInput(choice: ChoiceIndexEntry): WriterChoiceInput {
  return {
    id: choice.id,
    text: choice.textPreview || `Choice ${choice.choiceIndex}`,
    targetType: choice.targetType,
    target: choice.target == null ? '' : String(choice.target),
    when: choice.when ?? '',
    once: choice.once === true,
    disabledText: choice.disabledText ?? '',
    actionsText: (choice.actions ?? []).join('\n'),
    choiceSfx: choice.choiceSfx ?? '',
    focusSfx: choice.focusSfx ?? '',
    choiceStyle: choice.choiceStyle
  }
}

function cloneBlocks(blocks: WriterSectionBlockInput[]): WriterSectionBlockInput[] {
  return blocks.map(block => {
    if (block.kind !== 'conditional') return { ...block }
    return {
      ...block,
      thenBlocks: cloneBlocks(block.thenBlocks),
      elseBlocks: cloneBlocks(block.elseBlocks)
    }
  })
}

function contentToBlocks(entry: SectionContentIndexEntry | null): WriterSectionBlockInput[] {
  if (!entry) return []
  return entry.blocks.map(block => {
    if (block.kind === 'text') return { id: block.id, kind: 'text', text: block.text }
    if (block.kind === 'choice') return { id: block.id, kind: 'choice', choiceId: block.choiceId }
    return {
      id: block.id,
      kind: 'conditional',
      condition: block.condition,
      thenBlocks: contentToBlocks({ ...entry, blocks: block.thenBranch.blocks }),
      elseBlocks: contentToBlocks({ ...entry, blocks: block.elseBranch?.blocks ?? [] })
    }
  })
}

function updateBlockTree(
  blocks: WriterSectionBlockInput[],
  targetId: string,
  updater: (block: WriterSectionBlockInput) => WriterSectionBlockInput
): WriterSectionBlockInput[] {
  return blocks.map(block => {
    if (block.id === targetId) return updater(block)
    if (block.kind !== 'conditional') return block
    return {
      ...block,
      thenBlocks: updateBlockTree(block.thenBlocks, targetId, updater),
      elseBlocks: updateBlockTree(block.elseBlocks, targetId, updater)
    }
  })
}

function removeBlockTree(blocks: WriterSectionBlockInput[], targetId: string): WriterSectionBlockInput[] {
  return blocks
    .filter(block => block.id !== targetId)
    .map(block => {
      if (block.kind !== 'conditional') return block
      return {
        ...block,
        thenBlocks: removeBlockTree(block.thenBlocks, targetId),
        elseBlocks: removeBlockTree(block.elseBlocks, targetId)
      }
    })
}

function moveTopLevelBlock(blocks: WriterSectionBlockInput[], targetId: string, direction: -1 | 1): WriterSectionBlockInput[] {
  const index = blocks.findIndex(block => block.id === targetId)
  const nextIndex = index + direction
  if (index === -1 || nextIndex < 0 || nextIndex >= blocks.length) return blocks
  const next = [...blocks]
  const [item] = next.splice(index, 1)
  if (!item) return blocks
  next.splice(nextIndex, 0, item)
  return next
}

function BranchEditor(props: {
  blocks: WriterSectionBlockInput[]
  choices: WriterChoiceInput[]
  onChange: (blocks: WriterSectionBlockInput[]) => void
  onEnsureChoice: () => string
  heading: string
}): JSX.Element {
  return (
    <div className="writer-branch">
      <div className="writer-branch-header">
        <strong>{props.heading}</strong>
        <div className="graph-selection-actions">
          <button type="button" className="mini-btn" onClick={() => props.onChange([...props.blocks, { id: nextId('text'), kind: 'text', text: '' }])}>Add text</button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => props.onChange([
              ...props.blocks,
              { id: nextId('choice-block'), kind: 'choice', choiceId: props.onEnsureChoice() }
            ])}
          >
            Add choice
          </button>
        </div>
      </div>
      {props.blocks.map(block => (
        <div key={block.id} className="writer-block">
          {block.kind === 'text' ? (
            <label>
              Text
              <textarea
                value={block.text}
                onChange={(event) => props.onChange(props.blocks.map(entry => entry.id === block.id ? { ...entry, text: event.currentTarget.value } : entry))}
                rows={4}
              />
            </label>
          ) : null}
          {block.kind === 'choice' ? (
            <label>
              Choice
              <select
                value={block.choiceId}
                onChange={(event) => props.onChange(props.blocks.map(entry => entry.id === block.id ? { ...entry, choiceId: event.currentTarget.value } : entry))}
              >
                {props.choices.map(choice => (
                  <option key={choice.id} value={choice.id}>{choice.text || 'Untitled choice'}</option>
                ))}
              </select>
            </label>
          ) : null}
          {block.kind === 'conditional' ? (
            <div className="writer-conditional">
              <label>
                Condition
                <input
                  value={block.condition}
                  onChange={(event) => props.onChange(props.blocks.map(entry => entry.id === block.id ? { ...entry, condition: event.currentTarget.value } : entry))}
                />
              </label>
              <BranchEditor
                heading="Then"
                blocks={block.thenBlocks}
                choices={props.choices}
                onEnsureChoice={props.onEnsureChoice}
                onChange={(thenBlocks) => props.onChange(props.blocks.map(entry => entry.id === block.id ? { ...entry, thenBlocks } : entry))}
              />
              <BranchEditor
                heading="Else"
                blocks={block.elseBlocks}
                choices={props.choices}
                onEnsureChoice={props.onEnsureChoice}
                onChange={(elseBlocks) => props.onChange(props.blocks.map(entry => entry.id === block.id ? { ...entry, elseBlocks } : entry))}
              />
            </div>
          ) : null}
          <button type="button" className="mini-btn" onClick={() => props.onChange(props.blocks.filter(entry => entry.id !== block.id))}>Remove</button>
        </div>
      ))}
    </div>
  )
}

export function GraphSectionWriterPane(props: GraphSectionWriterPaneProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<WriterSectionBlockInput[]>([])
  const [choices, setChoices] = useState<WriterChoiceInput[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<SectionWriterInput['settings']>({
    timerSeconds: '',
    timerTarget: '',
    timerOutcome: '',
    ambience: '',
    ambienceVolume: '1',
    ambienceLoop: true,
    sfxCsv: '',
    backdrop: '',
    shot: 'medium',
    textPacing: 'instant'
  })

  useEffect(() => {
    if (!props.section) return
    setTitle(props.section.sectionTitle)
    setBlocks(contentToBlocks(props.sectionContent))
    setChoices(props.selectedChoices.map(choiceToInput))
    setSettings({
      timerSeconds: props.section.timerSeconds == null ? '' : String(props.section.timerSeconds),
      timerTarget: props.section.timerTarget == null ? '' : String(props.section.timerTarget),
      timerOutcome: props.section.timerOutcome ?? '',
      ambience: props.section.ambience ?? '',
      ambienceVolume: String(props.section.ambienceVolume ?? 1),
      ambienceLoop: props.section.ambienceLoop !== false,
      sfxCsv: props.section.sfx.join(', '),
      backdrop: props.section.backdrop ?? '',
      shot: props.section.shot,
      textPacing: props.section.textPacing
    })
  }, [props.section?.sectionSerial, props.sectionContent, props.selectedChoices])

  if (!props.section || !props.selectedNode) {
    return <p className="empty-message">Select a section to write.</p>
  }

  const ensureChoice = (): string => {
    const id = nextId('choice')
    const next: WriterChoiceInput = {
      id,
      text: 'Continue',
      targetType: 'section',
      target: '',
      when: '',
      once: false,
      disabledText: '',
      actionsText: '',
      choiceSfx: '',
      focusSfx: '',
      choiceStyle: 'default'
    }
    setChoices(state => [...state, next])
    return id
  }

  const unsupportedMessage = props.unsupportedReason ?? (props.sectionContent && !props.sectionContent.supported
    ? `This section uses unsupported constructs: ${props.sectionContent.unsupportedNodeKinds.join(', ')}`
    : null)

  return (
    <div className="graph-writer-pane">
      <header className="graph-selection-header graph-writer-header">
        <div className="graph-writer-title">
          <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} aria-label="Section title" />
          <p>{props.selectedGroupLabel ?? props.selectedNode.file.replace('/workspace/', '')}</p>
        </div>
        <div className="graph-selection-actions">
          <button type="button" className="mini-btn" onClick={() => {
            const choiceId = ensureChoice()
            setBlocks(state => [...state, { id: nextId('choice-block'), kind: 'choice', choiceId }])
          }}>Add choice</button>
          <button type="button" className="mini-btn" onClick={() => setBlocks(state => [...state, {
            id: nextId('conditional'),
            kind: 'conditional',
            condition: 'true',
            thenBlocks: [{ id: nextId('text'), kind: 'text', text: '' }],
            elseBlocks: []
          }])}>Add conditional</button>
          <button type="button" className="mini-btn" onClick={props.onDeleteSection}>Delete</button>
          <button type="button" className="mini-btn" onClick={props.onOpenSource}>View source</button>
        </div>
      </header>

      <div className="graph-selection-content graph-writer-content">
        {unsupportedMessage ? (
          <div className="graph-writer-warning">
            <p>{unsupportedMessage}</p>
            <button type="button" className="mini-btn" onClick={props.onOpenSource}>Open source</button>
          </div>
        ) : null}

        <section className="writer-section">
          <div className="writer-section-header">
            <h3>Story</h3>
            <div className="graph-selection-actions">
              <button type="button" className="mini-btn" onClick={() => setBlocks(state => [...state, { id: nextId('text'), kind: 'text', text: '' }])}>Add text</button>
            </div>
          </div>
          {blocks.length === 0 ? <p className="empty-message">Add text, choices, or conditional branches.</p> : null}
          {blocks.map((block, index) => (
            <div key={block.id} className="writer-block">
              <div className="writer-block-toolbar">
                <strong>{block.kind === 'text' ? 'Text' : block.kind === 'choice' ? 'Choice' : 'Conditional'}</strong>
                <div className="graph-selection-actions">
                  <button type="button" className="mini-btn" onClick={() => setBlocks(state => moveTopLevelBlock(state, block.id, -1))}>Up</button>
                  <button type="button" className="mini-btn" onClick={() => setBlocks(state => moveTopLevelBlock(state, block.id, 1))}>Down</button>
                  <button type="button" className="mini-btn" onClick={() => setBlocks(state => removeBlockTree(state, block.id))}>Remove</button>
                </div>
              </div>
              {block.kind === 'text' ? (
                <textarea
                  value={block.text}
                  onChange={(event) => { const value = event.target.value; setBlocks(state => state.map(entry => entry.id === block.id ? { ...entry, text: value } : entry)) }}
                  rows={5}
                />
              ) : null}
              {block.kind === 'choice' ? (
                <label>
                  Choice block
                  <select
                    value={block.choiceId}
                    onChange={(event) => { const value = event.target.value; setBlocks(state => state.map(entry => entry.id === block.id ? { ...entry, choiceId: value } : entry)) }}
                  >
                    {choices.map(choice => (
                      <option key={choice.id} value={choice.id}>{choice.text || 'Untitled choice'}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {block.kind === 'conditional' ? (
                <div className="writer-conditional">
                  <label>
                    If
                    <input
                      value={block.condition}
                      onChange={(event) => { const value = event.target.value; setBlocks(state => updateBlockTree(state, block.id, entry => entry.kind === 'conditional' ? { ...entry, condition: value } : entry)) }}
                    />
                  </label>
                  <BranchEditor
                    heading="Then branch"
                    blocks={block.thenBlocks}
                    choices={choices}
                    onEnsureChoice={ensureChoice}
                    onChange={(thenBlocks) => setBlocks(state => updateBlockTree(state, block.id, entry => entry.kind === 'conditional' ? { ...entry, thenBlocks } : entry))}
                  />
                  <BranchEditor
                    heading="Else branch"
                    blocks={block.elseBlocks}
                    choices={choices}
                    onEnsureChoice={ensureChoice}
                    onChange={(elseBlocks) => setBlocks(state => updateBlockTree(state, block.id, entry => entry.kind === 'conditional' ? { ...entry, elseBlocks } : entry))}
                  />
                </div>
              ) : null}
              {block.kind === 'choice' ? (
                <div className="writer-choice-card">
                  {(() => {
                    const choice = choices.find(entry => entry.id === block.choiceId)
                    if (!choice) return <p className="empty-message">Choice missing.</p>
                    return (
                      <>
                        <label>Text<input value={choice.text} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, text: value } : entry)) }} /></label>
                        <label>Target Type
                          <select value={choice.targetType} onChange={(event) => { const value = event.target.value as WriterChoiceInput['targetType']; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, targetType: value } : entry)) }}>
                            <option value="section">section</option>
                            <option value="scene">scene</option>
                          </select>
                        </label>
                        <label>Target<input value={choice.target} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, target: value } : entry)) }} /></label>
                        <label>When<input value={choice.when} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, when: value } : entry)) }} /></label>
                        <label>Disabled Text<input value={choice.disabledText} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, disabledText: value } : entry)) }} /></label>
                        <label>Actions<textarea value={choice.actionsText} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, actionsText: value } : entry)) }} rows={3} /></label>
                        <label>Choice SFX<input value={choice.choiceSfx} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, choiceSfx: value } : entry)) }} /></label>
                        <label>Focus SFX<input value={choice.focusSfx} onChange={(event) => { const value = event.target.value; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, focusSfx: value } : entry)) }} /></label>
                        <label>Style
                          <select value={choice.choiceStyle} onChange={(event) => { const value = event.target.value as WriterChoiceInput['choiceStyle']; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, choiceStyle: value } : entry)) }}>
                            <option value="default">default</option>
                            <option value="primary">primary</option>
                            <option value="subtle">subtle</option>
                            <option value="danger">danger</option>
                          </select>
                        </label>
                        <label className="preview-follow-toggle"><input type="checkbox" checked={choice.once} onChange={(event) => { const checked = event.target.checked; setChoices(state => state.map(entry => entry.id === choice.id ? { ...entry, once: checked } : entry)) }} />Once</label>
                      </>
                    )
                  })()}
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <section className="writer-section">
          <div className="writer-section-header">
            <h3>Section settings</h3>
            <button type="button" className="mini-btn" onClick={() => setSettingsOpen(open => !open)}>
              {settingsOpen ? 'Hide' : 'Show'}
            </button>
          </div>
          {settingsOpen ? (
            <div className="writer-settings-grid">
              <label>Timer Seconds<input value={settings.timerSeconds} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, timerSeconds: value })) }} /></label>
              <label>Timer Target<input value={settings.timerTarget} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, timerTarget: value })) }} /></label>
              <label>Timer Outcome<input value={settings.timerOutcome} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, timerOutcome: value })) }} /></label>
              <label>Ambience<input value={settings.ambience} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, ambience: value })) }} /></label>
              <label>Ambience Volume<input value={settings.ambienceVolume} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, ambienceVolume: value })) }} /></label>
              <label className="preview-follow-toggle"><input type="checkbox" checked={settings.ambienceLoop} onChange={(event) => { const checked = event.target.checked; setSettings(state => ({ ...state, ambienceLoop: checked })) }} />Loop ambience</label>
              <label>SFX<input value={settings.sfxCsv} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, sfxCsv: value })) }} /></label>
              <label>Backdrop<input value={settings.backdrop} onChange={(event) => { const value = event.target.value; setSettings(state => ({ ...state, backdrop: value })) }} /></label>
              <label>Shot
                <select value={settings.shot} onChange={(event) => { const value = event.target.value as SectionWriterInput['settings']['shot']; setSettings(state => ({ ...state, shot: value })) }}>
                  <option value="wide">wide</option>
                  <option value="medium">medium</option>
                  <option value="close">close</option>
                  <option value="extreme_close">extreme_close</option>
                </select>
              </label>
              <label>Text Pacing
                <select value={settings.textPacing} onChange={(event) => { const value = event.target.value as SectionWriterInput['settings']['textPacing']; setSettings(state => ({ ...state, textPacing: value })) }}>
                  <option value="instant">instant</option>
                  <option value="typed">typed</option>
                  <option value="cinematic">cinematic</option>
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <div className="graph-selection-actions">
          <button
            type="button"
            className="mini-btn active"
            onClick={() => props.onApply({
              title,
              blocks: cloneBlocks(blocks),
              choices: choices.map(choice => ({ ...choice })),
              settings
            })}
            disabled={Boolean(unsupportedMessage)}
          >
            Save section
          </button>
        </div>
      </div>
    </div>
  )
}
