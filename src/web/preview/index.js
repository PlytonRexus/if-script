import IFScript from 'if-script-core/src/IFScript.mjs'
import Story from 'if-script-core/src/models/Story.mjs'

const IF = new IFScript(IFScript.versions().STREAM)

const interpreter = new IF.interpreter()

let storyObj = JSON.parse(localStorage.getItem('if_r-if-object'))
const story = new Story(storyObj.name, { sections: storyObj.sections, passages: [], scenes: storyObj.scenes }, storyObj.settings, {globals: null, stats: null})
interpreter.loadStory(story, null, 'bricks')
document.title = interpreter.run.story.name ?? 'IF | Preview'
