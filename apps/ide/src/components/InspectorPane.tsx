import { useEffect, useMemo, useState } from 'react'
import { applyChoiceInspectorPatch, applySceneInspectorPatch, applySectionInspectorPatch, applyStoryInspectorPatch } from '../authoring/sourceTransforms'
import type {
  AdvancedInspectorSelection,
  AuthoringSchema,
  ChoiceIndexEntry,
  SceneIndexEntry,
  SectionSettingsIndexEntry,
  StorySettingsIndexEntry
} from '../types/interfaces'

interface InspectorPaneProps {
  snapshot: Record<string, string>
  selection: AdvancedInspectorSelection
  storySettingsIndex: StorySettingsIndexEntry | null
  sceneIndex: SceneIndexEntry[]
  sectionSettingsIndex: SectionSettingsIndexEntry[]
  choiceIndex: ChoiceIndexEntry[]
  authoringSchema: AuthoringSchema | null
  onSelectionChange: (next: AdvancedInspectorSelection) => void
  onWriteFile: (file: string, nextContent: string) => void
}

function parseSectionsCsv(text: string): Array<string | number> {
  return text
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => (/^-?\d+$/.test(entry) ? Number(entry) : entry))
}

export function InspectorPane(props: InspectorPaneProps): JSX.Element {
  const [syntaxPreview, setSyntaxPreview] = useState('')
  const [lastMessage, setLastMessage] = useState('')

  const activeScene = useMemo(() => {
    if (props.sceneIndex.length === 0) return null
    if (props.selection.sceneSerial == null) return props.sceneIndex[0]
    return props.sceneIndex.find(scene => scene.serial === props.selection.sceneSerial) ?? props.sceneIndex[0]
  }, [props.sceneIndex, props.selection.sceneSerial])

  const activeSection = useMemo(() => {
    if (props.sectionSettingsIndex.length === 0) return null
    if (props.selection.sectionSerial == null) return props.sectionSettingsIndex[0]
    return props.sectionSettingsIndex.find(section => section.sectionSerial === props.selection.sectionSerial) ?? props.sectionSettingsIndex[0]
  }, [props.sectionSettingsIndex, props.selection.sectionSerial])

  const activeChoice = useMemo(() => {
    if (props.choiceIndex.length === 0) return null
    if (!props.selection.choiceId) return props.choiceIndex[0]
    return props.choiceIndex.find(choice => choice.id === props.selection.choiceId) ?? props.choiceIndex[0]
  }, [props.choiceIndex, props.selection.choiceId])

  const [storyForm, setStoryForm] = useState({
    fullTimerSeconds: '',
    fullTimerTarget: '',
    fullTimerOutcome: '',
    storyAmbience: '',
    storyAmbienceVolume: '1',
    storyAmbienceLoop: true,
    presentationMode: 'literary' as 'literary' | 'cinematic'
  })
  const [sceneForm, setSceneForm] = useState({
    name: '',
    first: '',
    sectionsCsv: '',
    ambience: '',
    ambienceVolume: '1',
    ambienceLoop: true,
    transition: 'cut'
  })
  const [sectionForm, setSectionForm] = useState({
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
  const [choiceForm, setChoiceForm] = useState({
    targetType: 'section' as 'section' | 'scene',
    target: '',
    choiceSfx: '',
    focusSfx: ''
  })

  useEffect(() => {
    const story = props.storySettingsIndex
    if (!story) return
    setStoryForm({
      fullTimerSeconds: story.fullTimerSeconds == null ? '' : String(story.fullTimerSeconds),
      fullTimerTarget: story.fullTimerTarget == null ? '' : String(story.fullTimerTarget),
      fullTimerOutcome: story.fullTimerOutcome ?? '',
      storyAmbience: story.storyAmbience ?? '',
      storyAmbienceVolume: String(story.storyAmbienceVolume ?? 1),
      storyAmbienceLoop: story.storyAmbienceLoop !== false,
      presentationMode: story.presentationMode
    })
  }, [props.storySettingsIndex])

  useEffect(() => {
    if (!activeScene) return
    setSceneForm({
      name: activeScene.name ?? '',
      first: activeScene.first == null ? '' : String(activeScene.first),
      sectionsCsv: activeScene.sections.map(entry => String(entry)).join(', '),
      ambience: '',
      ambienceVolume: '1',
      ambienceLoop: true,
      transition: activeScene.sceneTransition ?? 'cut'
    })
  }, [activeScene?.serial])

  useEffect(() => {
    if (!activeSection) return
    setSectionForm({
      timerSeconds: activeSection.timerSeconds == null ? '' : String(activeSection.timerSeconds),
      timerTarget: activeSection.timerTarget == null ? '' : String(activeSection.timerTarget),
      timerOutcome: activeSection.timerOutcome ?? '',
      ambience: activeSection.ambience ?? '',
      ambienceVolume: String(activeSection.ambienceVolume ?? 1),
      ambienceLoop: activeSection.ambienceLoop !== false,
      sfxCsv: activeSection.sfx.join(', '),
      backdrop: activeSection.backdrop ?? '',
      shot: activeSection.shot,
      textPacing: activeSection.textPacing
    })
  }, [activeSection?.sectionSerial])

  useEffect(() => {
    if (!activeChoice) return
    setChoiceForm({
      targetType: activeChoice.targetType,
      target: activeChoice.target == null ? '' : String(activeChoice.target),
      choiceSfx: activeChoice.choiceSfx ?? '',
      focusSfx: activeChoice.focusSfx ?? ''
    })
  }, [activeChoice?.id])

  const tabButtons: Array<{ id: AdvancedInspectorSelection['activeTab'], label: string }> = [
    { id: 'story', label: 'Story' },
    { id: 'scene', label: 'Scene' },
    { id: 'section', label: 'Section' },
    { id: 'choice', label: 'Choice' }
  ]

  const applyStory = () => {
    if (!props.storySettingsIndex) return
    const file = props.storySettingsIndex.file
    const content = props.snapshot[file]
    if (typeof content !== 'string') return
    const result = applyStoryInspectorPatch(content, {
      settings: props.storySettingsIndex,
      fullTimerSeconds: storyForm.fullTimerSeconds.trim() === '' ? null : Number(storyForm.fullTimerSeconds),
      fullTimerTarget: storyForm.fullTimerTarget.trim() === '' ? null : storyForm.fullTimerTarget.trim(),
      fullTimerOutcome: storyForm.fullTimerOutcome.trim() === '' ? null : storyForm.fullTimerOutcome.trim(),
      storyAmbience: storyForm.storyAmbience.trim() === '' ? null : storyForm.storyAmbience.trim(),
      storyAmbienceVolume: storyForm.storyAmbienceVolume.trim() === '' ? null : Number(storyForm.storyAmbienceVolume),
      storyAmbienceLoop: storyForm.storyAmbienceLoop,
      presentationMode: storyForm.presentationMode
    })
    props.onWriteFile(file, result.content)
    setSyntaxPreview(result.syntaxPreview)
    setLastMessage(`Updated story settings in ${file}`)
  }

  const applyScene = () => {
    if (!activeScene) return
    const content = props.snapshot[activeScene.file]
    if (typeof content !== 'string') return
    const result = applySceneInspectorPatch(content, activeScene, {
      name: sceneForm.name.trim(),
      first: sceneForm.first.trim() === '' ? null : sceneForm.first.trim(),
      sections: parseSectionsCsv(sceneForm.sectionsCsv),
      ambience: sceneForm.ambience.trim() === '' ? null : sceneForm.ambience.trim(),
      ambienceVolume: sceneForm.ambienceVolume.trim() === '' ? null : Number(sceneForm.ambienceVolume),
      ambienceLoop: sceneForm.ambienceLoop,
      transition: sceneForm.transition
    })
    props.onWriteFile(activeScene.file, result.content)
    setSyntaxPreview(result.syntaxPreview)
    setLastMessage(`Updated scene "${activeScene.name}"`)
  }

  const applySection = () => {
    if (!activeSection) return
    const content = props.snapshot[activeSection.file]
    if (typeof content !== 'string') return
    const result = applySectionInspectorPatch(content, activeSection, {
      timerSeconds: sectionForm.timerSeconds.trim() === '' ? null : Number(sectionForm.timerSeconds),
      timerTarget: sectionForm.timerTarget.trim() === '' ? null : sectionForm.timerTarget.trim(),
      timerOutcome: sectionForm.timerOutcome.trim() === '' ? null : sectionForm.timerOutcome.trim(),
      ambience: sectionForm.ambience.trim() === '' ? null : sectionForm.ambience.trim(),
      ambienceVolume: sectionForm.ambienceVolume.trim() === '' ? null : Number(sectionForm.ambienceVolume),
      ambienceLoop: sectionForm.ambienceLoop,
      sfx: sectionForm.sfxCsv.split(',').map(part => part.trim()).filter(Boolean),
      backdrop: sectionForm.backdrop.trim() === '' ? null : sectionForm.backdrop.trim(),
      shot: sectionForm.shot,
      textPacing: sectionForm.textPacing
    })
    props.onWriteFile(activeSection.file, result.content)
    setSyntaxPreview(result.syntaxPreview)
    setLastMessage(`Updated section "${activeSection.sectionTitle}"`)
  }

  const applyChoice = () => {
    if (!activeChoice) return
    const content = props.snapshot[activeChoice.file]
    if (typeof content !== 'string') return
    const result = applyChoiceInspectorPatch(content, activeChoice, {
      targetType: choiceForm.targetType,
      target: choiceForm.target.trim() === '' ? null : choiceForm.target.trim(),
      choiceSfx: choiceForm.choiceSfx.trim() === '' ? null : choiceForm.choiceSfx.trim(),
      focusSfx: choiceForm.focusSfx.trim() === '' ? null : choiceForm.focusSfx.trim()
    })
    if (!result.unsupportedWriterChoice) {
      props.onWriteFile(activeChoice.file, result.content)
      setLastMessage(`Updated choice #${activeChoice.choiceIndex} in ${activeChoice.ownerSectionTitle}`)
    } else {
      setLastMessage('Writer-arrow choice editing is limited to source text for advanced props.')
    }
    setSyntaxPreview(result.syntaxPreview)
  }

  return (
    <section className="panel inspector-panel">
      <div className="panel-header">
        <h2>Inspector</h2>
        <span>Advanced authoring</span>
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Inspector tabs">
        {tabButtons.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={['mini-btn', props.selection.activeTab === tab.id ? 'active' : ''].join(' ').trim()}
            onClick={() => props.onSelectionChange({ ...props.selection, activeTab: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="inspector-body">
        {props.selection.activeTab === 'story' ? (
          <div className="inspector-form">
            <label>Full Timer Seconds<input value={storyForm.fullTimerSeconds} onChange={(event) => setStoryForm(state => ({ ...state, fullTimerSeconds: event.currentTarget.value }))} /></label>
            <label>Full Timer Target<input value={storyForm.fullTimerTarget} onChange={(event) => setStoryForm(state => ({ ...state, fullTimerTarget: event.currentTarget.value }))} /></label>
            <label>Full Timer Outcome<input value={storyForm.fullTimerOutcome} onChange={(event) => setStoryForm(state => ({ ...state, fullTimerOutcome: event.currentTarget.value }))} /></label>
            <label>Story Ambience URL<input value={storyForm.storyAmbience} onChange={(event) => setStoryForm(state => ({ ...state, storyAmbience: event.currentTarget.value }))} /></label>
            <label>Story Ambience Volume<input value={storyForm.storyAmbienceVolume} onChange={(event) => setStoryForm(state => ({ ...state, storyAmbienceVolume: event.currentTarget.value }))} /></label>
            <label className="preview-follow-toggle"><input type="checkbox" checked={storyForm.storyAmbienceLoop} onChange={(event) => setStoryForm(state => ({ ...state, storyAmbienceLoop: event.currentTarget.checked }))} />Loop</label>
            <label>Presentation Mode
              <select value={storyForm.presentationMode} onChange={(event) => setStoryForm(state => ({ ...state, presentationMode: event.currentTarget.value as 'literary' | 'cinematic' }))}>
                <option value="literary">literary</option>
                <option value="cinematic">cinematic</option>
              </select>
            </label>
            <button type="button" className="mini-btn" onClick={applyStory}>Apply Story Settings</button>
          </div>
        ) : null}

        {props.selection.activeTab === 'scene' ? (
          <div className="inspector-form">
            <label>Scene
              <select
                value={activeScene?.serial ?? ''}
                onChange={(event) => props.onSelectionChange({
                  ...props.selection,
                  sceneSerial: Number(event.currentTarget.value || 0) || null
                })}
              >
                {props.sceneIndex.map(scene => <option key={scene.serial} value={scene.serial}>{scene.name}</option>)}
              </select>
            </label>
            <label>Name<input value={sceneForm.name} onChange={(event) => setSceneForm(state => ({ ...state, name: event.currentTarget.value }))} /></label>
            <label>First Section Target<input value={sceneForm.first} onChange={(event) => setSceneForm(state => ({ ...state, first: event.currentTarget.value }))} /></label>
            <label>Sections (comma-separated)<input value={sceneForm.sectionsCsv} onChange={(event) => setSceneForm(state => ({ ...state, sectionsCsv: event.currentTarget.value }))} /></label>
            <label>Scene Ambience URL<input value={sceneForm.ambience} onChange={(event) => setSceneForm(state => ({ ...state, ambience: event.currentTarget.value }))} /></label>
            <label>Scene Ambience Volume<input value={sceneForm.ambienceVolume} onChange={(event) => setSceneForm(state => ({ ...state, ambienceVolume: event.currentTarget.value }))} /></label>
            <label className="preview-follow-toggle"><input type="checkbox" checked={sceneForm.ambienceLoop} onChange={(event) => setSceneForm(state => ({ ...state, ambienceLoop: event.currentTarget.checked }))} />Loop</label>
            <label>Scene Transition
              <select value={sceneForm.transition} onChange={(event) => setSceneForm(state => ({ ...state, transition: event.currentTarget.value }))}>
                <option value="cut">cut</option>
                <option value="fade">fade</option>
                <option value="dissolve">dissolve</option>
                <option value="slide">slide</option>
              </select>
            </label>
            <button type="button" className="mini-btn" onClick={applyScene}>Apply Scene Settings</button>
          </div>
        ) : null}

        {props.selection.activeTab === 'section' ? (
          <div className="inspector-form">
            <label>Section
              <select
                value={activeSection?.sectionSerial ?? ''}
                onChange={(event) => props.onSelectionChange({
                  ...props.selection,
                  sectionSerial: Number(event.currentTarget.value || 0) || null
                })}
              >
                {props.sectionSettingsIndex.map(section => <option key={section.sectionSerial} value={section.sectionSerial}>{section.sectionTitle}</option>)}
              </select>
            </label>
            <label>Timer Seconds<input value={sectionForm.timerSeconds} onChange={(event) => setSectionForm(state => ({ ...state, timerSeconds: event.currentTarget.value }))} /></label>
            <label>Timer Target<input value={sectionForm.timerTarget} onChange={(event) => setSectionForm(state => ({ ...state, timerTarget: event.currentTarget.value }))} /></label>
            <label>Timer Outcome<input value={sectionForm.timerOutcome} onChange={(event) => setSectionForm(state => ({ ...state, timerOutcome: event.currentTarget.value }))} /></label>
            <label>Ambience URL<input value={sectionForm.ambience} onChange={(event) => setSectionForm(state => ({ ...state, ambience: event.currentTarget.value }))} /></label>
            <label>Ambience Volume<input value={sectionForm.ambienceVolume} onChange={(event) => setSectionForm(state => ({ ...state, ambienceVolume: event.currentTarget.value }))} /></label>
            <label className="preview-follow-toggle"><input type="checkbox" checked={sectionForm.ambienceLoop} onChange={(event) => setSectionForm(state => ({ ...state, ambienceLoop: event.currentTarget.checked }))} />Loop</label>
            <label>SFX (comma-separated)<input value={sectionForm.sfxCsv} onChange={(event) => setSectionForm(state => ({ ...state, sfxCsv: event.currentTarget.value }))} /></label>
            <label>Backdrop URL<input value={sectionForm.backdrop} onChange={(event) => setSectionForm(state => ({ ...state, backdrop: event.currentTarget.value }))} /></label>
            <label>Shot
              <select value={sectionForm.shot} onChange={(event) => setSectionForm(state => ({ ...state, shot: event.currentTarget.value }))}>
                <option value="wide">wide</option>
                <option value="medium">medium</option>
                <option value="close">close</option>
                <option value="extreme_close">extreme_close</option>
              </select>
            </label>
            <label>Text Pacing
              <select value={sectionForm.textPacing} onChange={(event) => setSectionForm(state => ({ ...state, textPacing: event.currentTarget.value }))}>
                <option value="instant">instant</option>
                <option value="typed">typed</option>
                <option value="cinematic">cinematic</option>
              </select>
            </label>
            <button type="button" className="mini-btn" onClick={applySection}>Apply Section Settings</button>
          </div>
        ) : null}

        {props.selection.activeTab === 'choice' ? (
          <div className="inspector-form">
            <label>Choice
              <select
                value={activeChoice?.id ?? ''}
                onChange={(event) => props.onSelectionChange({
                  ...props.selection,
                  choiceId: event.currentTarget.value || null
                })}
              >
                {props.choiceIndex.map(choice => (
                  <option key={choice.id} value={choice.id}>
                    {choice.ownerSectionTitle} #{choice.choiceIndex} - {choice.textPreview || '(no text)'}
                  </option>
                ))}
              </select>
            </label>
            <label>Target Type
              <select value={choiceForm.targetType} onChange={(event) => setChoiceForm(state => ({ ...state, targetType: event.currentTarget.value as 'section' | 'scene' }))}>
                <option value="section">section</option>
                <option value="scene">scene</option>
              </select>
            </label>
            <label>Target<input value={choiceForm.target} onChange={(event) => setChoiceForm(state => ({ ...state, target: event.currentTarget.value }))} /></label>
            <label>Choice SFX<input value={choiceForm.choiceSfx} onChange={(event) => setChoiceForm(state => ({ ...state, choiceSfx: event.currentTarget.value }))} /></label>
            <label>Focus SFX<input value={choiceForm.focusSfx} onChange={(event) => setChoiceForm(state => ({ ...state, focusSfx: event.currentTarget.value }))} /></label>
            <button type="button" className="mini-btn" onClick={applyChoice}>Apply Choice Settings</button>
          </div>
        ) : null}

        <div className="inspector-meta">
          <p>{lastMessage || `Schema v${props.authoringSchema?.version ?? 'n/a'}`}</p>
          {syntaxPreview ? (
            <pre className="inspector-syntax-preview">{syntaxPreview}</pre>
          ) : (
            <p className="empty-message">Apply changes to preview generated syntax.</p>
          )}
        </div>
      </div>
    </section>
  )
}
