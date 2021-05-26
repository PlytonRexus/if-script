import { interpreter as IF } from 'if-script-core'

let storyObj = JSON.parse(localStorage.getItem('if_r-if-object'))
IF.story = storyObj.story
document.title = IF.story.variables.title ?? 'IF | Preview'

IF.methods.loadStory(IF.story)
