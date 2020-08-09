var ua = window.navigator.userAgent.toLowerCase();
var isIE = !!ua.match(/msie|trident\/7|edge/);

let IF = {};
IF.story = {};
IF.grammar = {};
IF.state = {};
IF.DEBUG = true;

class IFError {
    constructor(str = "", code, dontLogInstantly) {
        this.message = str;
        this.expectedLine = this.message.split("\n")[2];
        this.code = code || null;
        if (!dontLogInstantly) this.log();
    }

    log() {
        console.log("Error at:\n", this.expectedLine);
    };
}

let clickEvent = new Event('click');

let instructions = 
`/* 
Welcome to this IF tutorial! 
Press Parse Text to run the live preview of this tutorial.
The download JS, CSS, Story and Story text buttons download different parts of the story to your device.
*/

/*------------------------------------------*/

/*
To embed this story on your website, put this in your html file:
<link rel="stylesheet" href="if_r.css">

<div id="if_r-output-area"></div>

<script src="Story.js"></script>
<script src="if_r-terp.js"></script>
<script>
loadStory(IF.story);
loadSection(null, IF.story.settings.startAt);
</script>
*/

/*------------------------------------------*/

/* Each story can have special settings that decide how it ultimately behaves. These are optional and can be written as follows. */

/*------------------------------------------*/

settings>
@referrable false 

/* referrable persists older sections in the viewport */

@startAt 1 

/* startAt decides the section where your story starts */

@fullTimer 30000 [[3]]

/* fullTimer sets the whole story on a timeout */

/* Global variables that are visible everywhere */

\${title='Freezion'}
\${new=new}
\${ten=10}

<settings

/*------------------------------------------*/

/* Use "ss>" to start a section.
Use "<ss" to end a section. */

ss> 

/* Section serial 1. Sections are read in the order they are declared. */
/* Use "tt>" and "<tt" to give titles to sections. Be careful, each section requires a section title and only the first title that you give will be parsed. You can have multiple sections with the same title. */

secset>
    @timer 5000 [[3]]
<secset

tt>The first section <tt

/* Divide the content of sections in paragraphs like this. */
This is the __first__ paragraph of the first section
This is the second paragraph of the same section
/* Each paragraph can be formatted through HTML syntax.
This means that you can use most HTML elements like img and iframe inside them. */

/* Display each section's choices this way */
ch> Go to next section [[2]]<ch /* The number inside the square brackets represents the section serial that the choice must lead to */
ch> Go to the section next to the next section [[3]]<ch
ch> Input Choice: __input \${__one} [[3]] <ch
<ss

ss> /* Section serial 2. */
tt>The second section <tt

This is the first paragraph of the second section
This is the second paragraph of the same section
ch> Go to previous section [[1]]<ch
ch> Go to next section [[3]] <ch
<ss

ss> /* Section serial 3. */
tt>The third \${title}<tt

This is the first paragraph of the third \${one}
This is the second paragraph of the same section
ch> Go to previous section [[2]] <ch
ch> 10 \${__one} [[1]] <ch
/* Hello, from a comment! */
<ss`;

let statsInstructions = `
/*
This is a stub. Will get to this as soon as possible!
*/`;

