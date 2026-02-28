import type { AuthoringSchema } from '../types/interfaces'

export const FALLBACK_AUTHORING_SCHEMA: AuthoringSchema = {
  version: 1,
  contexts: {
    story: {
      title: 'Story',
      properties: [
        { keyword: '@fullTimer', field: 'fullTimer', type: 'timerTarget', description: 'Story-wide timer.' },
        { keyword: '@fullTimerOutcome', field: 'fullTimerOutcome', type: 'string', description: 'Story timer outcome text.' },
        { keyword: '@storyAmbience', field: 'storyAmbience', type: 'string', description: 'Fallback story ambience URL.' },
        { keyword: '@storyAmbienceVolume', field: 'storyAmbienceVolume', type: 'number', min: 0, max: 1, defaultValue: 1 },
        { keyword: '@storyAmbienceLoop', field: 'storyAmbienceLoop', type: 'boolean', defaultValue: true },
        { keyword: '@presentationMode', field: 'presentationMode', type: 'enum', enumValues: ['literary', 'cinematic'], defaultValue: 'literary' }
      ]
    },
    scene: {
      title: 'Scene',
      properties: [
        { keyword: '@name', field: 'name', type: 'string' },
        { keyword: '@first', field: 'first', type: 'sectionTarget' },
        { keyword: '@sections', field: 'sections', type: 'sectionTargetList', repeatable: true },
        { keyword: '@sceneAmbience', field: 'music', type: 'string' },
        { keyword: '@sceneAmbienceVolume', field: 'musicVolume', type: 'number', min: 0, max: 1, defaultValue: 1 },
        { keyword: '@sceneAmbienceLoop', field: 'musicLoop', type: 'boolean', defaultValue: true },
        { keyword: '@sceneTransition', field: 'sceneTransition', type: 'enum', enumValues: ['cut', 'fade', 'dissolve', 'slide'], defaultValue: 'cut' }
      ],
      deprecated: [
        { keyword: '@music', replacement: '@sceneAmbience' },
        { keyword: '@musicVolume', replacement: '@sceneAmbienceVolume' },
        { keyword: '@musicLoop', replacement: '@sceneAmbienceLoop' },
        { keyword: '@musicFadeInMs', replacement: '@sceneAmbienceFadeInMs' },
        { keyword: '@musicFadeOutMs', replacement: '@sceneAmbienceFadeOutMs' }
      ]
    },
    section: {
      title: 'Section',
      properties: [
        { keyword: '@timer', field: 'timer', type: 'timerTarget' },
        { keyword: '@timerOutcome', field: 'timerOutcome', type: 'string' },
        { keyword: '@ambience', field: 'ambience', type: 'string' },
        { keyword: '@ambienceVolume', field: 'ambienceVolume', type: 'number', min: 0, max: 1, defaultValue: 1 },
        { keyword: '@ambienceLoop', field: 'ambienceLoop', type: 'boolean', defaultValue: true },
        { keyword: '@sfx', field: 'sfx', type: 'stringList', repeatable: true },
        { keyword: '@backdrop', field: 'backdrop', type: 'string' },
        { keyword: '@shot', field: 'shot', type: 'enum', enumValues: ['wide', 'medium', 'close', 'extreme_close'], defaultValue: 'medium' },
        { keyword: '@textPacing', field: 'textPacing', type: 'enum', enumValues: ['instant', 'typed', 'cinematic'], defaultValue: 'instant' }
      ]
    },
    choice: {
      title: 'Choice',
      properties: [
        { keyword: '@targetType', field: 'targetType', type: 'enum', enumValues: ['section', 'scene'], defaultValue: 'section' },
        { keyword: '@target', field: 'target', type: 'targetRef' },
        { keyword: '@choiceSfx', field: 'choiceSfx', type: 'string' },
        { keyword: '@focusSfx', field: 'focusSfx', type: 'string' },
        { keyword: '@choiceStyle', field: 'choiceStyle', type: 'enum', enumValues: ['default', 'primary', 'subtle', 'danger'], defaultValue: 'default' }
      ]
    }
  }
}
