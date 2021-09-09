import IFScript from 'if-script-core/src/IFScript.mjs'
import { clickEvent, down, helpHtml, statsInstructions, tracking } from './globals'
import w3CodeColor from '../../lib/w3Highlighter'
import logo from '../../assets/images/if-logo-nobg.png'
import instructions from 'if-script-core/test/examples/introduction.js'
import '../css/index.css'

const IF = new IFScript(IFScript.versions().STREAM)
const parseText = IF.parser.parseText
const interpreter = new IF.interpreter()

const $ = document.querySelector.bind(document)
const $All = document.querySelectorAll.bind(document)
const root = $('#root')

console.log('Serving on: ' + __webpack_public_path__)

const localStorageKeys = {
  storyText: 'if_r-story-text',
  statsText: 'if_r-story-stats',
  schemePreference: 'if_r-scheme-preference',
  modePreference: 'if_r-mode-preference',
  viewPreference: 'if_r-view-preference',
  objectStorage: 'if_r-if-object',
  editorPreference: 'if_r-editor-preference',
  outputPreference: 'if_r-output-preference'
}

const refs = {
  darkScheme: 'dark',
  lightScheme: 'light'
}

/// ////////////////////////////////
//                               //
//       HELPER FUNCTIONS        //
//                               //
/// ////////////////////////////////

function fetchFile (addr, site) {
  fetch(addr)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.blob()
    })
    .then((blob) => {
      IF[site] = window.URL.createObjectURL(blob)
    })
    .catch((err) => console.log('Some fetch error occured.'))
}

function lread (key = localStorageKeys.storyText) {
  return localStorage.getItem(key)
}

function lwrite (key = localStorageKeys.storyText, value = instructions) {
  return localStorage.setItem(key, value)
}

function showAlert (text) {
  const alertArea = $('#alerts-area')
  alertArea.style.display = 'block'
  alertArea.innerHTML = text
}

function insertAtCursor (field, value) {
  // For textarea editor
  if (document.selection) {
    field.focus()
    let sel = document.selection.createRange()
    sel.text = value
  } else if (field.selectionStart || field.selectionStart == '0') {
    const startPos = field.selectionStart
    const endPos = field.selectionEnd
    field.value =
      field.value.substring(0, startPos) +
      value +
      field.value.substring(endPos, field.value.length)
    field.selectionStart = startPos + value.length
    field.selectionEnd = startPos + value.length
  } else {
    field.value += value
  }
}

function insertTextAtCaret (text) {
  // For editable content elements
  let sel, range
  if (window.getSelection) {
    sel = window.getSelection()
    if (sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
    }
  } else if (document.selection && document.selection.createRange) {
    document.selection.createRange().text = text
  }
}

function formatDoc (cmd, value) {
  // For editable content elements
  if ($('#if_r-input-area').style.display !== 'none') {
    document.execCommand(cmd, false, value)
    $('#if_r-input-area').focus()
  }
}

function showModal (html, attrs, styles, ...nodes) {
  // todo: implement unclosabillity
  const modal = $('#modal')
  modal.style.display = 'block'

  const content = $('.modal-content')
  content.innerHTML = `<span class="modal-close">&times;</span><br>${
    html ?? ''
  }`

  if (nodes) {
    nodes.forEach((el) => content.appendChild(el))
  }

  Object.keys(styles).forEach((sty) => (content.style[sty] = styles[sty]))

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none'
    }
  }

  $('.modal-close').onclick = function () {
    modal.style.display = 'none'
  }
}

function closeModal (node) {
  if (node) return (node.style.display = 'none')
  $('#modal').style.display = 'none'
}

function useMode (mode) {
  const modePref = localStorageKeys.modePreference

  if (mode === 'compact') {
    $('.topnav').style.height = '0'
    $('.main-div').style.height = '100vh'
    $('#output-div').style.height = '100vh'
    $('#editor-div').style.height = '100vh'

    const aux = $('#auxbtn')
    aux.style.display = 'block'
    aux.onclick = function () {
      useMode('regular')
      aux.onclick = ''
      aux.style.display = 'none'
    }

    lwrite(modePref, 'compact')
  } else if (mode === 'regular') {
    $('.topnav').style.height = '10vh'
    $('.main-div').style.height = '90vh'
    $('#output-div').style.height = '90vh'
    $('#editor-div').style.height = '90vh'

    lwrite(modePref, 'regular')
  }
}

