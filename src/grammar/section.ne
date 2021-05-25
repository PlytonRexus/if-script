@{%
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
    constructor(title, text, choices, serial, { timer, music }) {
        this.title = title.trim();
        this.text = text.trim();
        this.choices = choices;
        this.serial = serial;
        this.settings = {};
        this.settings.timer = timer;
        this.settings.music = music;
    }

    findChoice(serial) {
        let index = this.choices.findIndex(choice => {
            return choice.choiceI == serial ? true : false;
        });

        if (index === -1) {
            index = 0;
        }

        return this.choices[index];
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
    constructor(owner, target, text, variables, mode, choiceI, condition, actions, targetType) {
        this.mode = mode;
        this.text = text.trim();
        this.owner = owner;
        this.target = target;
        this.variables = variables;
        this.choiceI = choiceI;
        this.condition = condition || null;
        this.actions = actions;
        this.targetType = targetType || "section";
    }
    get type() {
        return 'Choice';
    }
}
%}

section -> "ss>" _ (("secset>" _ ("@timer " int __ "[[" int "]]" _):? ("@music " _ oneline _):? "<secset") | null) _ "tt>" _ oneline _ "<tt" _ text _ choice:* _ "<ss" {% 
    function(d) { 
        /* 
            d[4] -> array<object> object -> { setting, value }
            d[10] -> string
            d[14] -> string
            d[16] -> array<choice>
        */

        console.log(d[2][0]);

        let settings = {};
        if (d[2][0] && d[2][0][2] && d[2][0][2][0]) {
            settings.timer = {};
            settings.timer.timer = parseInt(d[2][0][2][0][1]);
            settings.timer.target = parseInt(d[2][0][2][0][4]);
        } else {
            settings.timer = {};
            settings.timer.timer = 0;
            settings.timer.target = 1;
        }

        if (d[2][0] && d[2][0][3] && d[2][0][3][0]) {
            settings.timer = {};
            settings.music = parseInt(d[2][0][3][0][2]);
        } else {
            settings.timer = {};
            settings.music = null;
        }

        let title = d[6];

        let text = d[10];

        let i = 0;

        let choices = d[12].map(choice => {
            i += 1;
            choice.choiceI = i;
            choice.owner = 1;
            return choice;
        });

        let serial =  1;

        return new Section(title, text, choices, serial, settings);
    }
%}

choice -> "ch>" _ 
    (("${__if" __ LN _ ("==" | ">" | "<" | ">=" | "<=" | "!=") _ (LNS | "'" LNS "'") _ 
    (
      ("&" _ LN _ ("==" | ">" | "<" | ">=" | "<=" | "!=") _ (LNS | "'" LNS "'") _ ):+ 
    | ("|" _ LN _ ("==" | ">" | "<" | ">=" | "<=" | "!=") _ (LNS | "'" LNS "'") _ ):+ 
    | null
    )
    "}") | null) 
    _ oneline __ 
    ("__input" | null) _ 
    ("${__" LN _ ("+" | "-" | "*" | "/" | "=") _ (LNS | "'" LNS "'") _ "}" _):* _ 
    ("${__" LN "}" _):* _ ("[[" _ ("scene" _ ":" _):? int _ "]]") _ "<ch" _ {%
    /**
     * Sample input for playground.
     * ch> chor __input ${__abc} ${__abc} [[8516529]] <ch tweets while thinking about a hammer.
    */
    function (d) {
        let conditionArray = d[2][0] ? d[2][0] : null;
        let condition = conditionArray ? {} : null;

        if (conditionArray) {
            condition.comparisons = [{
                variable: conditionArray[2],
                operator: conditionArray[4][0],
                against: conditionArray[6].length > 1 ? conditionArray[6][1] : conditionArray[6][0],
                type: conditionArray[6].length > 1 ? 'vs' : 'vv'
            }];
            if (conditionArray[8][0]) {
                conditionArray[8][0].forEach(arr => {
                    condition.comparisons.push({
                        variable: arr[2],
                        operator: arr[4][0],
                        against: arr[6].length > 1 ? arr[6][1] : arr[6][0],
                        type: arr[6].length > 1 ? 'vs' : 'vv'
                    });
                })
                condition.glue = conditionArray[8][0][0][0];
            } else {
                // No glue required because only one condition exists.
                condition.glue = null;
            }
        }

        let text = d[4];
        let mode = d[6][0] === "__input" ? "input" : "basic";

        let actions = [];
        d[8].forEach(act => {
            actions.push({
                subject: act[1],
                operator: act[3][0],
                modifier: act[5].length > 1 ? act[5][1] : act[5][0],
                type: act[5].length > 1 ? "vs" : "vv"
            });
        });

        let variables = [];
        d[10].forEach(val => {
            variables.push(val[1]);
        });

        let target = 1,
            targetType = "section";
        if (!d[12][2]) {
            // [[num]]
            target = parseInt(d[12][3]);
            targetType = "section";
        } else {
            // [[scene:num]]
            target = parseInt(d[12][3]);
            targetType = "scene";
        }
        return new Choice(1, target, text, variables, mode, 1, condition, actions, targetType);
    }
%}

# Letters, numbers.
LN -> [a-zA-Z0-9]:+                                {% function(d) {return d[0].join("")} %}

# Letters, numbers and space.
LNS -> [a-zA-Z0-9 ]:+                              {% function(d) {return d[0].join("")} %}

# Integer
int -> [0-9]:+                                     {% function(d) {return d[0].join("")} %}

# Text spanning one line
oneline -> [a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[= |]:+       {% function(d) {return d[0].join("")} %}

# Text spanning paragraphs
text -> [a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]:+         {% function(d) {return d[0].join("")} %}

# Whitespace
_ -> [\s]:*                                        {% function(d) {return null } %}
_N -> [\r\t ]:*                                    {% function(d) {return null } %}
__ -> " "