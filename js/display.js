const root = document.querySelector("#root");
import {
    parseText
} from "./parser/if-parser.js";

///////////////////////////////////
//                               //
//       HELPER FUNCTIONS        //
//                               //
///////////////////////////////////

function fetchFile(addr, site) {
    fetch(addr) // 1) fetch the url
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

function lread(key = 'if_r-story-text') {
    return localStorage.getItem(key);
}

function lwrite(key = 'if_r-story-text', value = instructions) {
    return localStorage.setItem(key, value);
}

function showAlert(text) {
    let alertArea = document.querySelector("#alerts-area");
    alertArea.style.display = "block";
    alertArea.innerHTML = text;
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

/* Topnav */
///////////////////////////////////
//                               //  
//            TOPNAV             //
//                               //
///////////////////////////////////
let storyBtn = createElement('a', {
    "class": "download-btn",
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
    innerHTML: "Download story"
});

let storyTextBtn = createElement('a', {
    "class": "download-btn",
    "download": "story.txt"
}, null, {
    onclick: function () {
        let data = new Blob(
            [document.querySelector("#if_r-input-area").value], {
                type: 'text/plain'
            }
        );
        storyTextBtn.setAttribute('href', window.URL.createObjectURL(data));
    },
    innerHTML: "Download story text"
});

let parseBtn = createElement('a', {
    id: 'submit-btn'
}, null, {
    onclick: runSubmit,
    'innerHTML': '&#9654; Run'
});

let previewBtn = createElement('a', {
    id: 'preview-btn',
    class: 'download-btn'
}, null, {
    onclick: function () {
        if (Object.keys(IF.story).length <= 0) return showAlert("You haven't run a story yet.");
        else {
            window.open("preview");
        }
    },
    'innerHTML': '&#128065 Preview'
});

let settingsBtn = createElement('a', {
    id: 'settings-btn'
}, null, {
    onclick: function () {},
    innerHTML: '&#9881;'
});

let readBtn = createElement('a', {
    id: 'read-btn',
    class: 'right-align-top content-opts'
}, null, {
    onclick: function () {
        let $outputDiv  = document.querySelector("#output-div");
        $outputDiv.style.width = "100%";
        let $editorDiv = document.querySelector("#editor-div");
        $editorDiv.style.width = "0"
    },
    innerHTML: '&leftarrow;'
});

let writeBtn = createElement('a', {
    id: 'write-btn',
    class: 'right-align-top content-opts'
}, null, {
    onclick: function () {
        let $outputDiv  = document.querySelector("#output-div");
        $outputDiv.style.width = "0";
        let $editorDiv = document.querySelector("#editor-div");
        $editorDiv.style.width = "100%"
    },
    innerHTML: '&rightarrow;'
});

let balanceBtn = createElement('a', {   
    id: 'balance-btn',
    class: 'right-align-top content-opts'
}, null, {
    onclick: function () {
        let $outputDiv  = document.querySelector("#output-div");
        $outputDiv.style.width = "50%";
        let $editorDiv = document.querySelector("#editor-div");
        $editorDiv.style.width = "50%"
    },
    innerHTML: '&#8646;'
});

let logoBtn = createElement('a', {   
    id: 'logo',
    class: 'topnav-btn',
    href: "/"
}, null, {
    innerHTML: '<img src="assets/images/if-logo.png" width="50px" height="50px" id="logo-img"/>'
});

let topnav = createElement(
    'div', {
        class: 'topnav'
    }, null, null,
    [parseBtn, previewBtn, storyBtn, storyTextBtn, settingsBtn, readBtn, writeBtn, balanceBtn, logoBtn]
);

///////////////////////////////////
//                               //  
//         EDITOR - DIV          //
//                               //
///////////////////////////////////
/* div1 */
let editor = createElement('textarea', {
    id: 'if_r-input-area',
    class: 'editor'
});

let statsEditor = createElement('textarea', {
    id: 'if_r-stats-editor',
    class: 'editor'
});

function openCity1(evt) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent1");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks1");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(evt.target.innerHTML).style.display = "block";
    evt.currentTarget.className += " active";
}

