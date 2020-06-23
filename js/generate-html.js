import { Story, variableRegex } from "./parser/if-parser.js";

/**
 * Returns HTML formatted string of a Story instance
 *
 * @param {Story} story A Story instance
 * @returns {string} HTML formatted string
 */
function generateHTML (story) {
    const { name, sections, passages } = story;
    let wrapper = ``;
    wrapper += `<h2>${name} - New Story</h2>`;

    document.title = `${name} | IF`;

    sections.forEach(section => {
        wrapper += generateHTMLForSection(section);
    });
    return wrapper;
}

function generateSectionBySerial(serial) {
    let section = IF.story.findSection(parseInt(serial));
    return generateHTMLForSection(section);
}

function generateHTMLForSection(section) {
    let wrapper = ``;
    if (!section) {
        showAlert("Something's wrong!");
        return;
    }
    let { title, choices, text, serial } = section;

    let titleText = title;
    let titleVars = titleText.match(variableRegex);
    titleText = replaceVars(titleText, titleVars);

    let parasText = text;
    let paraVars = parasText.match(variableRegex);

    parasText = replaceVars(parasText, paraVars);

    wrapper += `<div id="if_r-alerts-area"></div>`;

    wrapper += `<div class="if_r-section" id="section-${serial}">`;

    wrapper += `<h3 class="if_r-section-title">${titleText}</h3>`;

    wrapper += `<div class="if_r-paras">${parasText}</div>`;

    wrapper += `<ul class="if_r-section-choices-list" id="section-${serial}-choices">`;

    let i = 0;
    choices.forEach(choice => {
        let { target, owner, mode, variables } = choice;
        let choiceVars = choice.text.match(variableRegex);
        let choiceText = choice.text;

        choiceText = replaceVars(choiceText, choiceVars);

        i += 1;

        wrapper += 
        `<li class="if_r-section-choice-li">
        <a class="if_r-section-choice" data-if_r-target="${target}" 
        data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}" 
        data-if_r-mode="${mode}" data-if_r-i="${i}"
        data-if_r-variables="${variables.join(", ")}">${choiceText}</a>
        </li>`;
    });

    wrapper += `</ul>`;
    wrapper += `</div>`;

    return wrapper;
}

function replaceVars(text, vars) {
    if (vars) {
        vars.forEach(val => {
            let varName = val.replace(/\$\{/, "").replace(/\}/, "").trim();
            if (IF.story.variables[varName]) {
                text = 
                text.replace(
                    new RegExp("\\$\\{\\s*" + varName + "\\s*\\}"),
                    IF.story.variables[varName]
                );
            } else {
                text = 
                text.replace(
                    new RegExp("\\$\\{\\s*" + varName + "\\s*\\}"), 
                    ""
                );
            }
        });
    }

    return text;
}

function switchSection(targetSec) {
    let sectionHTML = generateSectionBySerial(targetSec);
    loadSection(sectionHTML);

    let section = IF.story.findSection(targetSec);
    let { timer, target } = section.settings.timer;
    if (IF.story.currentTimeout)
    clearTimeout(IF.story.currentTimeout);
    if (timer && target) {
        IF.story.currentTimeout = setTimer(timer, target);
    }
}

function loadSection(sectionHTML, serial) {
    if (!IF.story.settings.referrable) {
        replaceSection(sectionHTML, serial);
    } else {
        appendSection(sectionHTML, serial);
    }
}

function changeVariables(vars, to) {
    vars.forEach(variable => {
        IF.story.variables[variable] = to;
    });
}

function setTimer (timer, target) {
    return setTimeout(() => {
        switchSection(target);
    }, timer * 1000);
}

function replaceSection(sectionHTML, serial) {
    if (serial) document.querySelector("#if_r-output-area").innerHTML = generateSectionBySerial(serial);
    else {
        document.querySelector("#if_r-output-area").innerHTML = sectionHTML;
    }
    setListenersOnChoices();
}

function appendSection(sectionHTML, serial) {
    if (serial) document.querySelector("#if_r-output-area").innerHTML = generateSectionBySerial(serial);
    else {
        document.querySelector("#if_r-output-area").innerHTML += sectionHTML;
    }
    setListenersOnChoices();
}

function showAlert(html) {
    document.querySelector("#alert-area").innerHTML = html;
    setTimeout(() => {
        document.querySelector("#alert-area").innerHTML = "";
    }, 3000);
}

function setListenersOnChoices () {
    document.querySelectorAll(".if_r-section-choice").forEach(choice => {
        choice.onclick = (e) => {
            e.preventDefault();
            let mode = choice.getAttribute("data-if_r-mode");
            let vars = choice.getAttribute("data-if_r-variables") ? choice.getAttribute("data-if_r-variables").split(", "): [];
            if (mode === 'input') {
                let choiceI = choice.getAttribute("data-if_r-i");
                let inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value;
                if (inputValue === "") {
                    showAlert("Empty input not allowed!");
                } else {
                    choice.onclick = "";
                    changeVariables(vars, inputValue);
                    switchSection(e.target.getAttribute("data-if_r-target"));
                }
            } else {
                choice.onclick = "";
                changeVariables(vars, choice.innerHTML);
                switchSection(e.target.getAttribute("data-if_r-target"));
            }
        };
    });
}

function loadStory(story) {
    IF.story = story;
    let { timer, target } = IF.story.settings.fullTimer;
    setTimer(timer, target);
}

export { loadStory, loadSection };