# IF-SCRIPT
An extremely simple syntax for writing interactive fiction that can be embedded in any website.

Make interactive fiction with variables, timers, conditions, music and statistics. The story is parsed into plain HTML, CSS and JavaScript.

[Try it!](https://plytonrexus.github.io/if-script/)

You can use Markdown to format your story. 
_[Markdown cheat-sheet](https://www.markdownguide.org/cheat-sheet/) for reference._

### Dependencies
[Nearley](https://github.com/kach/nearley) for parsing.
[Showdown](https://github.com/showdownjs/showdown) for markdown rendering.

A Regular Expression based parser is on the [if-script-regex](https://github.com/PlytonRexus/if-script/tree/if-script-regex) branch.

### [Embedding](#embedding)

Within the head tag, add the following.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/plytonrexus/if-script@v0.4-alpha/downloadable/if_r.css">
```

In your body, add the following scripts.

```html
<div id="if_r-output-area"></div>
<script src="Story.js"></script>
<script src="https://cdn.jsdelivr.net/gh/plytonrexus/if-script@v0.4-alpha/js/if_r-terp.js"></script>
<script src="https://cdn.jsdelivr.net/npm/showdown@1.9.1/dist/showdown.min.js"></script>
<script> IF.methods.loadStory(IF.story); </script>
```

*The indentation does not matter.*

### [Comments](#comments)

A comment is a text block that is not integrated into the final model of the story. Comments exist to help write cleaner stories. For example, by pointing out purposes of certain portions of the story.
```
/* A
 multi-line
 comment */
 ```

### [Variables](#variables)

Variables truly create dynamic stories. You can use variables to store a lot of things like character names, inventory items, visited scenes, number of things and many others. You can then display the values of these variables anywhere like so:
```
Your name is ${name}.
```
Obviously, here, variable `name` was used to store the name of a character.
 The variables can also be used in conditional logic to determine which [choices](#choice-syntax) and (in a future release) what paragraphs of a [section's](#section-syntax) text should be visible to the reader. You can find more about this under the [choices](#choice-syntax) heading.

You can assign variables beforehand inside story [settings](#settings-syntax).

```
${name='Felicity'}
```

 *It is recommended (albeit not required) to keep the* `title`*variable set as the title of the story.*

### [Story Settings](#story-settings)

Story settings allow you to customise the overall experiance of the story. All of the settings are optional. The available settings are:

-   `@startAt` decides the starting section of a story. (Default: 1)
-   `@referrable` decides if the older sections remain visible once the reader moves to a new section. (Default: false)
-   `@fullTimer` decides the amount of time alloted for completing a story. (Default: none)
```
settings>
   @startAt
   @referrable
   @fullTimer
<settings
```

### [Scenes](#scenes)

Scenes are collections of [sections](#scene-syntax)
```
scene>
   @first section_number (optional)
   @music link (optional)
   @sections space_seperated_section_numbers
   @name custom_name_for_scene
 <scene
````
### [Sections](#section-syntax)

Sections are independent locations/situations in a story. These can be reached through [choices](#choice-syntax). Each section can have its own set of settings that allow it to have separate timers that send the reader to a separate section if they do not choose within specified time, and its own music. These features are particularly helpful in dramatic situations.
```
ss>
   tt> Section Title <tt
   Section text.
   In paragraphs.
   You can use variables here.
   /*
     You can write choices about now.
     Read on to find out how to create them.
   */
<ss
```
### [Choices](#choices)

Choice are the sole method to navigate a story by reaching [sections](#section-syntax) or [scenes](#scene-syntax). To send to a section:
```
ch>
   You are named five [[5]]
<ch
```
To send to the beginning of a scene:
```
ch>
   You are named five [[scene:5]]
<ch
```
Choices can assign variables.
```
ch>
   Choose 'Felicity' as your name ${__name} [[5]]
 <ch
```
Choices can also have input boxes. These input boxes can be used to take in custom values from the user and then stored in variables for later use.
```
ch>
   Type in your name here: __input ${__name} [[5]]
<ch
```
Choices can have conditions. Only if these conditions are met is the choice displayed. Available operators are:

-   ` var1 == var2`   Both are equal
-   ` var1 != var2`   Both are inequal
-   ` var1 >= var2`   First is greater than or equal to second
-   ` var1 <= var2`   Second is greater than or equal to first
-   ` var1 >  var2`   First is greater than second
-   ` var1 <  var2`   Second is greater than first
```
ch>
   ${__if name == "" || namePower <= 0}
     Type in your name here __input ${__name} [[5]]
<ch
```
Choices can also do actions like addition (+), subtraction (-), multiplication (\*) and division (/) on variables.

- `${__var1 = var2}` Assignment
- `${__var1 + var2}` Addition
- `${__var1 - var2}` Subtraction
- `${__var1 * var2}` Multiplication
- `${__var1 / var2}` Division

In each of these, the first variable is assigned values that result from the operation.
```
ch>
   The power of your name goes up 10 units and your health 
    is multiplied \${namePower} times.
   ${__namePower + 10} ${__health * namePower} [[5]]
<ch
```
