IF.dom = {
    target_id: "#if_r-output-area",
    alert_area_id: "#if_r-alerts-area",
    section_display_id: "#if_r-section-display-area",
    burger_id: "#if_r-burger",
    stats_div_id: "#if_r-stats-div",
    stats_div_class: ".if_r-stats-div",
    undo_button_id: "#if_r-undo-button",
    reset_button_id: "#if_r-reset-button",
    variableRegex: /\$\{[a-zA-Z0-9=]+?\}/g
};

IF.methods = {
    generateHTML: function (story) {
        const {
            name,
            sections,
            passages
        } = story;
        let wrapper = ``;
        wrapper += `<h2>${name} - New Story</h2>`;

        document.title = `${name} | IF`;

        sections.forEach(section => {
            wrapper += generateHTMLForSection(section);
        });
        return wrapper;
    },

    generateSectionBySerial: function (serial) {
        let section = IF.story.findSection(parseInt(serial));
        return IF.methods.generateHTMLForSection(section);
    },

    generateHTMLForSection: function (section) {
        let wrapper = ``;
        if (!section) {
            IF.methods.showAlert("Something's wrong!");
            return;
        }
        let {
            title,
            choices,
            text,
            serial
        } = section;

        let titleText = title;
        let titleVars = titleText.match(IF.dom.variableRegex);
        titleText = IF.methods.replaceVars(titleText, titleVars);

        let parasText = text;
        let paraVars = parasText.match(IF.dom.variableRegex);

        parasText = IF.methods.replaceVars(parasText, paraVars);
        parasText = IF.methods.formatText(parasText);

        console.log(parasText);

        wrapper += `<div class="if_r-section" id="section-${serial}">`;

        wrapper += `<h3 class="if_r-section-title">${titleText}</h3>`;

        wrapper += `<div class="if_r-paras">${parasText}</div>`;

        wrapper += `<ul class="if_r-section-choices-list" id="section-${serial}-choices">`;

        wrapper = IF.methods.loadChoices(choices, wrapper, serial);

        wrapper += `</ul>`;
        wrapper += `</div>`;

        return wrapper;
    },

    loadChoices: function (choices, wrapper, serial) {
        choices.forEach((choice, i) => {
            if (IF.methods.isSatisfied(choice.condition)) {
                let {
                    target,
                    owner,
                    mode,
                    variables
                } = choice;
                let choiceVars = choice.text.match(IF.dom.variableRegex);
                let choiceText = choice.text;

                choiceText = IF.methods.replaceVars(choiceText, choiceVars);

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
    },

    isSatisfied: function (condition) {
        if (!condition) {
            return true;
        }

        let {
            comparisons,
            glue,
            type
        } = condition;
        // let operators = ["==", ">=", "<=", ">", "<"];

        if (glue) {
            if (glue.trim() === "&") {
                comparisons.forEach(comp => {
                    let truth = IF.methods.doesMatch(comp);

                    if (!truth) {
                        return false;
                    }
                });
                return true;
            } else if (glue.trim() === "|") {
                comparisons.forEach(comp => {
                    let truth = IF.methods.doesMatch(comp);

                    if (truth) {
                        return true;
                    }
                });
                return false;
            }
        } else {
            return IF.methods.doesMatch(comparisons[0]);
        }
    },

    doesMatch: function (comp, type) {
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
    },

    replaceVars: function (text, vars) {
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
    },

    formatText: function (text) {
        if(!showdown) return text;
        var converter = new showdown.Converter(),
            text = text;
        return converter.makeHtml(text);
    },

    setupUndo: function () {
        IF.methods.setState({
            lastSection: IF.state.section
        });
    },

    recordOldValues: function (vars) {
        IF.state.oldValues = {};
        vars.forEach(variable => {
            IF.state.oldValues[variable] = IF.story.variables[variable];
        });
    },

    undoVars: function (vars) {
        Object.keys(vars).forEach(variable => {
            IF.story.variables[variable] = vars[variable];
        });
    },

    undoTurn: function () {
        IF.methods.undoVars(IF.state.oldValues);
        IF.methods.changeTurn(-1);
        IF.methods.switchSection(IF.state.lastSection.serial, true);
        document.querySelector(IF.dom.undo_button_id).style.display = "none";
    },

    switchSection: function (targetSec, isUndo) {
        let sectionHTML = IF.methods.generateSectionBySerial(targetSec);
        IF.methods.loadSection(sectionHTML);

        if (!isUndo) {
            IF.methods.setupUndo();
            document.querySelector(IF.dom.undo_button_id).style.display = "block";
        }

        let section = IF.story.findSection(targetSec);
        let {
            timer,
            target
        } = section.settings.timer;
        if (IF.state.currentTimeout)
            clearTimeout(IF.state.currentTimeout);
        if (timer && target) {
            IF.state.currentTimeout = IF.methods.setTimer(timer, target);
        }

        if (!isUndo) IF.methods.changeTurn();

        IF.methods.setState({
            section: targetSec
        });

        IF.methods.showStats();
    },

    setState: function (opts) {
        Object.keys(opts).forEach(opt => {
            if (opt !== "section")
                IF.state[opt] = opts[opt];
            else
                IF.state['section'] = IF.story.findSection(opts['section']);
        });
    },

    changeTurn: function (change) {
        IF.methods.setState({
            turn: change ? (IF.state.turn + change) : IF.state.turn + 1
        });
    },

    showStats: function () {
        let stats = Object.keys(IF.story.variables);
        let statsHTML = `<pre> <b>Turn:</b> ${IF.state.turn}   `;

        stats.forEach(stat => {
            statsHTML += `<b>${stat}:</b> ${IF.story.variables[stat]}   `;
        });

        statsHTML += `</pre>`;

        document.querySelector(IF.dom.alert_area_id).innerHTML = statsHTML;
    },

    loadSection: function (sectionHTML, serial) {
        if (!IF.story.settings.referrable) {
            IF.methods.replaceSection(sectionHTML, serial);
        } else {
            IF.methods.appendSection(sectionHTML, serial);
        }
    },

    changeVariables: function (vars, to) {
        IF.methods.recordOldValues(vars);
        vars.forEach(variable => {
            IF.story.variables[variable] = parseInt(to) ?? to;
        });
    },

    doActions: function (actions) {
        actions.forEach(act => {
            let op = act.operator.trim();
            let subject = act.subject.trim();
            let {
                type
            } = act;

            if (IF.state.oldValues[subject] !== undefined || IF.state.oldValues[subject] !== null)
                IF.methods.recordOldValues([subject]);

            if (type && type === "vs") {
                if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                    let modifier = parseInt(act.modifier) ? parseInt(act.modifier) : act.modifier.trim();
                    IF.methods.finishAction(subject, op, modifier);
                }

            } else {
                if (IF.story.variables[subject] || IF.story.variables[subject] === 0) {
                    let modifier = parseInt(act.modifier.trim()) ? parseInt(act.modifier.trim()) : IF.story.variables[act.modifier.trim()];
                    IF.methods.finishAction(subject, op, modifier);
                }
            }
        });
    },

    finishAction: function (subject, op, modifier) {
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
    },

    setTimer: function (timer, target) {
        return setTimeout(() => {
            IF.methods.switchSection(target);
        }, timer * 1000);
    },

    replaceSection: function (sectionHTML, serial) {
        if (serial) document.querySelector(IF.dom.section_display_id).innerHTML = IF.methods.generateSectionBySerial(serial);
        else {
            document.querySelector(IF.dom.section_display_id).innerHTML = sectionHTML;
        }
        IF.methods.setListenersOnChoices();
    },

    appendSection: function (sectionHTML, serial) {
        if (serial) document.querySelector(IF.dom.section_display_id).innerHTML = IF.methods.generateSectionBySerial(serial);
        else {
            document.querySelector(IF.dom.section_display_id).innerHTML += sectionHTML;
        }
        IF.methods.setListenersOnChoices();
    },

    showAlert: function (html) {
        document.querySelector(IF.dom.alert_area_id).innerHTML = html;
        setTimeout(() => {
            document.querySelector(IF.dom.alert_area_id).innerHTML = "";
        }, 3000);
    },

    setListenersOnChoices: function () {
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
                        IF.methods.showAlert("Empty input not allowed!");
                    } else {
                        choice.onclick = "";
                        IF.methods.changeVariables(vars, inputValue);
                        if (actions) IF.methods.doActions(actions);
                        IF.methods.switchSection(e.target.getAttribute("data-if_r-target"));
                    }
                } else {
                    choice.onclick = "";
                    IF.methods.changeVariables(vars, choice.innerHTML);
                    if (actions) IF.methods.doActions(actions);
                    IF.methods.switchSection(e.target.getAttribute("data-if_r-target"));
                }
            };
        });
    },

    resetStory: function () {
        if (confirm("Restart the story? IF.methods is a beta feature.")) {
            IF.methods.loadStory(IF.story);
        }
    },

    generateStatsHtml: function () {
        // Should generate html for stats section of the sidebar.
    },

    setStats: function (html) {
        stats_div.innerHTML = html;
    },

    showStatsDiv: function () {
        let stats_div = document.querySelector(IF.dom.stats_div_class);
        stats_div.style.display = "block";
        stats_div.style.width = "100%";

        IF.methods.sidebarListeners('set');
    },

    sidebarListeners: function (setting) {
        if (setting === 'set') {
            document.querySelector(`${IF.dom.stats_div_id} .closebtn`).onclick = IF.methods.hideStatsDiv;
            document.querySelector(IF.dom.undo_button_id).onclick = IF.methods.undoTurn;
            document.querySelector(IF.dom.reset_button_id).onclick = IF.methods.resetStory;
        } else if (setting === 'unset') {
            document.querySelector(`${IF.dom.stats_div_class} .closebtn`).onclick = "";
            document.querySelector(IF.dom.undo_button_id).onclick = "";
            document.querySelector(IF.dom.reset_button_id).onclick = "";
        }
    },

    hideStatsDiv: function () {
        let stats_div = document.querySelector(IF.dom.stats_div_class);
        stats_div.style.display = "none";
        stats_div.style.width = "0";

        IF.methods.sidebarListeners('unset');
    },

    replaceHash: function (str, to) {
        return str.replace("#", to ?? "");
    },

    replaceDot: function (str, to) {
        return str.replace(".", to ?? "");
    },

    generateDisplay: function () {
        console.info("Generating dislay...");
        let $main = document.querySelector(IF.dom.target_id);

        $main.innerHTML = `
        <div id="${IF.methods.replaceHash(IF.dom.stats_div_id)}" class="${IF.methods.replaceDot(IF.dom.stats_div_class)}">
          <a href="javascript:void(0)" class="closebtn">&times;</a>
          <a href="#" id="${IF.methods.replaceHash(IF.dom.reset_button_id)}">Restart</a>
		  <a href="#" id="${IF.methods.replaceHash(IF.dom.undo_button_id)}">Undo</a>
		  ${`<a href="#" id="">Stats</a>` /* does nothing */}
        </div>
        <div id="if_r-status-bar">
        <div id="${IF.methods.replaceHash(IF.dom.alert_area_id)}">
        </div>
        <div id="${IF.methods.replaceHash(IF.dom.burger_id)}">
        <a href="#" id="if_r-burger-icon">&#9776;</a>
        </div>
        </div>
        <div id="${IF.methods.replaceHash(IF.dom.section_display_id)}">
        </div>`;

        let burger = document.querySelector(IF.dom.burger_id);

        burger.addEventListener("click", (e) => {
            e.preventDefault();
            IF.methods.showStatsDiv();
        });

        console.info("Display loaded.");
    },

    addMethods: function () {
        IF.story.findSection = function (serial) {
            let index = this.sections.findIndex(section => {
                return section.serial === serial ? true : false;
            });

            if (index == -1) {
                console.warn("No section " + serial + " found. Reverting to default section serial 1.");
                index = 0;
            }
            return this.sections[index];
        }

        IF.story.findPassage = function (serial) {
            let index = this.passages.findIndex(passage => {
                return passage.serial === serial ? true : false;
            });

            if (index === -1) {
                console.warn("No passage " + serial + " found. Reverting to default passage serial 1.");
                index = 0;
            }

            return this.passages[index];
        }

        IF.story.sections = IF.story.sections.map(section => {
            section.findChoice = function (serial) {
                let index = this.choices.findIndex(choice => {
                    return choice.choiceI == serial ? true : false;
                });

                if (index === -1) {
                    index = 0;
                }

                return this.choices[index];
            }

            return section;
        });
    },

    loadStory: function (story) {
        console.info("Story loading...");
        IF.methods.generateDisplay();

        IF.methods.addMethods();

        IF.story = story;
        let {
            timer,
            target
        } = IF.story.settings.fullTimer;
        if (timer !== 0) IF.methods.setTimer(timer, target);
        IF.methods.setState({
            section: IF.story.settings.startAt,
            turn: 0
        });

        IF.methods.loadSection(null, IF.story.settings.startAt);
        IF.methods.showStats();
        document.querySelector(IF.dom.undo_button_id).style.display = "none";
        console.clear();
        console.info("Load finished. Happy playing!");
    }
}