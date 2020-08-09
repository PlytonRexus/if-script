// Generated automatically by nearley, version 2.19.4
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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
var sectionG = {
    Lexer: undefined,
    ParserRules: [
    {"name": "section$string$1", "symbols": [{"literal":"s"}, {"literal":"s"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$string$1", "symbols": [{"literal":"s"}, {"literal":"e"}, {"literal":"c"}, {"literal":"s"}, {"literal":"e"}, {"literal":"t"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$1", "symbols": [{"literal":"@"}, {"literal":"t"}, {"literal":"i"}, {"literal":"m"}, {"literal":"e"}, {"literal":"r"}, {"literal":" "}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$2", "symbols": [{"literal":"["}, {"literal":"["}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$3", "symbols": [{"literal":"]"}, {"literal":"]"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$1", "int", "__", "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$2", "int", "section$subexpression$1$subexpression$1$ebnf$1$subexpression$1$string$3", "_"]},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1", "symbols": ["section$subexpression$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "section$subexpression$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$2$subexpression$1$string$1", "symbols": [{"literal":"@"}, {"literal":"m"}, {"literal":"u"}, {"literal":"s"}, {"literal":"i"}, {"literal":"c"}, {"literal":" "}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1$ebnf$2$subexpression$1", "symbols": ["section$subexpression$1$subexpression$1$ebnf$2$subexpression$1$string$1", "_", "oneline", "_"]},
    {"name": "section$subexpression$1$subexpression$1$ebnf$2", "symbols": ["section$subexpression$1$subexpression$1$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "section$subexpression$1$subexpression$1$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "section$subexpression$1$subexpression$1$string$2", "symbols": [{"literal":"<"}, {"literal":"s"}, {"literal":"e"}, {"literal":"c"}, {"literal":"s"}, {"literal":"e"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$subexpression$1$subexpression$1", "symbols": ["section$subexpression$1$subexpression$1$string$1", "_", "section$subexpression$1$subexpression$1$ebnf$1", "section$subexpression$1$subexpression$1$ebnf$2", "section$subexpression$1$subexpression$1$string$2"]},
    {"name": "section$subexpression$1", "symbols": ["section$subexpression$1$subexpression$1"]},
    {"name": "section$subexpression$1", "symbols": []},
    {"name": "section$string$2", "symbols": [{"literal":"t"}, {"literal":"t"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$string$3", "symbols": [{"literal":"<"}, {"literal":"t"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section$ebnf$1", "symbols": []},
    {"name": "section$ebnf$1", "symbols": ["section$ebnf$1", "choice"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "section$string$4", "symbols": [{"literal":"<"}, {"literal":"s"}, {"literal":"s"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "section", "symbols": ["section$string$1", "_", "section$subexpression$1", "_", "section$string$2", "_", "oneline", "_", "section$string$3", "_", "text", "_", "section$ebnf$1", "_", "section$string$4"], "postprocess":  
        function(d) { 
            /* 
                d[4] -> array<object> object -> { setting, value }
                d[10] -> string
                d[14] -> string
                d[16] -> array<choice>
            */
        
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
                settings.music = d[2][0][3][0][2];
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
        },
    {"name": "choice$string$1", "symbols": [{"literal":"c"}, {"literal":"h"}, {"literal":">"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$string$1", "symbols": [{"literal":"$"}, {"literal":"{"}, {"literal":"_"}, {"literal":"_"}, {"literal":"i"}, {"literal":"f"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$1$string$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1$string$2", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$1$string$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1$string$3", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$1$string$3"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$1$string$4"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$2", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$3", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$3"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1$string$4"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1", "symbols": [{"literal":"&"}, "_", "LN", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$1", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1$subexpression$2", "_"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$2", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$3", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$3"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1$string$4"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2", "symbols": [{"literal":"&"}, "_", "LN", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$1", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2$subexpression$2", "_"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$2", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$3", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$3"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1$string$4"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1", "symbols": [{"literal":"|"}, "_", "LN", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$1", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1$subexpression$2", "_"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$1"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$2", "symbols": [{"literal":">"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$3", "symbols": [{"literal":"<"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$3"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$4", "symbols": [{"literal":"!"}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1$string$4"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2", "symbols": [{"literal":"|"}, "_", "LN", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$1", "_", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2$subexpression$2", "_"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2", "choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3", "symbols": ["choice$subexpression$1$subexpression$1$subexpression$3$ebnf$2"]},
    {"name": "choice$subexpression$1$subexpression$1$subexpression$3", "symbols": []},
    {"name": "choice$subexpression$1$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1$string$1", "__", "LN", "_", "choice$subexpression$1$subexpression$1$subexpression$1", "_", "choice$subexpression$1$subexpression$1$subexpression$2", "_", "choice$subexpression$1$subexpression$1$subexpression$3", {"literal":"}"}]},
    {"name": "choice$subexpression$1", "symbols": ["choice$subexpression$1$subexpression$1"]},
    {"name": "choice$subexpression$1", "symbols": []},
    {"name": "choice$subexpression$2$string$1", "symbols": [{"literal":"_"}, {"literal":"_"}, {"literal":"i"}, {"literal":"n"}, {"literal":"p"}, {"literal":"u"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$2", "symbols": ["choice$subexpression$2$string$1"]},
    {"name": "choice$subexpression$2", "symbols": []},
    {"name": "choice$ebnf$1", "symbols": []},
    {"name": "choice$ebnf$1$subexpression$1$string$1", "symbols": [{"literal":"$"}, {"literal":"{"}, {"literal":"_"}, {"literal":"_"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$1", "symbols": [{"literal":"="}]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$2", "symbols": ["LNS"]},
    {"name": "choice$ebnf$1$subexpression$1$subexpression$2", "symbols": [{"literal":"'"}, "LNS", {"literal":"'"}]},
    {"name": "choice$ebnf$1$subexpression$1", "symbols": ["choice$ebnf$1$subexpression$1$string$1", "LN", "_", "choice$ebnf$1$subexpression$1$subexpression$1", "_", "choice$ebnf$1$subexpression$1$subexpression$2", "_", {"literal":"}"}, "_"]},
    {"name": "choice$ebnf$1", "symbols": ["choice$ebnf$1", "choice$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "choice$ebnf$2", "symbols": []},
    {"name": "choice$ebnf$2$subexpression$1$string$1", "symbols": [{"literal":"$"}, {"literal":"{"}, {"literal":"_"}, {"literal":"_"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$ebnf$2$subexpression$1", "symbols": ["choice$ebnf$2$subexpression$1$string$1", "LN", {"literal":"}"}, "_"]},
    {"name": "choice$ebnf$2", "symbols": ["choice$ebnf$2", "choice$ebnf$2$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "choice$subexpression$3$string$1", "symbols": [{"literal":"["}, {"literal":"["}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$3$ebnf$1$subexpression$1$string$1", "symbols": [{"literal":"s"}, {"literal":"c"}, {"literal":"e"}, {"literal":"n"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$3$ebnf$1$subexpression$1", "symbols": ["choice$subexpression$3$ebnf$1$subexpression$1$string$1", "_", {"literal":":"}, "_"]},
    {"name": "choice$subexpression$3$ebnf$1", "symbols": ["choice$subexpression$3$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "choice$subexpression$3$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "choice$subexpression$3$string$2", "symbols": [{"literal":"]"}, {"literal":"]"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice$subexpression$3", "symbols": ["choice$subexpression$3$string$1", "_", "choice$subexpression$3$ebnf$1", "int", "_", "choice$subexpression$3$string$2"]},
    {"name": "choice$string$2", "symbols": [{"literal":"<"}, {"literal":"c"}, {"literal":"h"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "choice", "symbols": ["choice$string$1", "_", "choice$subexpression$1", "_", "oneline", "__", "choice$subexpression$2", "_", "choice$ebnf$1", "_", "choice$ebnf$2", "_", "choice$subexpression$3", "_", "choice$string$2", "_"], "postprocess": 
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
        },
    {"name": "LN$ebnf$1", "symbols": [/[a-zA-Z0-9]/]},
    {"name": "LN$ebnf$1", "symbols": ["LN$ebnf$1", /[a-zA-Z0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "LN", "symbols": ["LN$ebnf$1"], "postprocess": function(d) {return d[0].join("")}},
    {"name": "LNS$ebnf$1", "symbols": [/[a-zA-Z0-9 ]/]},
    {"name": "LNS$ebnf$1", "symbols": ["LNS$ebnf$1", /[a-zA-Z0-9 ]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "LNS", "symbols": ["LNS$ebnf$1"], "postprocess": function(d) {return d[0].join("")}},
    {"name": "int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$1", "symbols": ["int$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "int", "symbols": ["int$ebnf$1"], "postprocess": function(d) {return d[0].join("")}},
    {"name": "oneline$ebnf$1", "symbols": [/[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[= |]/]},
    {"name": "oneline$ebnf$1", "symbols": ["oneline$ebnf$1", /[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[= |]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "oneline", "symbols": ["oneline$ebnf$1"], "postprocess": function(d) {return d[0].join("")}},
    {"name": "text$ebnf$1", "symbols": [/[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]/]},
    {"name": "text$ebnf$1", "symbols": ["text$ebnf$1", /[a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "text", "symbols": ["text$ebnf$1"], "postprocess": function(d) {return d[0].join("")}},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "_N$ebnf$1", "symbols": []},
    {"name": "_N$ebnf$1", "symbols": ["_N$ebnf$1", /[\r\t ]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_N", "symbols": ["_N$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "__", "symbols": [{"literal":" "}]}
]
  , ParserStart: "section"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
    module.exports = sectionG;
} else {
    IF.grammar.section = sectionG;
}
})();
