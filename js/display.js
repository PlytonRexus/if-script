const $ = document.querySelector.bind(document);
const $All = document.querySelectorAll.bind(document);
const root = $("#root");

const localStorageKeys = {
    storyText: "if_r-story-text",
    statsText: "if_r-story-stats",
    schemePreference: "if_r-scheme-preference",
    modePreference: "if_r-mode-preference",
    viewPreference: "if_r-view-preference",
    objectStorage: "if_r-if-object",
    editorPreference: "if_r-editor-preference",
    outputPreference: "if_r-output-preference"
}

import {
    parseText
} from "./parser/if-parser.js";

///////////////////////////////////
//                               //
//       HELPER FUNCTIONS        //
//                               //
///////////////////////////////////

function fetchFile(addr, site) {
    fetch(addr)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            IF[site] = window.URL.createObjectURL(blob);
        })
        .catch(err => console.log("Some fetch error occured."));
}

function lread(key = localStorageKeys.storyText) {
    return localStorage.getItem(key);
}

function lwrite(key = localStorageKeys.storyText, value = instructions) {
    return localStorage.setItem(key, value);
}

function showAlert(text) {
    let alertArea = $("#alerts-area");
    alertArea.style.display = "block";
    alertArea.innerHTML = text;
}

function insertAtCursor(field, value) {
    // For textarea editor
    if (document.selection) {
        field.focus();
        sel = document.selection.createRange();
        sel.text = value;
    } else if (field.selectionStart || field.selectionStart == '0') {
        var startPos = field.selectionStart;
        var endPos = field.selectionEnd;
        field.value = field.value.substring(0, startPos) 
            + value 
            + field.value.substring(endPos, field.value.length);
        field.selectionStart = startPos + value.length;
        field.selectionEnd = startPos + value.length;
    } else {
        field.value += value;
    }
}

function insertTextAtCaret(text) {
    // For editablecontent elements
    var sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode( document.createTextNode(text) );
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
}

function formatDoc(cmd, value) {
    // For editablecontent elements
    if ($("#if_r-input-area").style.display !== "none") {
        document.execCommand(cmd, false, value);
        $("#if_r-input-area").focus();
    }
}

function showModal(html, attrs, styles, ...nodes) {
    // todo: implement unclosabillity
    let modal = $("#modal");
    modal.style.display = "block";

    let content = $(".modal-content");
    content.innerHTML = 
        `<span class="modal-close">&times;</span><br>${html ?? ""}`;
    
    if (nodes) {
        nodes.forEach(el => content.appendChild(el));
    }

    Object.keys(styles).forEach(sty => content.style[sty] = styles[sty]);

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    $(".modal-close").onclick = function() {
        modal.style.display = "none";
    }
}

function closeModal(node) {
    if (node) return node.style.display = "none";
    $("#modal").style.display = "none";
}

function useMode(mode) {
    let modePref = localStorageKeys.modePreference;

    if (mode === "compact") {
        $(".topnav").style.height = "0";
        $(".main-div").style.height = '100vh';
        $("#output-div").style.height = "100vh";
        $("#editor-div").style.height = "100vh";

        let aux = $("#auxbtn");
        aux.style.display = "block";
        aux.onclick = function() {
            useMode('regular');
            aux.onclick = "";
            aux.style.display = "none";
        }

        lwrite(modePref, "compact");
    } else if (mode === "regular") {
        $(".topnav").style.height = "10vh";
        $(".main-div").style.height = '90vh';
        $("#output-div").style.height = "90vh";
        $("#editor-div").style.height = "90vh";

        lwrite(modePref, "regular");
    }
}

function useScheme(type) {
    let editor = $("#if_r-input-area");
    let statsEditor = $("#if_r-stats-editor");
    let top = $(".topnav");
    let tabs = $All(".tab");
    let tBtn = $All(".tab button");
    let tabCon2 = $("#output-div");
    if (type === "dark") {
        editor.style.background = "rgb(50, 50, 50)";
        editor.style.color = "white";

        statsEditor.style.background = "rgb(50, 50, 50)";
        statsEditor.style.color = "white";

        top.style.background = "rgb(50, 50, 50)";
        top.style.color = "black";

        tabs.forEach(el => el.style.background = "rgb(50, 50, 50)");
        tBtn.forEach(el => el.style.color = "whitesmoke");

        tabCon2.style.background = "rgb(50, 50, 50)";

        // tBtnHov.style.color = "black";

        lwrite(localStorageKeys.schemePreference, "dark");
    } else if (type === "light") {
        editor.style.background = "whitesmoke";
        editor.style.color = "rgb(40, 40, 40)";

        statsEditor.style.background = "whitesmoke";
        statsEditor.style.color = "rgb(40, 40, 40)";

        top.style.background = "whitesmoke";
        // top.style.color = "black";

        tabs.forEach(el => el.style.background = "whitesmoke");
        tBtn.forEach(el => el.style.color = "black");

        tabCon2.style.background = "rgba(102, 102, 102, 0)";

        lwrite(localStorageKeys.schemePreference, "light");
    }
}

