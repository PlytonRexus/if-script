import type { AuthoringSchema } from '../types/interfaces'

export const FALLBACK_AUTHORING_SCHEMA: AuthoringSchema = {
  version: 1,
  contexts: {
    story: {
      title: 'Story',
      properties: [
        { keyword: '@storyTitle', field: 'name', type: 'string', description: 'Story title used in runtime.' },
        { keyword: '@startAt', field: 'startAt', type: 'sectionTarget', description: 'Initial section ref when runtime starts.' },
        { keyword: '@referrable', field: 'referrable', type: 'boolean', defaultValue: false },
        { keyword: '@fullTimer', field: 'fullTimer', type: 'timerTarget', description: 'Story-wide timer.' },
        { keyword: '@fullTimerOutcome', field: 'fullTimerOutcome', type: 'string', description: 'Story timer outcome text.' },
        { keyword: '@storyAmbience', field: 'storyAmbience', type: 'string', description: 'Fallback story ambience URL.' },
        { keyword: '@storyAmbienceVolume', field: 'storyAmbienceVolume', type: 'number', min: 0, max: 1, defaultValue: 1 },
        { keyword: '@storyAmbienceLoop', field: 'storyAmbienceLoop', type: 'boolean', defaultValue: true },
        { keyword: '@storyAmbienceFadeInMs', field: 'storyAmbienceFadeInMs', type: 'number', defaultValue: 0 },
        { keyword: '@storyAmbienceFadeOutMs', field: 'storyAmbienceFadeOutMs', type: 'number', defaultValue: 0 },
        { keyword: '@presentationMode', field: 'presentationMode', type: 'enum', enumValues: ['literary', 'cinematic'], defaultValue: 'literary' },
        { keyword: '@maxIterations', field: 'maxIterations', type: 'number', defaultValue: 10000 },
        { keyword: '@maxCallDepth', field: 'maxCallDepth', type: 'number', defaultValue: 1000 },
        { keyword: '@theme', field: 'theme', type: 'string', defaultValue: 'literary-default' },
        { keyword: '@allowUndo', field: 'allowUndo', type: 'boolean', defaultValue: true },
        { keyword: '@showTurn', field: 'showTurn', type: 'boolean', defaultValue: false },
        { keyword: '@animations', field: 'animations', type: 'boolean', defaultValue: true },
        { keyword: '@autoSave', field: 'autoSave', type: 'boolean', defaultValue: false }
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
        { keyword: '@sceneAmbienceFadeInMs', field: 'musicFadeInMs', type: 'number', defaultValue: 0 },
        { keyword: '@sceneAmbienceFadeOutMs', field: 'musicFadeOutMs', type: 'number', defaultValue: 0 },
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
        { keyword: '@ambienceFadeInMs', field: 'ambienceFadeInMs', type: 'number', defaultValue: 0 },
        { keyword: '@ambienceFadeOutMs', field: 'ambienceFadeOutMs', type: 'number', defaultValue: 0 },
        { keyword: '@sfx', field: 'sfx', type: 'stringList', repeatable: true },
        { keyword: '@backdrop', field: 'backdrop', type: 'string' },
        { keyword: '@shot', field: 'shot', type: 'enum', enumValues: ['wide', 'medium', 'close', 'extreme_close'], defaultValue: 'medium' },
        { keyword: '@textPacing', field: 'textPacing', type: 'enum', enumValues: ['instant', 'typed', 'cinematic'], defaultValue: 'instant' }
      ]
    },
    choice: {
      title: 'Choice',
      properties: [
        { keyword: '@input', field: 'input', type: 'variableName' },
        { keyword: '@targetType', field: 'targetType', type: 'enum', enumValues: ['section', 'scene'], defaultValue: 'section' },
        { keyword: '@target', field: 'target', type: 'targetRef' },
        { keyword: '@action', field: 'actions', type: 'expression', repeatable: true },
        { keyword: '@when', field: 'when', type: 'expression' },
        { keyword: '@once', field: 'once', type: 'boolean', defaultValue: false },
        { keyword: '@disabledText', field: 'disabledText', type: 'string' },
        { keyword: '@choiceSfx', field: 'choiceSfx', type: 'string' },
        { keyword: '@focusSfx', field: 'focusSfx', type: 'string' },
        { keyword: '@choiceStyle', field: 'choiceStyle', type: 'enum', enumValues: ['default', 'primary', 'subtle', 'danger'], defaultValue: 'default' }
      ]
    }
  }
}
