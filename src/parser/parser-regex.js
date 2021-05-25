// import { passage } from './passage.grammar.js';
// import { section } from './section.grammar.js';

/**
 * @author Mihir Jichkar
 * @description Each story is composed of Sections and Passages
 * @class Story
 */
class Story {
  /**
     * Creates an instance of Story.
     * @param {string} name Name of the Story
     * @param {[Section]} sections Array of Section Objects
     * @param {[Passage]} passages Array of Passage Objects
     * @param {object} settings Settings object
     * @memberof Story
     */
  constructor (name, { sections, passages }, { referrable, startAt, fullTimer }, { globals, stats }) {
    this.name = name.trim()
    this.sections = sections
    this.passages = passages
    this.settings = {}
    this.settings.referrable = referrable
    this.settings.startAt = startAt
    this.settings.fullTimer = fullTimer
    this.variables = {}
    if (globals) {
      Object.keys(globals).forEach(global => {
        this.variables[global] = globals[global]
      })
    }
    this.stats = stats
  }

  findSection (serial) {
    let index = this.sections.findIndex(section => {
      return section.serial === serial
    })

    if (index == -1) {
      console.warn('No section ' + serial + ' found. Reverting to default section serial 1.')
      index = 0
    }
    return this.sections[index]
  }

  findPassage (serial) {
    let index = this.passages.findIndex(passage => {
      return passage.serial === serial
    })

    if (index === -1) {
      console.warn('No passage ' + serial + ' found. Reverting to default passage serial 1.')
      index = 0
    }

    return this.passages[index]
  }

  get type () {
    return 'Story'
  }
}

/**
 * @author Mihir Jichkar
 * @description Each section has choices and text.
 * @class Section
 */
class Section {
  /**
     * Creates an instance of Section.
     * @param {string} title Title of the Section
     * @param {string} text HTML formatted text content of the Section
     * @param {array} choices Array of Choice Objects
     * @memberof Section
     */
  constructor (title, text, choices, serial, { timer }) {
    this.title = title.trim()
    this.text = text.trim()
    this.choices = choices
    this.serial = serial
    this.settings = {}
    this.settings.timer = timer
  }

  get type () {
    return 'Section'
  }
}

/**
 * @author Mihir Jichkar
 * @description A Choice has an owner where the choice resides and a target where it points.
 * @class Choice
 */
class Choice {
  /**
    * Creates an instance of Choice.
    * @param {Section} owner Section.serial where this Choice resides
    * @param {Section} target Section.serial to which this choice points
    * @param {String} text Human-readable description of the Choice
    * @memberof Choice
    */
  constructor (owner, target, text, variables, mode, choiceI) {
    this.mode = mode
    this.text = text.trim()
    this.owner = owner
    this.target = target
    this.variables = variables
    this.choiceI == choiceI
  }

  get type () {
    return 'Choice'
  }
}

/**
 * @author Mihir Jichkar
 * @description A Passage is a Section without Choices
 * @class Passage
 * @extends {Section}
 */
class Passage extends Section {
  /**
    * Creates an instance of Passage.
    * @param {string} title Title of the Passage
    * @param {string} text HTML formatted text content of the Passage
    * @memberof Passage
    */
  constructor (title, text) {
    super(title, text, [], serial)
  }

  get type () {
    return 'Passage'
  }
}

