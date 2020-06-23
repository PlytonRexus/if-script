function createjs() {
    let js = `const story = ${JSON.stringify(IF.story)}`;
    js += 'function generateHTML (story) {\
       const { name, sections, passages } = story;\
       let wrapper = ``;\
       wrapper += `<h2>${name} - New Story</h2>`;\
       document.title = `${name} | IF`;\
       sections.forEach(section => {wrapper += generateHTMLForSection(section);});\
       return wrapper;\
   }\
   function generateSectionBySerial(serial) {\
       let section = IF.story.findSection(parseInt(serial));\
       return generateHTMLForSection(section);\
   }\
   function generateHTMLForSection(section) {\
       let wrapper = ``;\
       let { title, choices, text, serial } = section;\
       wrapper += `<div class="if_r-section" id="section-${serial}">`;\
       wrapper += `<h3 class="if_r-section-title">${title}</h3>`;\
       wrapper += `<div class="if_r-paras">${text}</div>`;\
       wrapper += `<ul class="if_r-section-choices-list" id="section-${serial}-choices">`;\
       let i = 0;\
       choices.forEach(choice => {\
           let { target, owner } = choice;\
           i += 1;\
           wrapper += `<li class="if_r-section-choice-li"><a class="if_r-section-choice" data-if_r-target="${target}" data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}">${choice.text}</a></li>`;\
       });\
       wrapper += `</ul>`;\
       wrapper += `</div>`;\
       return wrapper;\
   }\
   function switchSection(target) {\
       loadSection(generateSectionBySerial(target));\
   }\
   function loadSection(sectionHTML, serial) {\
       if (!IF.story.settings.referrable) {\
           replaceSection(sectionHTML, serial);\
       } else {\
           appendSection(sectionHTML, serial);\
       }\
   }\
   function replaceSection(sectionHTML, serial) {\
       if (serial) document.querySelector("#if_r-output-area").innerHTML = generateSectionBySerial(serial);\
       else {\
           document.querySelector("#if_r-output-area").innerHTML = sectionHTML;\
       }\
       setListenersOnChoices();\
   }\
   function appendSection(sectionHTML, serial) {\
       if (serial) document.querySelector("#if_r-output-area").innerHTML = generateSectionBySerial(serial);\
       else {\
           document.querySelector("#if_r-output-area").innerHTML += sectionHTML;\
       }\
       setListenersOnChoices();\
   }\
   function setListenersOnChoices () {\
       document.querySelectorAll(".if_r-section-choice").forEach(choice => {\
           choice.onclick = (e) => {\
               e.preventDefault();\
               if (IF.story.settings.referrable) choice.onclick = "";\
               switchSection(e.target.getAttribute("data-if_r-target"));\
           };\
       });\
   }\
   function loadStory(story) {\
       IF.story = story;\
   }';

    js += 'loadStory(story);';
    js += 'loadSection(null, IF.story.settings.startAt);';

    return js;
}

function createcss() {
    let css = `
    .if_r-section {
        padding: 10px 0 10px 0;
    }
    
    .if_r-section-choices-list {
        list-style: none;
    }
    
    .if_r-section-choice {
        text-decoration: underline;
        color: black;
    }
    
    .if_r-section-choice:hover {
        text-decoration: none;
        cursor: pointer;
        padding: 1px;
        background: rgba(0, 0, 0, 0.2);
    }`;

    return css;
}