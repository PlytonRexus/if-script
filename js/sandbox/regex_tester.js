let text1= `Welcome to this IF tutorial!

/* Use "@@" to start a section.
Use "$$" to end a section. */

Like this:
@@ Section 1 $$`;

let text = `
/* Welcome to this IF tutorial! */

@referrable true
@startAt 123

/* Use "@@" to start a section.
Use "$$" to end a section. */

ss>
tt>The first section <tt
>>This is the first paragraph of the first section << >>This is the second paragraph of the same section <<
ch> Go to next section [[2]]<ch
ch> Go to the section next to the next section [[3]]<ch
<ss

ss>
tt>The second section <tt
>>This is the first paragraph of the second section <<
>>This is the second paragraph of the same section <<
ch> Go to previous section [[1]]<ch
ch> Go to next section [[3]] <ch
<ss

ss>
tt>The third section<tt
>>This is the first paragraph of the third section <<
>>This is the second paragraph of the same section <<
ch> Go to previous section [[2]] <ch
ch> Go to the first section [[1]] <ch
/* Hello, from a comment! */
<ss`;

// let regex = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm; // /\/\*[a-zA-Z0-9_\\"'-\s\+\$\%!@]*\*\//g /\/\*.*?\*\//g /\/\*(\*(?!\/)|[^*])*\*\//g
// let regex = /ch>[a-zA-Z0-9"'-_:;\/\s!\]\[\*#]+<ch/g;
// let regex= />>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<</g;
// let regex = /@referrable (true)|(false)/;
let regex = /@startAt [0-9]+/;

console.log("test:", regex.test(text));
console.log("match:", text.match(regex));
console.log("replaced:", text.replace(regex, ""));
// console.log("text:", text);

// let commentRegex = /\/\*[a-zA-Z0-9_\\"'-\s\+\$\%]*\*\//g;

// let decommented = text.replace(commentRegex, "");
// console.log(decommented);