function useScheme (type) {
  const editor = $('#if_r-input-area')
  const statsEditor = $('#if_r-stats-editor')
  const top = $('.topnav')
  const tabs = $All('.tab')
  const tBtn = $All('.tab button')
  const tabCon2 = $('#output-div')

  if (type === refs.darkScheme) {
    editor.style.background = 'rgb(50, 50, 50)'
    editor.style.color = 'white'

    statsEditor.style.background = 'rgb(50, 50, 50)'
    statsEditor.style.color = 'white'

    top.style.background = 'rgb(50, 50, 50)'
    top.style.color = 'black'

    tabs.forEach((el) => (el.style.background = 'rgb(50, 50, 50)'))
    tBtn.forEach((el) => (el.style.color = 'whitesmoke'))

    tBtnHover.forEach((el) => (el.style.color = 'red'))

    tabCon2.style.background = 'rgb(50, 50, 50)'

    // tBtnHov.style.color = "black";

    lwrite(localStorageKeys.schemePreference, refs.darkScheme)
  } else if (type === refs.lightScheme) {
    editor.style.background = 'whitesmoke'
    editor.style.color = 'rgb(40, 40, 40)'

    statsEditor.style.background = 'whitesmoke'
    statsEditor.style.color = 'rgb(40, 40, 40)'

    top.style.background = 'whitesmoke'
    // top.style.color = "black";

    tabs.forEach((el) => (el.style.background = 'whitesmoke'))
    tBtn.forEach((el) => (el.style.color = 'black'))

    tabCon2.style.background = 'rgba(102, 102, 102, 0)'

    lwrite(localStorageKeys.schemePreference, refs.lightScheme)
  }
}

function useView (view) {
  const $outputDiv = $('#output-div')
  const $editorDiv = $('#editor-div')
  const viewPref = localStorageKeys.viewPreference

  if (!view) console.warn('The view argument is required!')

  if (view === 'read') {
    $editorDiv.style.width = '0'
    $outputDiv.style.width = '100%'

    lwrite(viewPref, 'read')
  } else if (view === 'write') {
    $outputDiv.style.width = '0'
    $editorDiv.style.width = '100%'

    lwrite(viewPref, 'write')
  } else if (view === 'balanced') {
    $outputDiv.style.width = '50%'
    $editorDiv.style.width = '50%'

    lwrite(viewPref, 'balanced')
  }
}

function isLeftClick (event) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return false
  } else if ('buttons' in event) {
    return event.buttons === 1
  } else if ('which' in event) {
    return event.which === 1
  } else {
    return event.button === 1 || event.type === 'click'
  }
}

function handleSymlink (e) {
  if (e.ctrlKey) {
    const target = e.target.getAttribute('data-target-button')
    if (IF.DEBUG) {
      console.log(target)
    }
    if ($(target)) {
      $(target).click()
    }
  }
}

/// ////////////////////////////////
//                               //
//        CREATE ELEMENT         //
//                               //
/// ////////////////////////////////

/**
 * Creates DOM nodes based on passed parameters.
 *
 * @param {string} name Name of the element
 * @param {object} attrs Attributes passed as an object
 * @param {object} styles CSS styles passed as an object
 * @param {object} listeners Other properties like "onclick"
 * and "innerHTML" of the element
 * @param {array} children Child nodes of the element
 * @returns {Node} element
 */
function createElement (name, attrs, styles, listeners, children) {
  const ele = document.createElement(name)
  if (attrs) {
    Object.keys(attrs).forEach((attr) => {
      ele.setAttribute(attr, attrs[attr])
    })
  }
  if (styles) {
    Object.keys(styles).forEach((sty) => {
      ele.style[sty] = styles[sty]
    })
  }
  if (children) {
    children.forEach((child) => ele.appendChild(child))
  }
  if (listeners) {
    Object.keys(listeners).forEach((lsnr) => (ele[lsnr] = listeners[lsnr]))
  }
  return ele
}

/* Auxilliary Button */
const auxBtn = createElement(
  'button',
  {
    id: 'auxbtn',
    class: 'navbtn',
    title: 'Show menubar'
  },
  null,
  {
    innerHTML: '&#x2630;'
  }
)

