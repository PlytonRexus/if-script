var ua = window.navigator.userAgent.toLowerCase();
var isIE = !!ua.match(/msie|trident\/7|edge/);

let lorem = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Nisi provident numquam sapiente iure culpa dolorem at, hic, qui fugiat sunt magnam temporibus rerum dicta, in obcaecati maxime consequuntur molestias est? <br />`
let instructions = 
`/* 
Welcome to this IF tutorial! 
Press Parse Text to run the live preview of this tutorial.
The download JS, CSS, Story and Story text buttons download different parts of the story to your device.
*/

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

/* Each story can have special settings that decide how it ultimately behaves. These are optional and can be written as follows. */
settings>
@referrable false /* referrable persists older sections in the viewport */
@startAt 2 /* startAt decides the section where your story starts */
@fullTimer 300 [[3]]
\${title=this}
\${new=new}
\${ten=10}
<settings

/* Use "ss>" to start a section.
Use "<ss" to end a section. */

ss> 

/* Section serial 1. Sections are read in the order they are declared. */
/* Use "tt>" and "<tt" to give titles to sections. Be careful, each section requires a section title and only the first title that you give will be parsed. You can have multiple sections with the same title. */

secset>
    @timer 5 [[3]]
<secset

tt>The first section <tt

/* Divide the content of sections in paragraphs like this. */
This is the first paragraph of the first section
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


let IF = {};
IF.grammar = {};
IF.state = {};