let helpHtml = `
<h3>Help</h3>
<div class="code" id="alerts-area"></div>

<p class="plain-text">
Press &#9654; Run to run the live preview of the story.
</p>

<p class="plain-text"> 
You can use Markdown to format your story.
<a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer noopener"> Markdown cheat-sheet </a>
</p>

<h3 id="embed-scripts"><a href="#embed-scripts">Embedding</a></h3>
<p class="plain-text">Within the head tag, add the following.</p>
<div class="highlighted">   
    &lt;link rel=&quot;stylesheet&quot; href=&quot;downloadable/if_r.css&quot;&gt;
</div>

<p class="plain-text">In your body, add the following scripts.</p>
<div class="highlighted">
    &lt;div id=&quot;if_r-output-area&quot;&gt;&lt;/div&gt;
    <br/> 
    &lt;script src=&quot;tests/Story.js&quot;&gt;&lt;/script&gt;
    <br/>    
    &lt;script src=&quot;downloadable/if_r-terp.js&quot;&gt;&lt;/script&gt;
    <br/>    
    &lt;script src=&quot;js/lib/showdown.min.js&quot;&gt;&lt;/script&gt;    
    <br/>
    &lt;script&gt;
        IF.methods.loadStory(IF.story);
    &lt;/script&gt;

</div>

<p class="plain-text"><em>The indentation does not matter.</em></p>

<h3 id="comment-syntax"><a href="#comment-syntax">Comments</a></h3>
<p class="plain-text">
A comment is a text block that is not integrated into the final model of the story.
Comments exist to help write cleaner stories.
For example, by pointing out purposes of certain portions of the story.
<div class="code">
/*
A
<br/>
multi-line
<br/>
comment
*/
</div>

<h3 id="variable-syntax"><a href="#variable-syntax">Variables</a></h3>
<p class="plain-text">
Variables truly create dynamic stories.
You can use variables to store a lot of things like character names, 
inventory items, visited scenes, number of things and many others.
You can then display the values of these variables anywhere like so:
</p>

<div class="code">
Your name is \${name}.
</div>

<p class="plain-text">
Obviously, here, variable <code>name</code> was used to store the name of a character.
<br/>
The variables can also be used in conditional logic to determine which <a href="#choice-syntax">choices</a> 
and (in a future release) what paragraphs of a <a href="#section-syntax">section's</a> 
text should be visible to the reader.
You can find more about this under the <a href="#choice-syntax">choices</a> heading.
<br/>

<p class="plain-text">
You can assign variables beforehand inside story <a href="#settings-syntax">settings</a>.
</p>

<div class="code">
\${name='Felicity'}
</div>

<em>It is recommended (albeit not required) to keep the </em>
<code>title</code><em> variable set as the title of the story.</em>
</p>

<h3 id="settings-syntax"><a href="#settings-syntax">Story Settings</a></h3>
<p class="plain-text">
Story settings allow you to customise the overall experience of the story.
All of the settings are optional.
The available settings are:
<ul>
<li class="plain-text"><code>@startAt</code> decides the starting section of a story. (Default: 1)
<li class="plain-text"><code>@referrable</code> decides if the older sections remain visible once the reader moves to a new section. (Default: false)
<li class="plain-text"><code>@fullTimer</code> decides the amount of time alloted for completing a story. (Default: none)
</ul>
</p>
<div class="code">
settings&gt;
<br/>
&nbsp;&nbsp;@startAt <section_number>
<br/>
&nbsp;&nbsp;@referrable <true/false>
<br/>
&nbsp;&nbsp;@fullTimer 
<br/>
&lt;settings
</div>

<h3 id="scene-syntax"><a href="#scene-syntax">Scenes</a></h3>
<p class="plain-text">
Scenes are collections of <a href="#scene-syntax">sections</a>
<div class="code">
    scene&gt;
    <br/>
    &nbsp;&nbsp;@first section_number (optional)
    <br/>
    &nbsp;&nbsp;@music link (optional)
    <br/>
    &nbsp;&nbsp;@sections space_seperated_section_numbers
    <br/>
    &nbsp;&nbsp;@name custom_name_for_scene
    <br/>
    &lt;scene
</div>

<h3 id="section-syntax"><a href="#section-syntax">Sections</a></h3>
<p class="plain-text">
    Sections are independent locations/situations in a story. 
    These can be reached through <a href="#choice-syntax">choices</a>.
    Each section can have its own set of settings that allow it to have separate timers
    that send the reader to a separate section if they do not choose within specified time,
    and its own music. These features are particularly helpful in dramatic situations.
</p>
<div class="code">
    ss&gt;
    <br/>
    &nbsp;&nbsp;tt&gt; Section Title &lt;tt
    <br/>
    &nbsp;&nbsp;Section text.
    <br/>
    &nbsp;&nbsp;In paragraphs.
    <br/>
    &nbsp;&nbsp;You can use variables here.
    <br/>
    &nbsp;&nbsp;/* 
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;You can write choices about now.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;Read on to find out how to create them.
    <br/>
    &nbsp;&nbsp;*/
    <br/>
    &lt;ss
</div>

<h3 id="choice-syntax"><a href="#choice-syntax">Choices</a></h3>
<p class="plain-text">
    Choice are the sole method to navigate a story by reaching
    <a href="#section-syntax">sections</a> or <a href="#scene-syntax">scenes</a>.
    To send to a section:
</p>
<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;You are named five [[5]]
    <br/>
    &lt;ch
</div>

<p class="plain-text">
To send to the beginning of a scene:
</p>
<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;You are named five [[scene:5]]
    <br/>
    &lt;ch
</div>

<p class="plain-text">
Choices can assign variables.
</p>

<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;Choose 'Felicity' as your name \${__name} [[5]]
    <br/>
    &lt;ch
</div>

<p class="plain-text">
Choices can also have input boxes. These input boxes can be used to
take in custom values from the user and then stored in variables for 
later use.
</p>

<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;Type in your name here: __input \${__name} [[5]]
    <br/>
    &lt;ch
</div>

<p class="plain-text">
Choices can have conditions. Only if these conditions are met is the choice displayed.
Available operators are:
<ul>
    <li class="plain-text"> <code> var1 == var2</code> &nbsp; Both are equal
    <li class="plain-text"> <code> var1 != var2</code> &nbsp; Both are inequal
    <li class="plain-text"> <code> var1 >= var2</code> &nbsp; First is greater than or equal to second
    <li class="plain-text"> <code> var1 <= var2</code> &nbsp; Second is greater than or equal to first
    <li class="plain-text"> <code> var1 >&nbsp; var2</code> &nbsp; First is greater than second
    <li class="plain-text"> <code> var1 <&nbsp; var2</code> &nbsp; Second is greater than first
</ul>
</p>

<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;\${__if name == "" || namePower <= 0} 
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;Type in your name here __input \${__name} [[5]]
    <br/>
    &lt;ch
</div>

<p class="plain-text">
Choices can also do actions like
</p>
<ul>
    <li class="plain-text"> <code>\${__var1 = var2}</code> &nbsp; Assignment
    <li class="plain-text"> <code>\${__var1 + var2}</code> &nbsp; Addition
    <li class="plain-text"> <code>\${__var1 - var2}</code> &nbsp; Subtraction
    <li class="plain-text"> <code>\${__var1 * var2}</code> &nbsp; Multiplication
    <li class="plain-text"> <code>\${__var1 / var2}</code> &nbsp; Division
</ul>
<p class="plain-text">
In each of these, the first variable is assigned values that result from the operation.
</p>

<div class="code">
    ch&gt;
    <br/>
    &nbsp;&nbsp;The power of your name goes up 10 units and your health 
    is multiplied \${namePower} times.
    <br/>
    &nbsp;&nbsp;\${__namePower + 10} \${__health * namePower} [[5]]
    <br/>
    &lt;ch
</div>
`;