///////////////////////////////////
//                               //
//         TABLINKS - 1          //
//                               //
///////////////////////////////////
/* Tab links */
let storyEd = createElement('button', {
    class: 'tablinks1 active'
}, null, {
    onclick: openCity1,
    innerHTML: 'Story'
});

let statEd = createElement('button', {
    class: 'tablinks1'
}, null, {
    onclick: openCity1,
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
}, null, null, [ editor ]);

let statcon = createElement('div', {
    id: 'Stats',
    class: 'tabcontent1'
}, null, null, [ statsEditor ]);

///////////////////////////////////
//                               //  
//         OUTPUT - DIV          //
//                               //
///////////////////////////////////
/* div2 */
function openCity2(evt) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent2");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks2");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(evt.target.innerHTML).style.display = "block";
    evt.currentTarget.className += " active";
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
    class: 'tablinks2 active'
}, null, {
    onclick: openCity2,
    innerHTML: 'Help'
});

let tools = createElement('button', {
    class: 'tablinks2'
}, null, {
    onclick: openCity2,
    innerHTML: 'Tools'
});

let outputDiv = createElement('button', {
    class: 'tablinks2',
    id: "output-tablink"
}, null, {
    onclick: openCity2,
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

let toolcon = createElement('div', {
    id: 'Tools',
    class: 'tabcontent2'
}, null, {
    innerHTML: `<h3>Tools</h3>
    <p>The tools page.</p>`
});

let instructDiv = createElement('i', { id: "instructDiv" }, null, {
    innerHTML: "Click Run to start playing!"
});

let outcon = createElement('div', {
    id: "Output",
    class: 'tabcontent2'
}, null, null, [ instructDiv, output ]);

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
    },
    {
        left: '0'
    }, null, [tabs1, storcon, statcon]
);
let div2 = createElement(
    'div', {
        class: 'main-div',
        id: 'output-div'
    },
    {
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
root.appendChild(topnav);
root.appendChild(mainDiv);

///////////////////////////////////
//                               //  
//    GETTING READY, FINALLY!    //
//                               //
///////////////////////////////////
/* Getting ready... */
document.getElementById("Help").style.display = "block";
document.getElementById("Story").style.display = "block";
document.querySelector("#if_r-input-area").value = lread('if_r-story-text') || instructions;
document.querySelector("#if_r-stats-editor").value = lread('if_r-story-stats') || statsInstructions;
document.querySelectorAll(".highlighted").forEach(ele => {
    w3CodeColor(ele);
});

///////////////////////////////////
//                               //  
//    AUTOSAVE IMPLEMENTATION    //
//                               //
///////////////////////////////////
/* Autosave implementation */
let editor_timeout, stats_timeout;
document.querySelector("#if_r-input-area").addEventListener("keyup", function (e) {
    if (editor_timeout) clearTimeout(editor_timeout);

    let story_title = IF.story.variables ? (IF.story.variables.title) : null;

    editor_timeout = setTimeout(function () {
        lwrite("if_r-story-text", e.target.value);
        document.title = "Story Saved.";
        setTimeout(() => {
            document.title = story_title ?? "IF";
        }, 1500);
    }, 750);
});

document.querySelector("#if_r-stats-editor").addEventListener("keyup", function (e) {
    if (stats_timeout) clearTimeout(stats_timeout);

    let story_title = IF.story.variables ? (IF.state.variables.title) : null;

    editor_timeout = setTimeout(function () {
        lwrite("if_r-story-stats", e.target.value);
        document.title = "Stats Saved.";
        setTimeout(() => {
            document.title = story_title ?? "IF";
        }, 1500);
    }, 750);
});

///////////////////////////////////
//                               //  
//            PARSING            //
//                               //
///////////////////////////////////
/* Parsing */
function runSubmit() {
    let storyValue = document.querySelector("#if_r-input-area").value;
    let statsValue = document.querySelector("#if_r-stats-editor").value;
    
    document.querySelector("#instructDiv").style.display = "none";
    document.querySelector("#if_r-output-area").style.display = "flex";

    document.querySelector("#output-tablink").dispatchEvent(clickEvent);

    lwrite("if_r-story-text", storyValue);
    lwrite("if_r-story-stats", statsValue);

    IF.story = parseText(storyValue);

    lwrite("if_r-if-object", JSON.stringify(IF));

    IF.methods.loadStory(IF.story);
}