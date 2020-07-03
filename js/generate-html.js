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

    wrapper = loadChoices(choices, wrapper, serial);

    wrapper += `</ul>`;
    wrapper += `</div>`;

    return wrapper;
}

const loadChoices = function (choices, wrapper, serial) {
    choices.forEach((choice, i) => {
        if (isSatisfied(choice.condition)) {
            let { target, owner, mode, variables } = choice;
            let choiceVars = choice.text.match(variableRegex);
            let choiceText = choice.text;

            choiceText = replaceVars(choiceText, choiceVars);

            i += 1;

            wrapper += `<li class="if_r-section-choice-li">
<a class="if_r-section-choice" data-if_r-target="${target}" 
data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}" 
data-if_r-mode="${mode}" data-if_r-i="${i}"
data-if_r-variables="${variables.join(", ")}">${choiceText}</a>
</li>`;
        }
    });

    return wrapper;
}

const isSatisfied = function (condition) {
    if (!condition) {
        return true;
    }

    let { comparisons, glue, type } = condition;
    // let operators = ["==", ">=", "<=", ">", "<"];

    if (glue) {
        if (glue.trim() === "&") {
            comparisons.forEach(comp => {
                let truth = doesMatch(comp);

                if (!truth) {
                    return false;
                }
            });
            return true;
        }
        else if (glue.trim() === "|") {
            comparisons.forEach(comp => {
                let truth = doesMatch(comp);

                if (truth) {
                    return true;
                }
            });
            return false;
        }
    } else {
        return doesMatch(comparisons[0]);
    }
}

const doesMatch = (comp, type) => {
    let truth = false;
    if (type && type === "vs") {
        let real = IF.story.variables[comp.variable];
        let given = parseInt(comp.against) ? parseInt(comp.against) : comp.against.trim();

        // console.log("eval(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`)");

        truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`);
    } else {
        let real = IF.story.variables[comp.variable];
        let given = parseInt(comp.against) ? parseInt(comp.against) : IF.story.variables[comp.against.trim()];

        // console.log(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`);

        truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`);
    }

    return truth;
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
    if (IF.state.currentTimeout)
    clearTimeout(IF.state.currentTimeout);
    if (timer && target) {
        IF.state.currentTimeout = setTimer(timer, target);
    }

    changeTurn();

    setState({section: targetSec});

    showStats();
}

function setState(opts) {
    Object.keys(opts).forEach(opt => {
        if (opt !== "section")
        IF.state[opt] = opts[opt];
        else 
        IF.state['section'] = IF.story.findSection(opts['section']);
    });
}

function changeTurn() {
    setState({ turn: IF.state.turn + 1 });
}

function showStats () {
    let stats = Object.keys(IF.story.variables);
    let statsHTML = `<pre> <b>Turn:</b> ${IF.state.turn}   `;

    stats.forEach(stat => {
        statsHTML += `<b>${stat}:</b> ${IF.story.variables[stat]}   `;
    });

    statsHTML += `</pre>`;

    document.querySelector(".if_r-stats-bar").innerHTML = statsHTML;
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
        IF.story.variables[variable] = parseInt(to) ? parseInt(to) : to;
    });
}

function doActions(actions) {
    actions.forEach(act => {
        let op = act.operator.trim();
        let subject = act.subject.trim();
        let { type } = act;
        if (type && type === "vs") {
            if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                let modifier = parseInt(act.modifier) ? parseInt(act.modifier) : act.modifier.trim();
                finishAction(subject, op, modifier);
            }

        } else {
            if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                let modifier = parseInt(act.modifier.trim()) ? parseInt(act.modifier.trim()) : IF.story.variables[act.modifier.trim()];
                finishAction(subject, op, modifier);
            }
        }
    });
}

function finishAction(subject, op, modifier) {
    if (op === "+") {
        IF.story.variables[subject] += modifier;
    } else if (op === "-") {
        IF.story.variables[subject] -= modifier;
    } else if (op === "*") {
        IF.story.variables[subject] *= modifier;
    } else if (op === "/") {
        IF.story.variables[subject] /= modifier;
    } else if (op === "=") {
        IF.story.variables[subject] = modifier;
    }
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
            let vars = choice.getAttribute("data-if_r-variables") ? choice.getAttribute("data-if_r-variables").split(", ") : [];
            let choiceI = choice.getAttribute("data-if_r-i");
            let actions = IF.state.section.findChoice(choiceI).actions;

            if (mode === 'input') {
                let inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value;
                if (inputValue === "") {
                    showAlert("Empty input not allowed!");
                } else {
                    choice.onclick = "";
                    changeVariables(vars, inputValue);
                    if (actions) doActions(actions);
                    switchSection(e.target.getAttribute("data-if_r-target"));
                }
            } else {
                choice.onclick = "";
                changeVariables(vars, choice.innerHTML);
                if (actions) doActions(actions);
                switchSection(e.target.getAttribute("data-if_r-target"));
            }
        };
    });
}

function loadStory(story) {
    IF.story = story;
    let { timer, target } = IF.story.settings.fullTimer;
    if (timer !== 0) setTimer(timer, target);
    setState({ section: IF.story.settings.startAt, turn: 0 });
}

export { loadStory, loadSection, setState };