function useView(view) {
    let $outputDiv = $("#output-div");
    let $editorDiv = $("#editor-div");
    let viewPref = localStorageKeys.viewPreference;

    if (!view) console.warn("The view argument is required!");

    if (view === "read") {
        $editorDiv.style.width = "0";
        $outputDiv.style.width = "100%";

        lwrite(viewPref, "read");
    } else if (view === "write") {
        $outputDiv.style.width = "0";
        $editorDiv.style.width = "100%"

        lwrite(viewPref, "write");
    } else if (view === "balanced") {
        $outputDiv.style.width = "50%";
        $editorDiv.style.width = "50%"

        lwrite(viewPref, "balanced");
    }
}

///////////////////////////////////
//                               //
//        CREATE ELEMENT         //
//                               //
///////////////////////////////////

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
function createElement(name, attrs, styles, listeners, children) {
    let ele = document.createElement(name);
    if (attrs) {
        Object.keys(attrs).forEach(attr => {
            ele.setAttribute(attr, attrs[attr]);
        });
    }
    if (styles) {
        Object.keys(styles).forEach(sty => {
            ele.style[sty] = styles[sty];
        });
    }
    if (children) {
        children.forEach(child => ele.appendChild(child));
    }
    if (listeners) {
        Object.keys(listeners).forEach(lsnr => ele[lsnr] = listeners[lsnr]);
    }
    return ele;
}

/* Auxilliary Button */
let auxBtn = createElement('button', {
    id: "auxbtn",
    class: "navbtn",
    title: "Show menubar"
}, null, {
    innerHTML: "&#x2630;"
});

/* Modal */
///////////////////////////////////
//                               //
//             MODAL             //
//                               //
///////////////////////////////////
let modal = createElement('div', {
    id: "modal", 
    class: "modal"
}, null, null, [
    createElement(
        'div', 
        { class: "modal-content" }, 
        null, { innerHTML: `<span class="modal-close">&times;</span>` }
    )
]);

/* Topnav */
///////////////////////////////////
//                               //
//            TOPNAV             //
//                               //
///////////////////////////////////
let storyBtn = createElement('a', {
    "class": "download-btn tooltip navbtn",
    "download": "story.js"
}, null, {
    onclick: function () {
        if (!IF.story || Object.keys(IF.story).length <= 0)
            return console.log("Parse a story at least once.");
        let data = new Blob(
            [`const IF = ${JSON.stringify(IF)}`], {
                type: 'text/javascript'
            }
        );
        storyBtn.setAttribute('href', window.URL.createObjectURL(data));
    },
    innerHTML: `Download story 
    <span class="tooltiptext">Download the story file for embedding</span>`
});

let storyTextBtn = createElement('a', {
    "class": "download-btn tooltip navbtn",
    "download": "story.txt"
}, null, {
    onclick: function () {
        let data = new Blob(
            [$("#if_r-input-area").innerText], {
                type: 'text/plain'
            }
        );
        storyTextBtn.setAttribute('href', window.URL.createObjectURL(data));
    },
    innerHTML: `Download story text
    <span class="tooltiptext">Download the text of the story</span>`
});

let parseBtn = createElement('a', {
    id: 'submit-btn',
    class: 'tooltip navbtn',
    title: 'Run'
}, null, {
    onclick: runSubmit,
    'innerHTML': '&#9654; Run <span class="tooltiptext">Play the story</span>'
});

let previewBtn = createElement('a', {
    id: 'preview-btn',
    class: 'download-btn tooltip navbtn'
}, null, {
    onclick: function () {
        if (Object.keys(IF.story).length <= 0) return showAlert("You haven't run a story yet.");
        else {
            window.open("preview");
        }
    },
    'innerHTML': '&#128065 <span class="tooltiptext">Preview</span>'
});

////////// SETTINGS //////////
let darkBtn = createElement('button', {
    id: "darkbtn",
    class: 'setting'
}, { background: "rgb(50, 50, 50)", color: "white" }, {
    onclick: function(e) {
        useScheme('dark');
        e.target.style.display = "none";
        $("#lightbtn").style.display = "block";
    },
    innerHTML: "Dark Mode"
});