/* Grammar */
const grammar = {
  section: /ss>[a-zA-Z0-9"'-_:;\/\s!\*#\$\{\}]+?<ss/g,
  comment: /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, // /\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/ /\/\*(\*(?!\/)|[^*])*\*\//g
  passage: /pp>[a-zA-Z0-9"'-_:,\/\s!\*#;]+?<pp/g,
  title: /tt>[A-Za-z0-9 '\$\{\}]+?<tt/g,
  para: />>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<</g, // One paragraph of text.
  choice: /ch>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<ch/g, // One choice.
  choiceTarget: /\[\[[0-9]+\]\]/g,
  settings: /settings>[a-zA-Z0-9"'-_:;\/\s!\*#\.\$\{\}]+?<settings/,
  referrable: /@referrable (true)|(false)/,
  startAt: /@startAt [0-9]+/,
  fullTimer: /@fullTimer [0-9]+ \[\[\d+\]\]/,
  sectionSettings: /secset>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<secset/,
  variable: /\$\{[a-zA-Z0-9=]+?\}/g,
  input: /__input/,
  secTimer: /@timer [0-9]+ \[\[\d+\]\]/,
  variableAssignment: /\$\{[a-zA-Z0-9]+?=[a-zA-Z0-9_ ]+?\}/g,
  varValue: /[a-zA-Z0-9_ ]+/,
  setVarAsTarget: /\$\{__[a-zA-Z0-9_=]+?\}/g,
  html: /<\s*\w+[^>]*>(.*?)(<\s*\/\s*\w+>)|/g
}

const variableRegex = grammar.variable

/* Regexs */

/**
 * Parses raw text (in IF syntax) into a Story instance.
 *
 * @param {string} text whole text of story
 * @returns {Story} a Story object
 */
function parseText (text) {
  text = text.replace(grammar.comment, '').replace(/>>/g, '').replace(/<</g, '')

  let settings = text.match(grammar.settings)
  settings = settings ? settings[0] : ''
  const { referrable, startAt, fullTimer, globals } = parseSettings(settings)
  text = text.replace(grammar.settings, '')

  let serial = 0
  const sectioned = (text.match(grammar.section) || [])
    .map(section => {
      serial += 1
      return parseSection(section, serial)
    })
    // if (sectioned === [])
    // throw Error({ "message": "Atleast one section is required.", "code": "1" });

  text = text.replace(grammar.section, '')

  const passaged = (text.match(grammar.passage) || [])
    .map(passage => parsePassage(passage))

  const story = new Story(Date.now().toString(), { sections: sectioned, passages: passaged }, { referrable, startAt, fullTimer }, { globals })

  return story
}

/**
 * Parses a section string into a Section Instance.
 *
 * @param {string} section String of the section that is to be parsed
 * @param {number} serial The serial order of the section to be parsed
 * @returns {Section} Instance of Section
 */
function parseSection (section, serial) {
  section = section.replace(/ss>/gi, '').replace(/<ss/gi, '')

  let secset = section.match(grammar.sectionSettings) || []
  secset = secset.length > 0 ? secset[0] : ''
  const { timer } = parseSecSet(secset, serial)

  let title = section.match(grammar.title) ? section.match(grammar.title)[0] : null || ''

  // if (title === "")
  // throw Error(({ "message": "A title for each section is required!", "code": "3" }));

  title = title.replace(/tt>/, '').replace(/<tt/, '')

  section = section.replace(grammar.title, '')

  let text = '';

  (section.match(grammar.para) || [])
    .forEach(para => {
      para = para.replace(/>>/, '').replace(/<</, '')
      para = `<p>${para}</p>`
      text += para
    })

  let i = 0

  const choices = (section.match(grammar.choice) || [])
    .map(choice => {
      i += 1
      return parseChoice(choice, serial, i)
    })

  return new Section(title, text, choices, serial, { timer })
}

function parseChoice (choice, serial, choiceI) {
  choice = choice.replace(/ch>/, '').replace(/<ch/, '')
  let target = choice.match(grammar.choiceTarget)
  target = target ? target[0] : ''

  // if (target = "")
  // throw Error({ "message": "Choice target invalid or not present.", "code": "4" });

  target = target.replace(/\[\[/, '').replace(/\]\]/, '')
  target = parseInt(target, 10)

  choice = choice.replace(grammar.choiceTarget, '')

  choice = choice.replace(grammar.html, '')

  let mode = 'basic'

  const isInput = choice.match(grammar.input)
  if (isInput) {
    choice = choice.replace(grammar.input, `<input type="text" class="if_r-choice-input" id="if_r-choice-input-${choiceI}"/>`)
    mode = 'input'
  }

  const variables =
    (choice.match(grammar.setVarAsTarget) || [])
      .map(variable => {
        return variable.replace(/\$\{/, '').replace(/\}/, '').replace(/\s/g, '').replace('__', '')
      })

  choice = choice.replace(grammar.setVarAsTarget, '')

  // if (variables.length <= 0)
  // console.warn("No variable targets set, are you sure?");

  return new Choice(serial, target, choice, variables, mode, choiceI)
}

/**
 * Parse text string into settings object
 *
 * @param {string} settingsString
 * @returns object { referrable, startAt }
 */
function parseSettings (string) {
  string = string.replace(/settings>/, '').replace(/<settings/, '')

  let referrable = string.match(grammar.referrable)
  referrable = referrable ? referrable[0].replace(/@referrable /, '') : ''
  referrable = referrable === 'true'
  string = string.replace(grammar.referrable, '').replace(/@referrable/, '')

  let startAt = string.match(grammar.startAt)
  startAt = startAt ? startAt[0].replace(/@startAt /, '') : ''
  startAt = parseInt(startAt) ? parseInt(startAt) : 1
  string = string.replace(grammar.startAt, '')

  let fullTimerString = string.match(grammar.fullTimer)
  fullTimerString = fullTimerString ? fullTimerString[0].replace(/@fullTimer /, '') : '0'

  const fullTimerNumbers = fullTimerString.match(/\d+/g)

  const fullTimer = {}
  if (fullTimerNumbers.length > 1) {
    fullTimer.timer = parseInt(fullTimerNumbers[0]) ? parseInt(fullTimerNumbers[0]) : 0
    fullTimer.target = parseInt(fullTimerNumbers[1]) ? parseInt(fullTimerNumbers[1]) : 1
  } else {
    fullTimer.timer = 0
    fullTimer.target = 1
  }
  string = string.replace(grammar.fullTimer, '')

  const globals = parseGlobals(string)

  return { referrable, startAt, fullTimer, globals }
}

function parseGlobals (string) {
  const globalArray = (string.match(grammar.variableAssignment) || [])
  const varObject = {}

  globalArray.forEach(variable => {
    variable = variable.replace(/\$\{/, '').replace(/\}/, '').trim()

    let var_name = variable.match(/[A-Za-z0-9]+/) || []
    if (var_name.length > 0) {
      var_name = var_name[0]
      variable = variable.replace(/\w+=/, '')
    } else {
      // throw Error ("Invalid variable object!");
      console.warn('Invalid variable ${}!')
      return {}
    }

    let var_value = variable.match(grammar.varValue) || []
    var_value = var_value.length > 0 ? var_value[0] : ''

    if (var_value === '') { console.warn("Variable value was read as ''. Are you sure the value should be empty?") }
    varObject[var_name] = var_value
  })

  return varObject
}

function parseSecSet (secset, serial) {
  let timerString = secset.match(grammar.secTimer)

  timerString = timerString ? timerString[0].replace(/@timer /, '') : '0'

  const timerNumbers = timerString.match(/\d+/g)

  const timer = {}
  if (timerNumbers.length > 1) {
    timer.timer = parseInt(timerNumbers[0]) ? parseInt(timerNumbers[0]) : 0
    timer.target = parseInt(timerNumbers[1]) ? parseInt(timerNumbers[1]) : serial + 1
  } else {
    timer.timer = 0
    timer.target = 1
  }

  secset = secset.replace(grammar.secTimer, '')

  return { timer }
}

export { Story, parseText, variableRegex }