/* Modal */
/// ////////////////////////////////
//                               //
//             MODAL             //
//                               //
/// ////////////////////////////////
const modal = createElement(
  'div',
  {
    id: 'modal',
    class: 'modal'
  },
  null,
  null,
  [
    createElement('div', { class: 'modal-content' }, null, {
      innerHTML: '<span class="modal-close">&times;</span>'
    })
  ]
)

/* Topnav */
/// ////////////////////////////////
//                               //
//            TOPNAV             //
//                               //
/// ////////////////////////////////
const storyBtn = createElement(
  'a',
  {
    class: 'download-btn tooltip navbtn',
    download: 'story.js'
  },
  null,
  {
    onclick: function () {
      if (!interpreter.run.story || Object.keys(interpreter.run.story).length <= 0) {
        return showAlert('Parse a story at least once.')
      }
      const data = new Blob([`const IF = ${JSON.stringify(interpreter.run.story)}`], {
        type: 'text/javascript'
      })
      storyBtn.setAttribute('href', window.URL.createObjectURL(data))
    },
    innerHTML: `Download story
    <span class="tooltiptext">Download the story file for embedding</span>`
  }
)

const storyTextBtn = createElement(
  'a',
  {
    class: 'download-btn tooltip navbtn',
    download: 'story.txt'
  },
  null,
  {
    onclick: function () {
      const data = new Blob([$('#if_r-input-area').innerText], {
        type: 'text/plain'
      })
      storyTextBtn.setAttribute('href', window.URL.createObjectURL(data))
    },
    innerHTML: `Download story text
    <span class="tooltiptext">Download the text of the story</span>`
  }
)

const parseBtn = createElement(
  'a',
  {
    id: 'submit-btn',
    class: 'tooltip navbtn',
    title: 'Run'
  },
  null,
  {
    onclick: runSubmit,
    innerHTML: '&#9654; Run <span class="tooltiptext">Play the story</span>'
  }
)

const previewBtn = createElement(
  'a',
  {
    id: 'preview-btn',
    class: 'download-btn tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      if (Object.keys(interpreter.run.story).length <= 0)
        return showAlert('You haven\'t run a story yet.')
      else {
        window.open('preview')
      }
    },
    innerHTML: '&#128065 <span class="tooltiptext">Preview</span>'
  }
)

/// /////// SETTINGS //////////
const darkBtn = createElement(
  'button',
  {
    id: 'darkbtn',
    class: 'setting'
  },
  { background: 'rgb(50, 50, 50)', color: 'white' },
  {
    onclick: function (e) {
      useScheme(refs.darkScheme)
      e.target.style.display = 'none'
      $('#lightbtn').style.display = 'block'
    },
    innerHTML: 'Dark Mode'
  }
)

const lightBtn = createElement(
  'button',
  {
    id: 'lightbtn',
    class: 'setting'
  },
  null,
  {
    onclick: function (e) {
      useScheme(refs.lightScheme)
      e.target.style.display = 'none'
      $('#darkbtn').style.display = 'block'
    },
    innerHTML: 'Light Mode'
  }
)

const settingsBtn = createElement(
  'a',
  {
    id: 'settings-btn',
    class: 'tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      const scheme = lread(localStorageKeys.schemePreference)
      showModal(
        null,
        null,
        { 'font-family': 'monospace' },
        createElement('div', null, null, { innerHTML: '<h2> Settings </h2>' }),
        createElement('h3', null, null, { innerHTML: 'Scheme Preference' }),
        lightBtn,
        darkBtn,
        createElement('h3', null, null, {
          innerHTML: 'Editor Alignment (Stub)'
        }),
        createElement('h3', null, null, { innerHTML: 'Font Size (Stub)' }),
        createElement('h3', null, null, { innerHTML: 'Font (Stub)' })
      )
    },
    innerHTML: '&#9881;<span class="tooltiptext">Setings</span>'
  }
)

/// /////// SETTINGS END //////////

const readBtn = createElement(
  'a',
  {
    id: 'read-btn',
    class: 'right-align-top content-opts tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      useView('read')
    },
    innerHTML: '&leftarrow;<span class="tooltiptext">Read View</span>'
  }
)

const writeBtn = createElement(
  'a',
  {
    id: 'write-btn',
    class: 'right-align-top content-opts tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      useView('write')
    },
    innerHTML: '&rightarrow;<span class="tooltiptext">Write View</span>'
  }
)