let lightBtn = createElement('button', {
    id: "lightbtn",
    class: 'setting'
}, null, {
    onclick: function(e) {
        useScheme('light');
        e.target.style.display = "none";
        $("#darkbtn").style.display = "block";
    },
    innerHTML: "Light Mode"
});

let settingsBtn = createElement('a', {
    id: 'settings-btn',
    class: 'tooltip navbtn'
}, null, {
    onclick: function () {
        let scheme = lread(localStorageKeys.schemePreference);
        showModal(
            null, 
            null, { "font-family": "monospace" }, 
            createElement('div', null, null, { innerHTML: "<h2> Settings </h2>"}),
            createElement('h3', null, null, { innerHTML: "Scheme Preference" }),
            lightBtn, darkBtn,
            createElement('h3', null, null, 
            { innerHTML: "Editor Alignment (Stub)" }),
            createElement('h3', null, null, { innerHTML: "Font Size (Stub)" }),
            createElement('h3', null, null, { innerHTML: "Font (Stub)" })
        );
    },
    innerHTML: `&#9881;<span class="tooltiptext">Setings</span>`
});

////////// SETTINGS END //////////

let readBtn = createElement('a', {
    id: 'read-btn',
    class: 'right-align-top content-opts tooltip navbtn'
}, null, {
    onclick: function () {
        useView('read');
    },
    innerHTML: '&leftarrow;<span class="tooltiptext">Read View</span>'
});

let writeBtn = createElement('a', {
    id: 'write-btn',
    class: 'right-align-top content-opts tooltip navbtn'
}, null, {
    onclick: function () {
        useView('write');
    },
    innerHTML: '&rightarrow;<span class="tooltiptext">Write View</span>'
});

let balanceBtn = createElement('a', {
    id: 'balance-btn',
    class: 'right-align-top content-opts tooltip navbtn'
}, null, {
    onclick: function () {
        useView("balanced");
    },
    innerHTML: '&#8646;<span class="tooltiptext">Balanced View</span>'
});

let upBtn = createElement('a', {
    id: 'upbtn',
    class: 'right-align-top content-opts tooltip navbtn'
}, null, {
    onclick: function () {
        useMode('compact');
    },
    innerHTML: `<span style="font-size: large;">&times;</span>
    <span class="tooltiptext">Close Menubar</span>`
});

let logoBtn = createElement('a', {
    id: 'logo',
    class: 'topnav-btn',
    href: "/",
    title: "IF-Script logo; Reload this page"
}, null, {
    innerHTML: '<img src="assets/images/if-logo-nobg.png" width="50px" height="50px" id="logo-img"/>'
});

let topnav = createElement(
    'div', {
        class: 'topnav'
    }, null, null,
    [
        parseBtn, previewBtn, storyBtn, 
        storyTextBtn, settingsBtn, readBtn, 
        writeBtn, balanceBtn, upBtn, logoBtn
    ]
);

///////////////////////////////////
//                               //  
//         EDITOR - DIV          //
//                               //
///////////////////////////////////
/* div1 */
let editor = createElement('textarea', {
    id: 'if_r-input-area',
    class: 'editor',
    contenteditable: 'true',
    spellcheck: "false"
});

let statsEditor = createElement('textarea', {
    id: 'if_r-stats-editor',
    class: 'editor'
});

function openCity1(evt, target) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent1");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks1");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    $(target).style.display = "block";
    evt.currentTarget.className += " active";

    lwrite(localStorageKeys.editorPreference, "#" + evt.currentTarget.getAttribute("id"));
}

///////////////////////////////////
//                               //
//         TABLINKS - 1          //
//                               //
///////////////////////////////////
/* Tab links */
let storyEd = createElement('button', {
    class: 'tablinks1 active',
    id: "story-tablink",
    title: 'Story Editor'
}, null, {
    onclick: e => openCity1(e, "#Story"),
    innerHTML: 'Story'
});

let statEd = createElement('button', {
    class: 'tablinks1',
    id: "stats-tablink",
    title: 'Stats Editor'
}, null, {
    onclick: e => openCity1(e, "#Stats"),
    innerHTML: 'Stats'
});

///////////////////////////////////
//                               //  
//            TABS - 1           //
//                               //
///////////////////////////////////
/* Tabs drawer */
let tabs1 = createElement('div', {
    class: 'tab'
}, null, null, [storyEd, statEd]);

