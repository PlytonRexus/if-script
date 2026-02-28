import { describe, expect, it } from 'vitest'
import {
  applyChoiceInspectorPatch,
  applySceneInspectorPatch,
  applySectionInspectorPatch,
  applyStoryInspectorPatch
} from '../authoring/sourceTransforms'
import type { ChoiceIndexEntry, SceneIndexEntry, SectionSettingsIndexEntry, StorySettingsIndexEntry } from '../types/interfaces'

describe('sourceTransforms', () => {
  it('patches story settings block with advanced properties', () => {
    const content = [
      'settings__',
      '  @name "Demo"',
      '__settings',
      '',
      'section "Start"',
      '  "Hello"',
      'end',
      ''
    ].join('\n')
    const settings: StorySettingsIndexEntry = {
      file: '/workspace/main.if',
      line: 1,
      col: 1,
      storyTitle: 'Demo',
      fullTimerSeconds: null,
      fullTimerTarget: null,
      fullTimerOutcome: null,
      storyAmbience: null,
      storyAmbienceVolume: 1,
      storyAmbienceLoop: true,
      presentationMode: 'literary'
    }

    const patched = applyStoryInspectorPatch(content, {
      settings,
      fullTimerSeconds: 30,
      fullTimerTarget: 'Timeout',
      fullTimerOutcome: 'You froze.',
      storyAmbience: '/audio/story.mp3',
      storyAmbienceVolume: 0.5,
      storyAmbienceLoop: true,
      presentationMode: 'cinematic'
    })

    expect(patched.content).toContain('@fullTimer 30 "Timeout"')
    expect(patched.content).toContain('@storyAmbience "/audio/story.mp3"')
    expect(patched.content).toContain('@presentationMode "cinematic"')
    expect(patched.syntaxPreview).toContain('@fullTimerOutcome "You froze."')
  })

  it('patches scene block properties and keeps section map', () => {
    const content = [
      'scene__',
      '  @name "Old Name"',
      '  @first "Intro"',
      '__scene',
      ''
    ].join('\n')
    const scene: SceneIndexEntry = {
      serial: 1,
      name: 'Old Name',
      first: 'Intro',
      sections: ['Intro'],
      file: '/workspace/main.if',
      line: 1,
      col: 1,
      hasAmbience: false,
      sceneTransition: 'cut',
      firstResolved: true
    }

    const patched = applySceneInspectorPatch(content, scene, {
      name: 'Act One',
      first: 'Prologue',
      sections: ['Prologue', 'Hallway'],
      ambience: '/audio/scene.mp3',
      ambienceVolume: 0.8,
      ambienceLoop: true,
      transition: 'fade'
    })

    expect(patched.content).toContain('@name "Act One"')
    expect(patched.content).toContain('@sections "Prologue" "Hallway"')
    expect(patched.content).toContain('@sceneTransition "fade"')
  })

  it('patches section block timer/audio/cinematic settings', () => {
    const content = [
      'section__',
      '  @title "Prologue"',
      '__section',
      ''
    ].join('\n')
    const section: SectionSettingsIndexEntry = {
      sectionSerial: 1,
      sectionTitle: 'Prologue',
      file: '/workspace/main.if',
      line: 1,
      col: 1,
      timerSeconds: null,
      timerTarget: null,
      timerOutcome: null,
      ambience: null,
      ambienceVolume: 1,
      ambienceLoop: true,
      sfx: [],
      backdrop: null,
      shot: 'medium',
      textPacing: 'instant'
    }

    const patched = applySectionInspectorPatch(content, section, {
      timerSeconds: 10,
      timerTarget: 'Timeout',
      timerOutcome: 'Too late.',
      ambience: '/audio/rain.mp3',
      ambienceVolume: 0.4,
      ambienceLoop: false,
      sfx: ['/audio/click.mp3', '/audio/chime.mp3'],
      backdrop: '/images/bg.jpg',
      shot: 'wide',
      textPacing: 'cinematic'
    })

    expect(patched.content).toContain('@timer 10 "Timeout"')
    expect(patched.content).toContain('@sfx "/audio/chime.mp3"')
    expect(patched.content).toContain('@shot "wide"')
    expect(patched.syntaxPreview).toContain('@textPacing "cinematic"')
  })

  it('patches legacy choice block target/audio properties', () => {
    const content = [
      'choice__',
      '  @target "OldTarget"',
      '  "Continue"',
      '__choice',
      ''
    ].join('\n')
    const choice: ChoiceIndexEntry = {
      id: 'choice:1:1',
      ownerSectionSerial: 1,
      ownerSectionTitle: 'Prologue',
      choiceIndex: 1,
      file: '/workspace/main.if',
      line: 1,
      col: 1,
      sourceMode: 'legacy',
      targetType: 'section',
      target: 'OldTarget',
      choiceSfx: null,
      focusSfx: null,
      choiceStyle: 'default',
      textPreview: 'Continue'
    }

    const patched = applyChoiceInspectorPatch(content, choice, {
      targetType: 'scene',
      target: 'Act One',
      choiceSfx: '/audio/click.mp3',
      focusSfx: '/audio/focus.mp3'
    })

    expect(patched.unsupportedWriterChoice).toBe(false)
    expect(patched.content).toContain('@targetType "scene"')
    expect(patched.content).toContain('@target "Act One"')
    expect(patched.content).toContain('@choiceSfx "/audio/click.mp3"')
  })

  it('converts writer-arrow choice to legacy block when advanced fields are applied', () => {
    const content = [
      'section "Prologue"',
      '  -> "Continue" => "OldTarget"',
      'end',
      ''
    ].join('\n')
    const choice: ChoiceIndexEntry = {
      id: 'choice:1:1',
      ownerSectionSerial: 1,
      ownerSectionTitle: 'Prologue',
      choiceIndex: 1,
      file: '/workspace/main.if',
      line: 2,
      col: 3,
      sourceMode: 'writer',
      targetType: 'section',
      target: 'OldTarget',
      choiceSfx: null,
      focusSfx: null,
      choiceStyle: 'default',
      textPreview: 'Continue'
    }

    const patched = applyChoiceInspectorPatch(content, choice, {
      targetType: 'section',
      target: 'Next',
      input: 'playerName',
      when: 'gold >= 5',
      once: true,
      disabledText: 'Need gold',
      actions: ['gold = gold - 5'],
      choiceSfx: '/audio/click.mp3',
      focusSfx: '/audio/focus.mp3',
      choiceStyle: 'primary'
    })

    expect(patched.unsupportedWriterChoice).toBe(false)
    expect(patched.content).toContain('choice__')
    expect(patched.content).toContain('@input playerName')
    expect(patched.content).toContain('@when gold >= 5')
    expect(patched.content).toContain('@action gold = gold - 5')
    expect(patched.content).toContain('__choice')
  })
})
