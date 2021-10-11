import IFScript from 'if-script-core/src/IFScript.mjs'
import Story from 'if-script-core/src/models/Story.mjs'

const ifscript = new IFScript('STREAM')
ifscript.init()
.then(function () {
  const parser = ifscript.parser
  const interpreter = ifscript.interpreter

	let storyObj = localStorage.getItem('if_r-if-object')
	const story = Story.fromJson(storyObj)

	let theme = {
		name: 'choicescript-sepia'
	}

	function useTheme(themeName) {
		theme.name = themeName

		if (!theme.name) {
			theme.name = 'choicescript-sepia'
		}
	}

	if (typeof window !== 'undefined' && !!window && !!window.location) {
		let url = new URL(window.location.href)
		let themeName = url.searchParams.get("theme")
		if (!!themeName) useTheme(themeName)
	}

	interpreter.loadStory(story, null, theme.name)
	document.title = interpreter.run.story.name ?? 'IF | Preview'
})
.catch(err => console.log(err))