///////////////////////////////////
//                               //  
//       TAB - CONTENT - 1       //
//                               //
///////////////////////////////////
/* Tab content */
let storcon = createElement('div', {
    id: "Story",
    class: "tabcontent1"
}, null, null, [editor]);

let statcon = createElement('div', {
    id: 'Stats',
    class: 'tabcontent1'
}, null, null, [statsEditor]);

///////////////////////////////////
//                               //  
//         OUTPUT - DIV          //
//                               //
///////////////////////////////////
/* div2 */
function openCity2(evt, target) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent2");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks2");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    $(target).style.display = "block";
    evt.currentTarget.className += " active";

    lwrite(localStorageKeys.outputPreference, "#" + evt.currentTarget.getAttribute("id"));
}

let output = createElement('div', {
    id: 'if_r-output-area'
}, {
    display: "none"
});

///////////////////////////////////
//                               //
//         TABLINKS - 2          //
//                               //
///////////////////////////////////
/* Tab links */
let help = createElement('button', {
    class: 'tablinks2',
    id: "help-tablink",
    title: 'Documentation for IF-Script'
}, null, {
    onclick: (e) => openCity2(e, "#Help"),
    innerHTML: 'Help'
});

let tools = createElement('button', {
    class: 'tablinks2',
    id: "tools-tablink",
    title: 'Tools for editing the story'
}, null, {
    onclick: e => openCity2(e, "#Tools"),
    innerHTML: 'Tools'
});

let outputDiv = createElement('button', {
    class: 'tablinks2',
    id: "output-tablink",
    title: 'Preview your story'
}, null, {
    onclick: e => openCity2(e, "#Output"),
    innerHTML: 'Output'
});

///////////////////////////////////
//                               //
//           TABS - 2            //
//                               //
///////////////////////////////////
/* Tabs drawer */
let tabs2 = createElement('div', {
    class: 'tab'
}, null, null, [help, tools, outputDiv]);

///////////////////////////////////
//                               //  
//      TAB - CONTENT - 2        //
//                               //
///////////////////////////////////
/* Tab content */

let helpcon = createElement('div', {
    id: "Help",
    class: "tabcontent2"
}, null, {
    innerHTML: helpHtml
});

///////////// TOOLS ///////////////

let insertSectionBtn = createElement('button', {
    class: 'tool-btn'
}, null, {
    innerHTML: 'Add Section',
    onclick: function (event) {
        let sectionText =
            `
ss>
  secset>
    @timer 10000
    @music link
  <secset

  tt> Untitled Section <tt

  Content

  ch> A choice [[1]] <ch
  ch> Another choice [[2]] <ch
<ss`;
        insertAtCursor($("#if_r-input-area"), sectionText);
        // formatDoc('bold');
    }
});

let insertSceneBtn = createElement('button', {
    class: 'tool-btn'
}, null, {
    innerHTML: 'Add Scene',
    onclick: function (event) {
        let sceneText =
            `
scene>
  @first section_number
  @music link
  @sections space_seperated_section_numbers
  @name custom_name_for_scene
<scene`;
    insertAtCursor($("#if_r-input-area"), sceneText);
    }
});

let insertChoiceBtn = createElement('button', {
    class: 'tool-btn'
}, null, {
    innerHTML: 'Add Choice',
    onclick: function (event) {
        let choiceText =
            `
ch> \${__if name == "" || namePower <= 0} Type in your name here __input \${__name} [[5]] <ch`;
    insertAtCursor($("#if_r-input-area"), choiceText);
    }
});

let insertCommentBtn = createElement('button', {
    class: 'tool-btn'
}, null, {
    innerHTML: 'Add Comment',
    onclick: function (event) {
        let commentText =
            `
/* A
multi-line
comment */`;
    insertAtCursor($("#if_r-input-area"), commentText);
    }
});

let toolcon = createElement('div', {
    id: 'Tools',
    class: 'tabcontent2'
}, null, null, [insertSectionBtn, insertSceneBtn, insertChoiceBtn, insertCommentBtn]);

/////////// TOOLS END /////////////

let instructDiv = createElement('div', {
    id: "instructDiv"
}, {
    margin: 'auto',
    'text-align': 'center'
}, {
    innerHTML: "<p class='plain-text'>Click Run to start playing!</p>"
});

let outcon = createElement('div', {
    id: "Output",
    class: 'tabcontent2'
}, null, null, [instructDiv, output]);

