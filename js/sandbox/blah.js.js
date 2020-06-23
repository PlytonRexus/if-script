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
    constructor(name, sections, passages, { referrable, startAt }) {
        this.name = name.trim();
        this.sections = sections;
        this.passages = passages;
        this.settings = {};
        this.settings.referrable = referrable;
        this.settings.startAt = startAt;
    }

    findSection(serial) {
        let index = this.sections.findIndex(section => {
            return section.serial === serial ? true : false;
        });
        return this.sections[index];
    }

    findPassage(serial) {
        let index = this.passages.findIndex(passage => {
            return passage.serial === serial ? true : false;
        });
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
    constructor(title, text, choices, serial) {
        this.title = title.trim();
        this.text = text.trim();
        this.choices = choices;
        this.serial = serial;
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
    constructor(owner, target, text) {
        this.text = text.trim();
        this.owner = owner;
        this.target = target;
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

/* Regexs */
let sectionRegex = /ss>[a-zA-Z0-9"'-_:;\/\s!\*#]+?<ss/g;
let commentRegex = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm; // /\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/ /\/\*(\*(?!\/)|[^*])*\*\//g
let passageRegex = /pp>[a-zA-Z0-9"'-_:;\/\s!\*#]+?<pp/g;
let titleRegex = /tt>[A-Za-z0-9 ']+?<tt/g;
let paraRegex = />>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<</g; // One paragraph of text.
let choiceRegex = /ch>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]]+?<ch/g; // One choice.
let choiceTargetRegex = /\[\[[0-9]+\]\]/g;
let settingsRegex = /settings>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<settings/;
let referrableRegex = /@referrable (true)|(false)/;
let startAtRegex = /@startAt [0-9]+/;

/**
 * Parses raw text (in IF syntax) into a Story instance.
 *
 * @param {string} text whole text of story
 * @returns {Story} a Story object
 */
function parseText(text) {
    text = text.replace(commentRegex, "");

    let settings = text.match(settingsRegex);
    settings = settings ? settings[0] : "";
    let { referrable, startAt } = parseSettings(settings);
    text = text.replace(settingsRegex, "");
    
    let serial = 0;
    let sectioned = (text.match(sectionRegex) || [])
    .map(section => {
        serial += 1;
        return parseSection(section, serial);
    });
    // if (sectioned === []) 
    // throw Error({ "message": "Atleast one section is required.", "code": "1" });

    text = text.replace(sectionRegex, "");

    let passaged = (text.match(passageRegex) || [])
    .map(passage => parsePassage(passage));

    let story = new Story(Date.now().toString(), sectioned, passaged, { referrable, startAt });

    return story;
}
/**
 * Parses a section string into a Section Instance.
 *
 * @param {string} section String of the section that is to be parsed
 * @param {number} serial The serial order of the section to be parsed
 * @returns {Section} Instance of Section
 */
function parseSection(section, serial) {
    section = section.replace(/ss>/gi, "").replace(/<ss/gi, "");

    let title = section.match(titleRegex) ? section.match(titleRegex)[0] : null || "";

    // if (title === "") 
    // throw Error(({ "message": "A title for each section is required!", "code": "3" }));

    title = title.replace(/tt>/, "").replace(/<tt/, "");

    section = section.replace(titleRegex, "");

    let text = "";

    (section.match(paraRegex) || [])
    .forEach(para => {
        para = para.replace(/>>/, "").replace(/<</, "");
        para = `<p>${para}</p>`;
        text += para;
    });

    let choices = (section.match(choiceRegex) || [])
    .map(choice => {
        choice = choice.replace(/ch>/, "").replace(/<ch/, "");
        let target = choice.match(choiceTargetRegex);
        target = target ? target[0] : "";

        // if (target = "") 
        // throw Error({ "message": "Choice target invalid or not present.", "code": "4" });

        target = target.replace(/\[\[/, "").replace(/\]\]/, "");
        target = parseInt(target, 10);

        choice = choice.replace(choiceTargetRegex, "");
        return new Choice(serial, target, choice);
    });

    return new Section(title, text, choices, serial);
}
/**
 * Parse text string into settings object
 *
 * @param {string} settingsString
 * @returns object { referrable, startAt }
 */
function parseSettings(string) {
    string = string.replace(/settings>/, "").replace(/<settings/, "");
    let referrable = string.match(referrableRegex);

    referrable = referrable ? referrable[0].replace(/@referrable /, "") : "";
    referrable = referrable === "true" ? true : false;

    let startAt = string.match(startAtRegex);
    startAt = parseInt(startAt[0].replace(/@startAt /, "")) ? parseInt(startAt[0].replace(/@startAt /, "")) : 1;

    return { referrable, startAt };
}