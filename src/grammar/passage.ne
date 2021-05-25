@{%
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
    constructor(title, text, serial) {
        super(title, text, [], serial);
    }

    get type() {
        return 'Passage';
    }
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
        return new Passage(title, text, 1)
    }
%}

# Letters, numbers.
LN -> [a-zA-Z0-9]:+                                {% function(d) {return d[0].join("")} %}

# Letters, numbers and space.
LNS -> [a-zA-Z0-9 ]:+                              {% function(d) {return d[0].join("")} %}

# Integer
int -> [0-9]:+                                     {% function(d) {return d[0].join("")} %}

# Text spanning one line
oneline -> [a-zA-Z0-9#$@%\(\)\{\}!&\]\[= ]:+       {% function(d) {return d[0].join("")} %}

# Text spanning paragraphs
text -> [a-zA-Z0-9#$@%\(\)\{\}!&\]\[=\s]:+         {% function(d) {return d[0].join("")} %}

# Whitespace
_ -> [\s]:*                                        {% function(d) {return null } %}
_N -> [\r\t ]:*                                    {% function(d) {return null } %}
__ -> " "