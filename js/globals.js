var ua = window.navigator.userAgent.toLowerCase();
var isIE = !!ua.match(/msie|trident\/7|edge/);

let lorem = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Nisi provident numquam sapiente iure culpa dolorem at, hic, qui fugiat sunt magnam temporibus rerum dicta, in obcaecati maxime consequuntur molestias est? <br />`
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
<code id="alerts-area"></code>

<p>
Press &#9654; or Run to run the live preview of the story.
</p>

<p> 
<strong> You can use Markdown to format your story. </strong>
<br />
<a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer noopener"> Markdown cheat-sheet </a>
</p>

<p>Within the head tag, add the following.</p>

<div class="highlighted">   
    &lt;link rel=&quot;stylesheet&quot; href=&quot;downloadable/if_r.css&quot;&gt;
</div>

<p>In your body, add the following scripts.</p>

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
`;

let IF = {};
IF.story = {};
IF.grammar = {};
IF.state = {};

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