const balanceBtn = createElement(
  'a',
  {
    id: 'balance-btn',
    class: 'right-align-top content-opts tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      useView('balanced')
    },
    innerHTML: '&#8646;<span class="tooltiptext">Balanced View</span>'
  }
)

const upBtn = createElement(
  'a',
  {
    id: 'upbtn',
    class: 'right-align-top content-opts tooltip navbtn'
  },
  null,
  {
    onclick: function () {
      useMode('compact')
    },
    innerHTML: `<span style="font-size: large;">&times;</span>
    <span class="tooltiptext">Close Menubar</span>`
  }
)

const logoBtn = createElement(
  'a',
  {
    id: 'logo',
    class: 'topnav-btn',
    href: __webpack_public_path__ || '/',
    title: 'IF-Script logo; Reload this page'
  },
  null,
  null,
  [
    (function () {
      let img =
        createElement('img', { src: logo, id: 'logo-img' }, { height: '50px', width: '50px' })
      img.src = logo
      return img
    })()
  ]
)

const topnav = createElement(
  'div',
  {
    class: 'topnav'
  },
  null,
  null,
  [
    parseBtn,
    previewBtn,
    storyBtn,
    storyTextBtn,
    settingsBtn,
    readBtn,
    writeBtn,
    balanceBtn,
    upBtn,
    logoBtn
  ]
)

/// ////////////////////////////////
//                               //
//         EDITOR - DIV          //
//                               //
/// ////////////////////////////////
/* div1 */
const editor = createElement('textarea', {
  id: 'if_r-input-area',
  class: 'editor',
  contenteditable: 'true',
  spellcheck: 'false'
})

const statsEditor = createElement('textarea', {
  id: 'if_r-stats-editor',
  class: 'editor'
})

function openCity1 (evt, target) {
  let i, tabcontent, tablinks
  tabcontent = document.getElementsByClassName('tabcontent1')
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none'
  }
  tablinks = document.getElementsByClassName('tablinks1')
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '')
  }
  $(target).style.display = 'block'
  evt.currentTarget.className += ' active'

  lwrite(
    localStorageKeys.editorPreference,
    '#' + evt.currentTarget.getAttribute('id')
  )
}

/// ////////////////////////////////
//                               //
//         TABLINKS - 1          //
//                               //
/// ////////////////////////////////
/* Tab links */
const storyEd = createElement(
  'button',
  {
    class: 'tablinks1 active',
    id: 'story-tablink',
    title: 'Story Editor'
  },
  null,
  {
    onclick: (e) => openCity1(e, '#Story'),
    innerHTML: 'Story'
  }
)

const statEd = createElement(
  'button',
  {
    class: 'tablinks1',
    id: 'stats-tablink',
    title: 'Stats Editor'
  },
  null,
  {
    onclick: (e) => openCity1(e, '#Stats'),
    innerHTML: 'Stats'
  }
)

/// ////////////////////////////////
//                               //
//            TABS - 1           //
//                               //
/// ////////////////////////////////
/* Tabs drawer */
const tabs1 = createElement(
  'div',
  {
    class: 'tab'
  },
  null,
  null,
  [storyEd, statEd]
)

/// ////////////////////////////////
//                               //
//       TAB - CONTENT - 1       //
//                               //
/// ////////////////////////////////
/* Tab content */
const storcon = createElement(
  'div',
  {
    id: 'Story',
    class: 'tabcontent1'
  },
  null,
  null,
  [editor]
)

const statcon = createElement(
  'div',
  {
    id: 'Stats',
    class: 'tabcontent1'
  },
  null,
  null,
  [statsEditor]
)

/// ////////////////////////////////
//                               //
//         OUTPUT - DIV          //
//                               //
/// ////////////////////////////////
/* div2 */
function openCity2 (evt, target) {
  let i, tabcontent, tablinks
  tabcontent = document.getElementsByClassName('tabcontent2')
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = 'none'
  }
  tablinks = document.getElementsByClassName('tablinks2')
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '')
  }

  $(target).style.display = 'block'
  evt.currentTarget.className += ' active'

  lwrite(
    localStorageKeys.outputPreference,
    '#' + evt.currentTarget.getAttribute('id')
  )
}

const output = createElement(
  'div',
  {
    id: 'if_r-output-area'
  },
  {
    display: 'none'
  }
)

