import showdown from 'showdown'
import './if_r.css'

const IF = {}
IF.story = {}
IF.grammar = {}
IF.state = {}
IF.DEBUG = !!localStorage.getItem('IF_DEBUG')

IF.dom = {
  target_id: '#if_r-output-area',
  alert_area_id: '#if_r-alerts-area',
  section_display_id: '#if_r-section-display-area',
  burger_id: '#if_r-burger',
  stats_div_id: '#if_r-stats-div',
  stats_div_class: '.if_r-stats-div',
  undo_button_id: '#if_r-undo-button',
  reset_button_id: '#if_r-reset-button',
  variableRegex: /\$\{[a-zA-Z0-9=]+?\}/g
}

IF.methods = {
  generateHTML: function (story) {
    const {
      name,
      sections,
      passages
    } = story
    let wrapper = ''
    wrapper += `<h2>${name} - New Story</h2>`

    document.title = `${name} | IF`

    sections.forEach(section => {
      wrapper += generateHTMLForSection(section)
    })
    return wrapper
  },

  generateSectionBySerial: function (serial) {
    const section = IF.story.findSection(parseInt(serial))
    return IF.methods.generateHTMLForSection(section)
  },

  generateHTMLForSection: function (section) {
    let wrapper = ''
    if (!section) {
      IF.methods.showAlert("Something's wrong!")
      return
    }
    const {
      title,
      choices,
      text,
      serial
    } = section

    let titleText = title
    const titleVars = titleText.match(IF.dom.variableRegex)
    titleText = IF.methods.replaceVars(titleText, titleVars)

    let parasText = text
    const paraVars = parasText.match(IF.dom.variableRegex)

    parasText = IF.methods.replaceVars(parasText, paraVars)
    parasText = IF.methods.formatText(parasText)

    wrapper += `<div class="if_r-section" id="section-${serial}">`

    wrapper += `<h3 class="if_r-section-title">${titleText}</h3>`

    wrapper += `<div class="if_r-paras">${parasText}</div>`

    wrapper += `<ul class="if_r-section-choices-list" id="section-${serial}-choices">`

    wrapper = IF.methods.loadChoices(choices, wrapper, serial)

    wrapper += '</ul>'
    wrapper += '</div>'

    return wrapper
  },

  loadChoices: function (choices, wrapper, serial) {
    choices.forEach((choice, i) => {
      if (IF.methods.isSatisfied(choice.condition)) {
        const {
          target,
          owner,
          mode,
          variables
        } = choice
        const choiceVars = choice.text.match(IF.dom.variableRegex)
        let choiceText = choice.text

        choiceText = IF.methods.replaceVars(choiceText, choiceVars)

        i += 1

        wrapper += `<li class="if_r-section-choice-li">
<a class="if_r-section-choice" data-if_r-target="${target}"
data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}"
data-if_r-mode="${mode}" data-if_r-i="${i}" href="#"
data-if_r-variables="${variables.join(', ')}">${choiceText}</a>
</li>`
      }
    })

    return wrapper
  },

  isSatisfied: function (condition) {
    if (!condition) {
      return true
    }

    const {
      comparisons,
      glue,
      type
    } = condition
    // let operators = ["==", ">=", "<=", ">", "<"];

    if (glue) {
      if (glue.trim() === '&') {
        comparisons.forEach(comp => {
          const truth = IF.methods.doesMatch(comp)

          if (!truth) {
            return false
          }
        })
        return true
      } else if (glue.trim() === '|') {
        comparisons.forEach(comp => {
          const truth = IF.methods.doesMatch(comp)

          if (truth) {
            return true
          }
        })
        return false
      }
    } else {
      return IF.methods.doesMatch(comparisons[0])
    }
  },

  doesMatch: function (comp, type) {
    let truth = false
    if (type && type === 'vs') {
      const real = IF.story.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : comp.against.trim()

      // console.log("eval(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`)");

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    } else {
      const real = IF.story.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : IF.story.variables[comp.against.trim()]

      // console.log(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`);

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    }

    return truth
  },

  replaceVars: function (text, vars) {
    if (vars) {
      vars.forEach(val => {
        const varName = val.replace(/\$\{/, '').replace(/\}/, '').trim()
        const randomRegex = /random\([0-9]*,[0-9]*\)/
        if (IF.story.variables[varName] || IF.story.variables[varName] === 0) {
          if (IF.DEBUG) { console.log('Replacing:', varName, ' with', IF.story.variables[varName]) }

          let valReplace = IF.story.variables[varName]

          let arr = null
          if (typeof valReplace === 'string') { arr = (IF.story.variables[varName]).match(randomRegex) }
          if (arr && arr.length > 0) {
            let [num1, num2] = arr[0].match(/[0-9]*/g)
            num1 = parseInt(num1)
            num2 = parseInt(num2)

            valReplace =
                        Math.floor(
                          Math.random() *
                            (Math.max(num2, num1) - Math.min(num2, num1))) +
                        Math.min(num2, num1)
          }

          text =
                        text.replace(
                          new RegExp('\\$\\{\\s*' + varName + '\\s*\\}'),
                          valReplace
                        )
        } else {
          if (IF.DEBUG) { console.log('Rejecting:', varName, ', because the value is =', IF.story.variables[varName]) }
          text =
                        text.replace(
                          new RegExp('\\$\\{\\s*' + varName + '\\s*\\}'),
                          ''
                        )
        }
      })
    }

    return text
  },

  formatText: function (text) {
    if (!showdown) return text
    const converter = new showdown.Converter()
    var text = text
    return converter.makeHtml(text)
  },

  setupUndo: function () {
    IF.methods.setState({
      lastSection: IF.state.section
    })
  },

  recordOldValues: function (vars) {
    IF.state.oldValues = {}
    vars.forEach(variable => {
      IF.state.oldValues[variable] = IF.story.variables[variable]
    })
  },

  undoVars: function (vars) {
    Object.keys(vars).forEach(variable => {
      IF.story.variables[variable] = vars[variable]
    })
  },

  undoTurn: function () {
    IF.methods.undoVars(IF.state.oldValues)
    IF.methods.changeTurn(-1)
    IF.methods.switchSection(IF.state.lastSection.serial, true)
    document.querySelector(IF.dom.undo_button_id).style.display = 'none'
  },

  switchSection: function (targetSec, isUndo) {
    const sectionHTML = IF.methods.generateSectionBySerial(targetSec)
    IF.methods.loadSection(sectionHTML)

    if (!isUndo) {
      IF.methods.setupUndo()
      document.querySelector(IF.dom.undo_button_id).style.display = 'block'
    }

    const section = IF.story.findSection(targetSec)
    const {
      timer,
      target
    } = section.settings.timer
    if (IF.state.currentTimeout) { clearTimeout(IF.state.currentTimeout) }
    if (timer && target) {
      IF.state.currentTimeout = IF.methods.setTimer(timer, target)
    }

    if (!isUndo) IF.methods.changeTurn()

    IF.methods.setState({
      section: targetSec
    })

    IF.methods.showStats()
  },

  setState: function (opts) {
    Object.keys(opts).forEach(opt => {
      if (opt !== 'section') {
        IF.state[opt] = opts[opt]
        // if (opt === "turn")
        //     IF.methods.changeTurn(null, opts[opt]);
      } else if (opt === 'section') {
        // if (IF.DEBUG) console.log(IF.story.findSection(opts['section']));
        IF.state.section = IF.story.findSection(opts.section)
      }
    })
  },

  changeTurn: function (change, abs) {
    IF.methods.setState({
      turn: abs || (change ? (IF.state.turn + change) : IF.state.turn + 1)
    })

    IF.story.variables.turn = abs || (change ? (IF.state.turn + change) : IF.state.turn + 1)
  },

  showStats: function () {
    const stats = Object.keys(IF.story.variables)
    let statsHTML = `<pre> <b>Turn:</b> ${IF.state.turn}   `

    stats.forEach(stat => {
      if (stat !== 'turn')statsHTML += `<b>${stat}:</b> ${IF.story.variables[stat]}   `
    })

    statsHTML += '</pre>'

    document.querySelector(IF.dom.alert_area_id).innerHTML = statsHTML
  },

  loadSection: function (sectionHTML, serial) {
    if (!IF.story.settings.referrable) {
      IF.methods.replaceSection(sectionHTML, serial)
    } else {
      IF.methods.appendSection(sectionHTML, serial)
    }
  },

  changeVariables: function (vars, to) {
    /* Precautionary saving of old values of variables. */
    IF.methods.recordOldValues(vars)

    vars.forEach(variable => {
      IF.story.variables[variable] = parseInt(to) ? parseInt(to) : to
    })
  },

  doActions: function (actions) {
    actions.forEach(act => {
      const op = act.operator.trim()
      const subject = act.subject.trim()
      const {
        type
      } = act

      if (IF.state.oldValues[subject] !== undefined || IF.state.oldValues[subject] !== null) { IF.methods.recordOldValues([subject]) }

      if (type && type === 'vs') {
        if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
          const modifier = parseInt(act.modifier) ? parseInt(act.modifier) : act.modifier.trim()
          IF.methods.finishAction(subject, op, modifier)
        }
      } else {
        if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
          const modifier = parseInt(act.modifier.trim()) ? parseInt(act.modifier.trim()) : IF.story.variables[act.modifier.trim()]
          IF.methods.finishAction(subject, op, modifier)
        }
      }
    })
  },

  finishAction: function (subject, op, modifier) {
    if (op === '+') {
      IF.story.variables[subject] += modifier
    } else if (op === '-') {
      IF.story.variables[subject] -= modifier
    } else if (op === '*') {
      IF.story.variables[subject] *= modifier
    } else if (op === '/') {
      IF.story.variables[subject] /= modifier
    } else if (op === '=') {
      IF.story.variables[subject] = modifier
    }
  },

  executeJs: function (text) {
    return eval(text)
  },

  setTimer: function (timer, target) {
    return setTimeout(() => {
      IF.methods.switchSection(target)
    }, timer * 1000)
  },

  replaceSection: function (sectionHTML, serial) {
    if (serial) document.querySelector(IF.dom.section_display_id).innerHTML = IF.methods.generateSectionBySerial(serial)
    else {
      document.querySelector(IF.dom.section_display_id).innerHTML = sectionHTML
    }
    IF.methods.setListenersOnChoices()
  },

  appendSection: function (sectionHTML, serial) {
    if (serial) document.querySelector(IF.dom.section_display_id).innerHTML = IF.methods.generateSectionBySerial(serial)
    else {
      document.querySelector(IF.dom.section_display_id).innerHTML += sectionHTML
    }
    IF.methods.setListenersOnChoices()
  },

  showAlert: function (html) {
    document.querySelector(IF.dom.alert_area_id).innerHTML = html
    setTimeout(() => {
      document.querySelector(IF.dom.alert_area_id).innerHTML = ''
    }, 3000)
  },

  setListenersOnChoices: function () {
    document.querySelectorAll('.if_r-section-choice').forEach(choice => {
      choice.onclick = (e) => {
        e.preventDefault()
        const choiceI = choice.getAttribute('data-if_r-i')
        let { actions, targetType, owner, mode, variables: vars, target: tar } = IF.state.section.findChoice(choiceI)

        // if (IF.DEBUG) console.log("owner:", owner);

        if (targetType === 'scene') {
          const scene = IF.story.findScene(tar)
          if (IF.DEBUG === true) console.log('Going to scene ' + tar)
          tar = scene.first
          if (IF.DEBUG === true) console.log('Starting section ' + tar)
          IF.methods.doSceneActions(scene)
        }

        if (mode === 'input') {
          const inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value
          if (inputValue === '') {
            // if (IF.DEBUG === true) IF.methods.showAlert("Empty input not allowed!");
          } else {
            choice.onclick = ''
            IF.methods.changeVariables(vars, inputValue)
            if (actions) IF.methods.doActions(actions)
            IF.methods.switchSection(tar)
          }
        } else {
          choice.onclick = ''
          IF.methods.changeVariables(vars, choice.innerHTML)
          if (actions) IF.methods.doActions(actions)
          IF.methods.switchSection(tar)
        }
      }
    })
  },

  doSceneActions: function (scene) {
    if (IF.DEBUG) console.log('Doing relevant scene actions...')

    IF.state.scene = scene

    const { music } = IF.state.scene

    if (music) {
      try {
        const url = new URL(music)
        document.querySelector('#if_r-audio-source').src = music
        const player = document.querySelector('#if_r-audio-player')
        player.load()
        player.play()
        // .then(d => console.log("Playing audio now."))
        // .catch(e => console.log(e));
      } catch (e) {
        if (IF.DEBUG) console.log('Invalid URL.')
      }
    }
  },

  resetStory: function () {
    if (confirm('Restart the story? IF.methods is a beta feature.')) {
      IF.methods.loadStory(IF.story)
    }
  },

  generateStatsHtml: function () {
    // Should generate html for stats section of the sidebar.
  },

  setStats: function (html) {
    stats_div.innerHTML = html
  },

  showStatsDiv: function () {
    const stats_div = document.querySelector(IF.dom.stats_div_class)
    stats_div.style.display = 'block'
    stats_div.style.width = '100%'

    IF.methods.sidebarListeners('set')
  },

  sidebarListeners: function (setting) {
    if (setting === 'set') {
      document.querySelector(`${IF.dom.stats_div_id} .closebtn`).onclick = IF.methods.hideStatsDiv
      document.querySelector(IF.dom.undo_button_id).onclick = IF.methods.undoTurn
      document.querySelector(IF.dom.reset_button_id).onclick = IF.methods.resetStory
    } else if (setting === 'unset') {
      document.querySelector(`${IF.dom.stats_div_class} .closebtn`).onclick = ''
      document.querySelector(IF.dom.undo_button_id).onclick = ''
      document.querySelector(IF.dom.reset_button_id).onclick = ''
    }
  },

  hideStatsDiv: function () {
    const stats_div = document.querySelector(IF.dom.stats_div_class)
    stats_div.style.display = 'none'
    stats_div.style.width = '0'

    IF.methods.sidebarListeners('unset')
  },

  replaceHash: function (str, to) {
    return str.replace('#', to ?? '')
  },

  replaceDot: function (str, to) {
    return str.replace('.', to ?? '')
  },

  generateDisplay: function () {
    console.info('Generating dislay...')
    const $main = document.querySelector(IF.dom.target_id)

    $main.innerHTML = `
        <div id="${IF.methods.replaceHash(IF.dom.stats_div_id)}" class="${IF.methods.replaceDot(IF.dom.stats_div_class)}">
            <a href="javascript:void(0)" class="closebtn">&times;</a>
            <a href="#" id="${IF.methods.replaceHash(IF.dom.reset_button_id)}">Restart</a>
            <a href="#" id="${IF.methods.replaceHash(IF.dom.undo_button_id)}">Undo</a>
            ${'<a href="#" id="">Stats</a>' /* does nothing */}
            <audio controls id="if_r-audio-player">
                <source src="" type="audio/mp3" id="if_r-audio-source">
                Your browser does not support the audio.
            </audio>
        </div>
        <div id="if_r-status-bar">
        <div id="${IF.methods.replaceHash(IF.dom.alert_area_id)}">
        </div>
        <div id="${IF.methods.replaceHash(IF.dom.burger_id)}">
        <a href="#" id="if_r-burger-icon">&#9776;</a>
        </div>
        </div>
        <div id="${IF.methods.replaceHash(IF.dom.section_display_id)}">
        </div>`

    const burger = document.querySelector(IF.dom.burger_id)

    burger.addEventListener('click', (e) => {
      e.preventDefault()
      IF.methods.showStatsDiv()
    })

    console.info('Display loaded.')
  },

  resetVariables: function () {
    IF.story.variables = {}
    Object.keys(IF.story.persistent)
      .forEach(key => IF.story.variables[key] = IF.story.persistent[key])
  },

  addMethods: function () {
    IF.story.findSection = function (serial) {
      let index = IF.story.sections.findIndex(section => {
        // if (IF.DEBUG) console.log(section);
        return section.serial === serial
      })

      if (index == -1) {
        if (IF.DEBUG) console.warn('No section ' + serial + ' found. Reverting to default section serial 1.')
        index = 0
      }
      return IF.story.sections[index]
    }

    IF.story.findPassage = function (serial) {
      let index = IF.story.passages.findIndex(passage => {
        return passage.serial === serial
      })

      if (index === -1) {
        if (IF.DEBUG) console.warn('No passage ' + serial + ' found. Reverting to default passage serial 1.')
        index = 0
      }

      return IF.story.passages[index]
    }

    IF.story.sections = IF.story.sections.map(section => {
      section.findChoice = function (serial) {
        let index = this.choices.findIndex(choice => {
          return choice.choiceI == serial
        })

        if (index === -1) {
          index = 0
        }

        return this.choices[index]
      }

      return section
    })

    IF.story.findScene = function (serial, name) {
      let index = IF.story.scenes.findIndex(scene => {
        return scene.serial === serial
      })

      if (index === -1) {
        if (IF.DEBUG) console.warn('No scene ' + serial + ' found. Reverting to default scene 1.')
        index = 0
      }

      return IF.story.scenes[index]
    }
  },

  loadStory: function (story) {
    console.info('Story loading...')
    IF.methods.generateDisplay()

    IF.methods.addMethods()

    IF.story = story

    /* Bring variables to original values. */
    IF.methods.resetVariables()

    /* Set timer, if any. */
    const {
      timer,
      target
    } = IF.story.settings.fullTimer
    if (timer !== 0) IF.methods.setTimer(timer, target)

    /* Set initial state and initial variables */
    IF.methods.setState({
      section: IF.story.settings.startAt,
      turn: 0
    })
    IF.story.variables.turn = 0

    /* Load the section into the viewport */
    IF.methods.loadSection(null, IF.story.settings.startAt)

    /* Start the stats bar */
    IF.methods.showStats()

    /* Hide the undo button because the story's just
         * started and no turns have been played.
         */
    document.querySelector(IF.dom.undo_button_id).style.display = 'none'

    /* Clear the console to make things clearer */
    if (!IF.DEBUG) console.clear()

    /* Good luck! */
    console.info('Load finished. Happy playing!')
  }
}

export default IF
