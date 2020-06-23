const root = document.querySelector("#root");
import { loadStory, loadSection } from "./generate-html.js";
import { parseText } from "./parser/if-parser.js";
import { fetchFile } from "./fetch-file.js";

class DOMDisplay {
    constructor(element) {
        this.dom = element;
    }
    removeChild() {
        this.dom.remove();
    }
    renderChild() {
        root.appendChild(this.dom);
    }
    modifyChild(element) {
        this.dom = element;
    }
}

function createCard(html) {
    let div = document.createElement('div');
    div.setAttribute("class", "card");
    if (html)
    div.innerHTML = html;
    return div;
}

function loadComponent(div) {
    let display = new DOMDisplay(div);
    display.renderChild();
}

function createButton() {
    let button = document.createElement('button');
    button.innerHTML = "Change display";
    button.addEventListener('click', (e) => {
        loadComponent(createCard());
    });
    return button;
}

function createDivs() {
    let backdrop = document.createElement('div');
    let highlights = document.createElement('div');

    backdrop.setAttribute("class", "backdrop");
    highlights.setAttribute("class", "highlights");

    backdrop.appendChild(highlights);

    return backdrop;
}

function createTextBox() {
    let card = createCard();
    let backdrop = createDivs();
    let textarea = document.createElement("textarea");
    let container = document.createElement("div");

    textarea.setAttribute("id", "input-area");

    textarea.addEventListener("keyup", handleInput);
    textarea.addEventListener("scroll", handleScroll);

    textarea.innerHTML = localStorage.getItem("if_r-story-text") || instructions;

    textarea.spellcheck = false;

    container.setAttribute("class", "container");

    container.appendChild(backdrop);
    container.appendChild(textarea);

    card.appendChild(container);

    return { card, textarea };
}

function createParsedDisplay() {
    let card = createCard();
    let div = document.createElement("div");
    div.setAttribute("id", "if_r-output-area");
    
    let button = document.createElement("button");
    button.setAttribute("id", "submit-btn");
    button.addEventListener("click", runSubmit);
    button.innerHTML = `Parse Text`;

    let a = document.createElement("a");
    a.setAttribute("class", "download-btn");
    a.setAttribute("download", "generate-html.js");
    fetchFile('downloadable/if_r.css', 'css');
    a.href = IF.js;
    a.innerHTML = `Download CSS`;

    let b = document.createElement("a");
    b.setAttribute("class", "download-btn");
    b.setAttribute("download", "if_r.css");
    fetchFile('downloadable/if_r-terp.js', 'js');
    b.setAttribute('href', IF.css);
    b.innerHTML = `Download JS`;

    let c = document.createElement("a");
    c.setAttribute("class", "download-btn");
    c.setAttribute("download", "Story.js");
    c.onclick = () => {
        if (!IF.story) return console.log("Parse a story at least once.");
        let text = `const IF = ${JSON.stringify(IF)}`
        let data = new Blob([text], {type: 'text/javascript'});
        c.setAttribute('href', window.URL.createObjectURL(data));
    }
    c.innerHTML = `Download Story`;

    let d = document.createElement("a");
    d.setAttribute("class", "download-btn");
    d.setAttribute("download", "story-text.txt");
    d.onclick = () => {
        let text = document.querySelector("#input-area").value;
        let data = new Blob([text], {type: 'text/plain'});
        d.setAttribute('href', window.URL.createObjectURL(data));
    }
    d.innerHTML = `Download Text`;

    card.appendChild(button);
    card.appendChild(a);
    card.appendChild(b);
    card.appendChild(c);
    card.appendChild(d);
    card.appendChild(div);
    return { card, div };
}

loadComponent(createTextBox().card);
loadComponent(createParsedDisplay().card);
setInterval(() => {
    localStorage.setItem("if_r-story-text", document.querySelector("#input-area").value);
    document.title = "Story Saved.";
    setTimeout(() => {
        document.title = "IF";
    }, 2000);
}, 10000);

function runSubmit() {
    let story = parseText(document.querySelector("#input-area").value);
    loadStory(story);
    loadSection(null, IF.story.settings.startAt);
}