/// ////////////////////////////////
//                               //
//         TABLINKS - 2          //
//                               //
/// ////////////////////////////////
/* Tab links */
const help = createElement(
  'button',
  {
    class: 'tablinks2',
    id: 'help-tablink',
    title: 'Documentation for IF-Script'
  },
  null,
  {
    onclick: (e) => openCity2(e, '#Help'),
    innerHTML: 'Help'
  }
)

const tools = createElement(
  'button',
  {
    class: 'tablinks2',
    id: 'tools-tablink',
    title: 'Tools for editing the story'
  },
  null,
  {
    onclick: (e) => openCity2(e, '#Tools'),
    innerHTML: 'Tools'
  }
)

const outputDiv = createElement(
  'button',
  {
    class: 'tablinks2',
    id: 'output-tablink',
    title: 'Preview your story'
  },
  null,
  {
    onclick: (e) => openCity2(e, '#Output'),
    innerHTML: 'Output'
  }
)

/// ////////////////////////////////
//                               //
//           TABS - 2            //
//                               //
/// ////////////////////////////////
/* Tabs drawer */
const tabs2 = createElement(
  'div',
  {
    class: 'tab'
  },
  null,
  null,
  [help, tools, outputDiv]
)

/// ////////////////////////////////
//                               //
//      TAB - CONTENT - 2        //
//                               //
/// ////////////////////////////////
/* Tab content */

const helpcon = createElement(
  'div',
  {
    id: 'Help',
    class: 'tabcontent2'
  },
  null,
  {
    innerHTML: helpHtml
  }
)

/// ////////// TOOLS ///////////////

const insertSectionBtn = createElement(
  'button',
  {
    class: 'tool-btn'
  },
  null,
  {
    innerHTML: 'Add Section',
    onclick: function (event) {
      const sectionText = `
section__
  "Ah, ha! A new section."
    choice__
      @target 2
      "The first path"
    __choice
    choice__
      @target 3
      "The next path"
    __choice
__section`
      insertAtCursor($('#if_r-input-area'), sectionText)
      // formatDoc('bold');
    }
  }
)

const insertSceneBtn = createElement(
  'button',
  {
    class: 'tool-btn'
  },
  null,
  {
    innerHTML: 'Add Scene',
    onclick: function (event) {
      const sceneText = `
scene__
  @first 1
  @music "https://google.com"
  @sections 1 2 3
  @name "The climax"
__scene`
      insertAtCursor($('#if_r-input-area'), sceneText)
    }
  }
)

const insertChoiceBtn = createElement(
  'button',
  {
    class: 'tool-btn'
  },
  null,
  {
    innerHTML: 'Add Choice',
    onclick: function (event) {
      const choiceText = `
  choice__
    @input heroName
    @target 5
    Type in your name here
  __choice`
      insertAtCursor($('#if_r-input-area'), choiceText)
    }
  }
)

const insertCommentBtn = createElement(
  'button',
  {
    class: 'tool-btn'
  },
  null,
  {
    innerHTML: 'Add Comment',
    onclick: function (event) {
      const commentText = `
/* A
multi-line
comment */`
      insertAtCursor($('#if_r-input-area'), commentText)
    }
  }
)

const toolcon = createElement(
  'div',
  {
    id: 'Tools',
    class: 'tabcontent2'
  },
  null,
  null,
  [insertSectionBtn, insertSceneBtn, insertChoiceBtn, insertCommentBtn]
)

/// //////// TOOLS END /////////////

const instructDiv = createElement(
  'div',
  {
    id: 'instructDiv'
  },
  {
    margin: 'auto',
    'text-align': 'center'
  },
  {
    innerHTML: '<p class=\'plain-text\'>Click Run to start playing!</p>'
  }
)

const outcon = createElement(
  'div',
  {
    id: 'Output',
    class: 'tabcontent2'
  },
  null,
  null,
  [instructDiv, output]
)

/// ////////////////////////////////
//                               //
//          MAIN - DIVs          //
//                               //
/// ////////////////////////////////
/* Main divs */
const div1 = createElement(
  'div',
  {
    class: 'main-div',
    id: 'editor-div'
  },
  {
    left: '0'
  },
  null,
  [tabs1, storcon, statcon]
)
const div2 = createElement(
  'div',
  {
    class: 'main-div',
    id: 'output-div'
  },
  {
    right: '0'
  },
  null,
  [tabs2, helpcon, toolcon, outcon]
)

const mainDiv = createElement(
  'div',
  {
    id: 'main'
  },
  null,
  null,
  [div1, div2]
)

