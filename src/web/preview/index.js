import IF from '../../interpreter/if_r-terp'
import '../../interpreter/if_r.css'

let storyObj = JSON.parse(localStorage.getItem('if_r-if-object'))
IF.story = storyObj.story
document.title = IF.story.variables.title ?? 'IF | Preview'

IF.methods.loadStory(IF.story)