///////////////////////////////////
//                               //  
//          MAIN - DIVs          //
//                               //
///////////////////////////////////
/* Main divs */
let div1 = createElement(
    'div', {
        class: 'main-div',
        id: 'editor-div'
    }, {
        left: '0'
    }, null, [tabs1, storcon, statcon]
);
let div2 = createElement(
    'div', {
        class: 'main-div',
        id: 'output-div'
    }, {
        right: '0'
    }, null, [tabs2, helpcon, toolcon, outcon]
);


let mainDiv = createElement('div', {
    id: 'main'
}, null, null, [div1, div2]);


///////////////////////////////////
//                               //  
//        APPEND TO ROOT         //
//                               //
///////////////////////////////////
/* Append to root */
root.appendChild(modal);
root.appendChild(auxBtn);
root.appendChild(topnav);
root.appendChild(mainDiv);

///////////////////////////////////
//                               //  
//    GETTING READY, FINALLY!    //
//                               //
///////////////////////////////////
/* Getting ready... */

/* Tab preferences */
$(lread(localStorageKeys.outputPreference) || "#help-tablink")
.dispatchEvent(clickEvent);
$(lread(localStorageKeys.editorPreference) || "#story-tablink")
.dispatchEvent(clickEvent);

/* For textarea-style editors */
$("#if_r-input-area").value = lread(localStorageKeys.storyText) || instructions;
$("#if_r-stats-editor").value = lread(localStorageKeys.statsText) || statsInstructions;
$All(".highlighted").forEach(ele => w3CodeColor(ele));

/* Colour scheme preferences */
if (lread(localStorageKeys.schemePreference))
    useScheme(lread(localStorageKeys.schemePreference));
/* Menubar preferences */
if(lread(localStorageKeys.modePreference))
    useMode(lread(localStorageKeys.modePreference));
/* Read/Write View Preferences */
if(lread(localStorageKeys.viewPreference))
    useView(lread(localStorageKeys.viewPreference))

/* Ctrl + S Save implementation */
window.onkeydown = function (e) {
    if (!(down.includes(e.key))) down.push(e.key);
    if (e.ctrlKey && !(down.includes(tracking[0]["1"]))) down.push("Control");

    if ((down.length === 2) &&
        down.includes(tracking[0]["0"]) &&
        e.ctrlKey
    ) {
        e.preventDefault();
        saveStory($("#if_r-input-area").value);
        saveStats($("#if_r-stats-editor").value);
        document.title = "Saved all edits"
        setTimeout(() => {
            document.title = story_title ?? "IF";
        }, 1500)
    }
}

window.onkeyup = function (e) {
    let idx;
    if (e.ctrlKey)
        idx = down.findIndex(val => val === "Control");
    else 
        idx = down.findIndex(val => val === e.key);
    down.splice(idx, 1);
}

///////////////////////////////////
//                               //  
//    AUTOSAVE IMPLEMENTATION    //
//                               //
///////////////////////////////////
/* Autosave implementation */
let editor_timeout, stats_timeout;

function saveStory(text) {
    let story_title = IF.story.variables ? (IF.state.variables.title) : null;
    lwrite(localStorageKeys.storyText, text);
    document.title = "Story Saved.";
    setTimeout(() => {
        document.title = story_title ?? "IF";
    }, 1500);
}

function saveStats(text) {
    let story_title = IF.story.variables ? (IF.story.variables.title) : null;
    lwrite(localStorageKeys.statsText, text);
    document.title = "Stats Saved.";
    setTimeout(() => {
        document.title = story_title ?? "IF";
    }, 1500);
}

$("#if_r-input-area").addEventListener("keyup", function (e) {
    if (editor_timeout) clearTimeout(editor_timeout);

    editor_timeout = setTimeout(function () {
        saveStory(e.target.value);
    }, 750);
});

$("#if_r-stats-editor").addEventListener("keyup", function (e) {
    if (stats_timeout) clearTimeout(stats_timeout);

    editor_timeout = setTimeout(function () {
        saveStats( e.target.value);
    }, 750);
});

///////////////////////////////////
//                               //  
//            PARSING            //
//                               //
///////////////////////////////////
/* Parsing */
function runSubmit() {
    let storyValue = $("#if_r-input-area").value;
    let statsValue = $("#if_r-stats-editor").value;

    $("#instructDiv").style.display = "none";
    $("#if_r-output-area").style.display = "flex";

    $("#output-tablink").dispatchEvent(clickEvent);

    lwrite(localStorageKeys.storyText, storyValue);
    lwrite(localStorageKeys.statsText, statsValue);

    IF.story = parseText(storyValue);

    lwrite(localStorageKeys.objectStorage, JSON.stringify(IF));

    IF.methods.loadStory(IF.story);
}