@{%
class Scene {
    constructor(sections, { first, name, music, serial }) {
        if (!(sections instanceof Array)) {
            throw new IFError("Unexpected argument supplied." + sections + "is not an array.");
        }

        this.sections = sections;
        this.first = parseInt(first) || sections[0];

        this.name = name || "Untitled";
        this.music = music;
        this.serial = serial || 1;
    }
}
%}

scene -> "scene>" _ 
(("@first " _ LN _):? 
("@music " _ nospace _):?  
("@sections " _ (LN __):+ _) 
("@name " _ LNS _):?) _ 
"<scene"
{%
function(d) {
    let sections = [];
    d[2][2][2].forEach(ele => {if (parseInt(ele)) sections.push(parseInt(ele))});
    let first = sections[0];
    if (d[2][0]) {
        first = d[2][0][2];
    }
    let music = null;
    if (d[2][1]) {
        music = d[2][1][2];
    }

    let name;
    if (d[2][3]) {
        name = d[2][3][2];
    }
    return new Scene(sections, { music, first, name });
}
%}

# Letters, numbers.
LN -> [a-zA-Z0-9]:+                                {% function(d) {return d[0].join("")} %}

# Letters, numbers and space.
LNS -> [a-zA-Z0-9 ]:+                              {% function(d) {return d[0].join("")} %}

# Integer
int -> [0-9]:+                                     {% function(d) {return d[0].join("")} %}

# Text spanning one line
oneline -> [a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[= |]:+       {% function(d) {return d[0].join("")} %}

# Text spanning paragraphs
text -> [a-zA-Z0-9#$@`'"_.%\(\)\{\}|?;:!&\]+*-/\[=\s|]:+         {% function(d) {return d[0].join("")} %}

# One line without space
nospace -> [a-zA-Z0-9#$.@`'"_%\(\)\{\}|?;:!&\]+*-/\[=|]:+       {% function(d) {return d[0].join("")} %}

# Whitespace
_ -> [\s]:*                                        {% function(d) {return null } %}
_N -> [\r\t ]:*                                    {% function(d) {return null } %}
__ -> " "