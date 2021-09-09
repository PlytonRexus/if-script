import IFScript from 'if-script-core/src/IFScript.mjs'

const IF = new IFScript(IFScript.versions().STREAM)

const interpreter = new IF.interpreter()
const storyText = localStorage.getItem('if_r-story-text')
const story = IF.parser.parseText(storyText)

interpreter.loadStory(story, null, 'bricks')
document.title = interpreter.run.story.name ?? 'IF | Preview'
