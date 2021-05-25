@{%
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
    constructor(name, { sections, passages }, { referrable, startAt, fullTimer }, { globals, stats }) {
        this.name = name.trim();
        this.sections = sections;
        this.passages = passages;
        this.settings = {};
        this.settings.referrable = referrable;
        this.settings.startAt = startAt;
        this.settings.fullTimer = fullTimer;
        this.variables = {};
        if (globals) {
            Object.keys(globals).forEach(global => {
                this.variables[global] = globals[global];
            })
        }
        this.stats = stats;
    }

    findSection(serial) {
        let index = this.sections.findIndex(section => {
            return section.serial === serial ? true : false;
        });

        if (index == -1) {
            console.warn("No section " + serial + " found. Reverting to default section serial 1.");
            index = 0;
        }
        return this.sections[index];
    }

    findPassage(serial) {
        let index = this.passages.findIndex(passage => {
            return passage.serial === serial ? true : false;
        });

        if (index === -1) {
            console.warn("No passage " + serial + " found. Reverting to default passage serial 1.");
            index = 0;
        }

        return this.passages[index];
    }

    get type() {
        return 'Story';
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
    constructor(title, text, choices, serial, { timer }) {
        this.title = title.trim();
        this.text = text.trim();
        this.choices = choices;
        this.serial = serial;
        this.settings = {};
        this.settings.timer = timer;
    }

    get type() {
        return 'Section';
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
    constructor(owner, target, text, variables, mode, choiceI) {
        this.mode = mode;
        this.text = text.trim();
        this.owner = owner;
        this.target = target;
        this.variables = variables;
        this.choiceI = choiceI;
    }
    get type() {
        return 'Choice';
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
    constructor(title, text) {
        super(title, text, [], serial);
    }

    get type() {
        return 'Passage';
    }
}

let owner = 0;

%}

story -> _ (settings | null) _ section:* _ passage:* _ {% 
    function(d) { return {
        /*
            d[1] -> array<object> 
        */
        settings: d[1],
        sections: d[3],
        passages: d[5],
        parsedAt: Date.now()
    } } 
%}

settings -> "settings>" _ settingskey:* _ "<settings" {% 
    function (d) {
        /*
            d[0] -> array<object> object -> { setting, value }
        */
        let settings = {};
        d[2].forEach(key => {
            settings[key.setting] = key.value;
        });
        return settings;
    } 
%}

section -> "ss>" _ (("secset>" _ "@timer " int _N "[[" int "]]" _ "<secset") | null) _ "tt>" _ oneline _ "<tt" _ text _ choice:* _ "<ss" {% 
    function(d) { 
        /* 
            d[4] -> array<object> object -> { setting, value }
            d[10] -> string
            d[14] -> string
            d[16] -> array<choice>
        */
        owner += 1;

        let settings = {};
        if (d[2]) {
            settings.timer = {};
            settings.timer.timer = parseInt(d[2][3]);
            settings.timer.target = parseInt(d[2][6]);
        } else {
            settings.timer = {};
            settings.timer.timer = 0;
            settings.timer.target = 1;
        }

        let title = d[6];

        let text = d[10];

        let i = 0;

        let choices = d[12].map(choice => {
            i += 1;
            choice.choiceI = i;
            return choice;
        });

        return new Section(title, text, choices, 1, settings);
    }
%}

passage -> "pp>" _ "tt>" _ oneline _ "<tt" _ text _ "<pp" _ {%
    function(d) {
        /* 
            d[5] -> string
            d[9] -> string
        */
        let title = d[5];
        let text = d[9];
    }
%}

# These settings should probably be made static.
# For every setting, there should be a seperate key that is allowed only once.

settingskey -> ("@" ("fullTimer" | "startAt" | "referrable") __ LN ((__ "[[" LN "]]") | null)) | ("${" LN "=" LNS "}") {% 
    // There's no check to see if val2 of any setting actually exists.
    function (d, loc) {
        if (d[0] === "@") {
            let [at, setting, sp1, val1, sp2, br1, val2] = d;
            if (setting === "fullTimer") {
                if (parseInt(val1) && parseInt(val1) > 0 && parseInt(val2) && parseInt(val2) > 0) {
                    return {
                        setting,
                        value: {
                            timer: parseInt(val1),
                            target: parseInt(val2)
                        }
                    }
                } else {
                    console.warn("Invalid 'fullTimer' value found at index number: " + loc + ". Switching to defaults.");
                    return {
                        setting,
                        value: {
                            timer: 0,
                            target: 1
                        }
                    }
                }
            } else if (setting === "startAt") {
                if (parseInt(val1) && parseInt(val1) > 0) {
                    return {
                        setting,
                        value: val1
                    }
                } else {
                    console.warn("Invalid 'startAt' value found at index number: " + loc + ". Switching to defaults.");
                    return {
                        setting,
                        startAt: 1
                    }
                }
            } else if (setting === "referrable") {
                if (val1) {
                    return val1 === "true" ? {
                        setting,
                        value: true
                    } : {
                        setting,
                        value: false
                    };
                }
            }
        } else if (d[0] === "${") {
            let [opener, sp1, binding, equals, value] = d;
            return {
                binding,
                value
            };
        }
    }
%}

choice -> "ch>" _ oneline __ ("__input" | null) _N ("${__" LN "} "):* _ "[[" int "]]" _ "<ch" _ {%
    /**
     * Sample input for playground.
     * ch> chor __input ${__abc} ${__abc} [[8516529]] <ch tweets while thinking about a hammer.
    */
    function (d) {
        let text = d[2];
        let mode = d[4][0] === "isInput" ? "input" : "basic";
        let variables = [];
        d[6].forEach(val => {
            variables.push(val[2]);
        });
        let target = parseInt(d[9]);
        return new Choice(owner, target, text, variables, mode, 1);
    }
%}

# Letters, numbers.
LN -> [a-zA-Z0-9]:+                                {% function(d) {return d[0].join("")} %}

# Letters, numbers and space.
LNS -> [a-zA-Z0-9 ]:+                              {% function(d) {return d[0].join("")} %}

# Integer
int -> [0-9]:+                                     {% function(d) {return d[0].join("")} %}

# Text spanning one line
oneline -> [a-zA-Z0-9$@%\(\)\{\}!&\]\[= ]:+        {% function(d) {return d[0].join("")} %}

# Text spanning paragraphs
text -> [a-zA-Z0-9$@%\(\)\{\}!&\]\[=\s]:+          {% function(d) {return d[0].join("")} %}

# Whitespace
_ -> [\s]:*                                        {% function(d) {return null } %}
_N -> [\r\t ]:*                                    {% function(d) {return null } %}
__ -> " "                                          {% id %}