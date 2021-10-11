import IFScript from 'if-script-core/src/IFScript.mjs'
import Story from 'if-script-core/src/models/Story.mjs'

const ifscript = new IFScript('STREAM')
ifscript.init()
.then(function () {
  const parser = ifscript.parser
  const interpreter = ifscript.interpreter

	let storyObj = localStorage.getItem('if_r-if-object')
	const story = Story.fromJson(storyObj)
	interpreter.loadStory(story, null, 'bricks')
	document.title = interpreter.run.story.name ?? 'IF | Preview'
})
.catch(err => console.log(err))