/// ////////////////////////////////
//                               //
//        APPEND TO ROOT         //
//                               //
/// ////////////////////////////////
/* Append to root */
root.appendChild(modal)
root.appendChild(auxBtn)
root.appendChild(topnav)
root.appendChild(mainDiv)

/// ////////////////////////////////
//                               //
//    GETTING READY, FINALLY!    //
//                               //
/// ////////////////////////////////
/* Getting ready... */

/* Tab preferences */
$(lread(localStorageKeys.outputPreference) || '#help-tablink').dispatchEvent(
  clickEvent
)
$(lread(localStorageKeys.editorPreference) || '#story-tablink').dispatchEvent(
  clickEvent
)

/* For textarea-style editors */
$('#if_r-input-area').value = lread(localStorageKeys.storyText) || instructions
$('#if_r-stats-editor').value =
  lread(localStorageKeys.statsText) || statsInstructions
$All('.highlighted').forEach((ele) => w3CodeColor(ele))

/* Colour scheme preferences */
if (lread(localStorageKeys.schemePreference)) {
  useScheme(lread(localStorageKeys.schemePreference))
} else {
  useScheme(refs.lightScheme)
}
/* Menubar preferences */
if (lread(localStorageKeys.modePreference)) {
  useMode(lread(localStorageKeys.modePreference))
}
/* Read/Write View Preferences */
if (lread(localStorageKeys.viewPreference)) {
  useView(lread(localStorageKeys.viewPreference))
}

/* Ctrl + S Save implementation */
window.onkeydown = function (e) {
  if (!down.includes(e.key)) down.push(e.key)
  if (e.ctrlKey && !down.includes(tracking[0]['1'])) down.push('Control')

  if (down.length === 2 && down.includes(tracking[0]['0']) && e.ctrlKey) {
    e.preventDefault()
    saveStory($('#if_r-input-area').value)
    saveStats($('#if_r-stats-editor').value)
    document.title = 'Saved all edits'
    setTimeout(() => {
      document.title = story_title ?? 'IF'
    }, 1500)
  }
}

window.onkeyup = function (e) {
  let idx
  if (e.ctrlKey) {
    idx = down.findIndex((val) => val === 'Control')
  } else {
    idx = down.findIndex((val) => val === e.key)
  }
  down.splice(idx, 1)
}

$All('.symlink').forEach((el) => el.addEventListener('click', handleSymlink))

/// ////////////////////////////////
//                               //
//    AUTOSAVE IMPLEMENTATION    //
//                               //
/// ////////////////////////////////
/* Autosave implementation */
let editor_timeout, stats_timeout

function saveStory (text) {
  const story_title = interpreter.run.story.name ? interpreter.run.state.name : null
  lwrite(localStorageKeys.storyText, text)
  document.title = 'Story Saved.'
  setTimeout(() => {
    document.title = story_title ?? 'IF'
  }, 1500)
}

function saveStats (text) {
  const story_title = interpreter.run.story.name ? interpreter.run.story.name : null
  lwrite(localStorageKeys.statsText, text)
  document.title = 'Stats Saved.'
  setTimeout(() => {
    document.title = story_title ?? 'IF'
  }, 1500)
}

$('#if_r-input-area').addEventListener('keyup', function (e) {
  if (editor_timeout) clearTimeout(editor_timeout)

  editor_timeout = setTimeout(function () {
    saveStory(e.target.value)
  }, 750)
})

$('#if_r-stats-editor').addEventListener('keyup', function (e) {
  if (stats_timeout) clearTimeout(stats_timeout)

  editor_timeout = setTimeout(function () {
    saveStats(e.target.value)
  }, 750)
})

/// ////////////////////////////////
//                               //
//            PARSING            //
//                               //
/// ////////////////////////////////
/* Parsing */
function runSubmit () {
  const storyValue = $('#if_r-input-area').value
  const statsValue = $('#if_r-stats-editor').value

  $('#instructDiv').style.display = 'none'
  $('#if_r-output-area').style.display = 'flex'

  $('#output-tablink').dispatchEvent(clickEvent)

  lwrite(localStorageKeys.storyText, storyValue)
  lwrite(localStorageKeys.statsText, statsValue)

  const story = parseText(storyValue)

  lwrite(localStorageKeys.objectStorage, JSON.stringify(story))

  interpreter.loadStory(story, null, 'default')
}
