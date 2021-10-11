/*! For license information please see 785.c72c866c8363a4ec647f.bundle.js.LICENSE.txt */
"use strict";(self.webpackChunkif_script=self.webpackChunkif_script||[]).push([[785],{291:(t,e,s)=>{s.d(e,{Z:()=>i});const i={"=":1,"||":2,"&&":3,"<":7,">":7,"<=":7,">=":7,"==":7,"!=":7,"+":10,"-":10,"*":20,"/":20,"%":20}},139:(t,e,s)=>{s.d(e,{Z:()=>i});const i={ASSIGNMENT:"=",LOGICAL_OR:"||",LOGICAL_AND:"&&",LESS:"<",GREATER:">",LEQUAL:"<=",GEQUAL:">=",EQUAL:"==",NOT_EQUAL:"!=",ADDITION:"+",SUBTRACTION:"-",MULTIPLICATION:"*",DIVISION:"/",MODULO:"%"}},665:(t,e,s)=>{s.d(e,{Z:()=>i});const i={SECTION_START:"SECTION_START",SECTION_END:"SECTION_END",CHOICE_START:"CHOICE_START",CHOICE_END:"CHOICE_END",PROPERTY_KW:"PROPERTY_KW",CONDITIONAL_KW:"CONDITIONAL_KW",OTHER_KW:"OTHER_KW",STRING:"STRING",VARIABLE:"VARIABLE",OPERATOR:"OPERATOR",PUNCTUATION:"PUNCTUATION",NUMBER:"NUMBER",NEWLINE_CHAR:"NEWLINE_CHAR",BOOLEAN:"BOOLEAN"}},903:(t,e,s)=>{s.d(e,{T:()=>i});const i={section:/ss>[a-zA-Z0-9`@"'-_:;\/\s!\*#\$\{\}]+?<ss/g,comment:/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm,passage:/pp>[a-zA-Z0-9"'-_:,\/\s!\*#;]+?<pp/g,title:/tt>[A-Za-z0-9 '\$\{\}]+?<tt/g,para:/>>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<</g,choice:/ch>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<ch/g,choiceTarget:/\[\[[0-9]+\]\]/g,settings:/settings>[a-zA-Z0-9"'-_:;\/\s!\*#\.\$\{\}]+?<settings/,referrable:/@referrable (true)|(false)/,startAt:/@startAt [0-9]+/,fullTimer:/@fullTimer [0-9]+ \[\[\d+\]\]/,sectionSettings:/secset>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<secset/,variable:/\$\{[a-zA-Z0-9=]+?\}/g,input:/__input/,secTimer:/@timer [0-9]+ \[\[\d+\]\]/,variableAssignment:/\$\{[a-zA-Z0-9]+?=[a-zA-Z0-9_ "'\(\)]+?\}/g,varValue:/[a-zA-Z0-9_ "\(\)]+/,setVarAsTarget:/\$\{__[a-zA-Z0-9_=]+?\}/g,html:/<\s*\w+[^>]*>(.*?)(<\s*\/\s*\w+>)|/g,scene:/scene>[a-zA-Z0-9"'-_:;@\/\s!\*#\$\{\}]+?<scene/gm}},513:(t,e,s)=>{s.d(e,{Z:()=>n});class i extends Error{constructor(){super(),this.type="IFError"}}const n=i},721:(t,e,s)=>{s.d(e,{Z:()=>r});var i=s(513);class n extends i.Z{constructor(t="",e,s,i){super(),this.message=t,this.line=this.message,this.col=s,i&&this.log()}log(){console.log((this.line,this.col?"at: "+this.line+":"+this.col:""))}}const r=n},546:(t,e,s)=>{s.d(e,{Z:()=>o});var i=s(291),n=s(608);class r{_class="Action";constructor(t,e,s,o,a){a?("string"==typeof a&&(a=JSON.parse(a)),Object.assign(this,a),"Action"===this.left._class?this.left=r.fromJson(this.left):"Token"===this.left._class&&(this.left=n.Z.fromJson(this.left)),"Action"===this.right._class?this.right=r.fromJson(this.right):"Token"===this.right._class&&(this.right=n.Z.fromJson(this.right))):(this.type=t,this.operator=e,this.left=s,this.right=o),this.precedence=i.Z[this.operator]}static fromJson(t){return new r(null,null,null,null,t)}}const o=r},858:(t,e,s)=>{s.d(e,{Z:()=>a});var i=s(546),n=s(608),r=s(72);class o{_class="Choice";constructor(t,e,s){if(s){"string"==typeof s&&(s=JSON.parse(s));let{owner:t,target:e,text:o,variables:a,mode:h,choiceI:p,condition:c,actions:l,input:u,targetType:T}=s;this.mode=h,this.text=o,this.owner=t,this.target=e,this.variables=a,this.choiceI=p,this.condition=c||null,this.actions=l,this.input="input"===this.mode?u:null,this.targetType=T||"section",this.actions=(this.actions||[]).map(i.Z.fromJson),this.text=(this.text||[]).map((t=>"Token"===t._class?n.Z.fromJson(t):"ConditionalBlock"===t._class?r.Z.fromJson(t):"Action"===t._class?i.Z.fromJson(t):void 0))}else{let{owner:s,target:i,text:n}=t,{variables:r,mode:o,choiceI:a,condition:h,actions:p,input:c,targetType:l}=e;this.mode=o,this.text=n,this.owner=s,this.target=i,this.variables=r,this.choiceI=a,this.condition=h||null,this.actions=p,this.input="input"===this.mode?c:null,this.targetType=l||"section"}}static fromJson(t){return new o({},{},t)}get type(){return this._class}set type(t){this._class=t}}const a=o},72:(t,e,s)=>{s.d(e,{Z:()=>a});var i=s(546),n=s(608),r=s(858);class o{_class="ConditionalBlock";constructor(t,e){e&&("string"==typeof e&&(e=JSON.parse(e)),"Action"===(t=e).cond._class&&(t.cond=i.Z.fromJson(t.cond)),t.then&&"Action"===t.then._class?t.then=i.Z.fromJson(t.then):t.then&&"ConditionalBlock"===t.then._class?t.then=o.fromJson(t.then):t.then&&"Token"===t.then._class?t.then=n.Z.fromJson(t.then):t.then&&"Choice"===t.then._class&&(t.then=r.Z.fromJson(t.then)),void 0!==t.else&&t.else&&"Action"===t.else._class?t.else=i.Z.fromJson(t.else):void 0!==t.else&&t.else&&"ConditionalBlock"===t.else._class?t.else=o.fromJson(t.else):void 0!==t.else&&t.else&&"Token"===t.else._class?t.else=n.Z.fromJson(t.else):void 0!==t.else&&t.else&&"Choice"===t.else._class&&(t.else=r.Z.fromJson(t.else)));const{cond:s,then:a}=t;this.cond=s,this.then=a,this.else=t.else}static fromJson(t){return new o({},t)}get type(){return this._class}set type(t){this._class=t}}const a=o},861:(t,e,s)=>{s.d(e,{Z:()=>r});var i=s(721);class n{_class="Scene";get type(){return this._class}set type(t){this._class=t}constructor(t,{first:e,name:s},n){if(n&&("string"==typeof n&&(n=JSON.parse(n)),t=n.sections,e=n.first,s=n.name),!(t instanceof Array))throw new i.Z("Unexpected argument supplied."+t+"is not an array.");this.sections=t,this.first=e||t[0],this.last=t?t[t.length-1]:null,this.name=s||"Untitled"}static fromJson(t){return new n([],{},t)}}const r=n},167:(t,e,s)=>{s.d(e,{Z:()=>p});var i=s(858),n=s(608),r=s(72),o=s(546),a=s(470);class h{_class="Section";constructor(t,e,s,h,p){p?("string"==typeof p&&(p=JSON.parse(p)),Object.assign(this,p),this.choices=this.choices.map((t=>i.Z.fromJson(t))),this.text=(this.text||[]).map((t=>"Token"===t._class?n.Z.fromJson(t):"ConditionalBlock"===t._class?r.Z.fromJson(t):"Action"===t._class?o.Z.fromJson(t):"Choice"===t._class?i.Z.fromJson(t):void 0)),this.settings=a.Z.fromJson(this.settings)):(this.text="string"==typeof t?t.trim():t,this.title=h.title,this.choices=e,this.serial=s,this.settings=h,this.identifier=h.identifier)}static fromJson(t){return new h({},{},{},{},t)}findChoice(t){let e,s=parseInt(t);return t&&(t=s),"number"==typeof t?e=this.choices.findIndex((e=>e.choiceI===t)):"string"==typeof t&&(e=this.choices.findIndex((e=>e.identifier?.toLowerCase()===t?.toLowerCase()))),-1===e&&(e=0),this.choices[e]}get type(){return this._class}set type(t){this._class=t}}const p=h},470:(t,e,s)=>{s.d(e,{Z:()=>r});var i=s(13);class n extends i.Z{_class="SectionSettings";get type(){return this._class}set type(t){this._class=t}constructor(t,e){e&&("string"==typeof e&&(e=JSON.parse(e)),t=e),super(t),this.timer=t.timer,this.title=t.title,this.variables={}}static fromJson(t){return new n({},t)}}const r=n},13:(t,e,s)=>{s.d(e,{Z:()=>n});class i{_class="Settings";get type(){return this._class}set type(t){this._class=t}constructor(t,e){e?("string"==typeof e&&(e=JSON.parse(e)),this.input=e.input):this.input=t}static fromJson(t){return new i({},t)}}const n=i},207:(t,e,s)=>{s.d(e,{Z:()=>a});var i=s(167),n=s(861),r=s(146);class o{_class="Story";get type(){return this._class}set type(t){this._class=t}constructor(t,{sections:e,passages:s,scenes:o},a,{globals:h,stats:p},c){c?("string"==typeof c&&(c=JSON.parse(c)),Object.assign(this,c),this.sections=this.sections.map((t=>i.Z.fromJson(t))),this.scenes=this.scenes.map((t=>n.Z.fromJson(t))),this.settings=r.Z.fromJson(this.settings)):(this.name=t.trim(),this.sections=e||[],this.passages=s||[],this.scenes=o||[],this.settings=a,this.variables={},h&&Object.keys(h).forEach((t=>{this.variables[t]=h[t]})),this.persistent=this.variables,this.stats=p)}static fromJson(t){return new o({},{},{},{},t)}findSection(t){let e;return"number"==typeof t?e=this.sections.findIndex((e=>e.serial===t)):"string"==typeof t&&(e=this.sections.findIndex((e=>e.identifier?.toLowerCase()===t?.toLowerCase()))),-1===e&&(console.warn("No section "+t+" found. Reverting to default section serial 1."),e=0),this.sections[e]}findScene(t){let e;return"number"==typeof t?e=this.scenes.findIndex((e=>e.serial===t)):"string"==typeof t&&(e=this.scenes.findIndex((e=>e.identifier?.toLowerCase()===t?.toLowerCase()))),-1===e&&(console.warn("No scene "+t+" found. Reverting to default scene serial 1."),e=0),this.scenes[e]}findPassage(t){let e=this.passages.findIndex((e=>e.serial===t));return-1===e&&(console.warn("No passage "+t+" found. Reverting to default passage serial 1."),e=0),this.passages[e]}}const a=o},146:(t,e,s)=>{s.d(e,{Z:()=>r});var i=s(13);class n extends i.Z{_class="StorySettings";get type(){return this._class}set type(t){this._class=t}constructor(t,e){e&&("string"==typeof e&&(e=JSON.parse(e)),t=e),super(t);const{referrable:s,name:i}=this.input;this.startAt=this.input.startAt||0,this.fullTimer=this.input.fullTimer||null,this.referrable=s||!1,this.name=i}static fromJson(t){return new n({},t)}}const r=n},608:(t,e,s)=>{s.d(e,{Z:()=>n});class i{_class="Token";constructor(t,e){e&&("string"==typeof e&&(e=JSON.parse(e)),t=e);const{type:s,symbol:i,id:n,line:r,col:o}=t;this.type=t.type,this.symbol=t.symbol,this.id=t.id,this.line=t.line,this.col=t.col}static fromJson(t){return new i(null,t)}}const n=i},785:(t,e,s)=>{s.r(e),s.d(e,{default:()=>x});var i=s(665);const n={SECTION_START:"section__",SECTION_END:"__section",IMPORT_START:"import__",IMPORT_END:"__import",SCENE_START:"scene__",SCENE_END:"__scene",SETTINGS_START:"settings__",SETTINGS_END:"__settings",SECTION_SETTINGS_START:"secset__",SECTION_SETTINGS_END:"__secset",CHOICE_START:"choice__",CHOICE_END:"__choice",IF_BLOCK_START:"if__",IF_BLOCK_END:"__if",THEN:"then__",ELSE_BLOCK_START:"else__",ELSE_BLOCK_END:"__else",PROP_START_AT:"@startAt",PROP_REFERRABLE:"@referrable",PROP_FULL_TIMER:"@fullTimer",PROP_IF_TITLE:"@storyTitle",PROP_IDENTIFIER:"@id",PROP_SCENE_FIRST:"@first",PROP_SCENE_MUSIC:"@music",PROP_SCENE_SECTIONS:"@sections",PROP_SCENE_NAME:"@name",PROP_SECTION_TITLE:"@title",PROP_SECTION_TIMER:"@timer",PROP_CHOICE_INPUT:"@input",PROP_CHOICE_TARGET:"@target",PROP_CHOICE_READ:"@read",PROP_CHOICE_ACTION:"@action",PROP_CHOICE_TARGET_TYPE:"@targetType",TRUE:"true",FALSE:"false",PROP_REQUIRE:"@require"};var r=s(167),o=s(861),a=s(207),h=s(291),p=s(146),c=s(470);const l="{",u="}",T="(",d=")";var _=s(139),E=s(858),f=s(546);class N{_class="Property";constructor(t,e="property",s){s&&("string"==typeof s&&(s=JSON.parse(s)),t=s,e=s.type);const{name:i,value:n}=t;this.name=t.name,this.value=t.value,this.type=e}static fromJson(t){return new N({},null,t)}}const m=N;var S=s(608),O=s(72),y=s(721);class I{constructor(t){this.input=t,this.peek.bind(this),this.next.bind(this),this.eof.bind(this),this.except.bind(this)}next(){}peek(){}eof(){}except(t){throw new y.Z(t)}[Symbol.iterator](){return{next:()=>{const t=this.next();return{value:t,done:!t}}}}}const C=I,g={identifierStart:/[a-zA-Z0-9_]/i,identifierBody:/_/,propStart:/@/,propName:/[a-zA-Z0-9]/i};var R=s(903);const Z=class extends C{constructor(t){super(t),this.removeComments(),this.current=null,this.validator=new class{constructor(){this.isOperatorChar.bind(this),this.isPropNameStart.bind(this),this.isIdentifier.bind(this),this.isWhiteSpace.bind(this),this.isDigit.bind(this),this.isPunctuation.bind(this),this.isKeyword.bind(this),this.isSectionEnd.bind(this),this.isPropName.bind(this)}isIdentifierStart=t=>g.identifierStart.test(t);isIdentifier=t=>this.isIdentifierStart(t)||g.identifierBody.test(t);isKeyword=t=>Object.keys(n).some((e=>n[e]===t));isWhiteSpace=t=>/[ \t\r]/.test(t);isDigit=t=>/[0-9]/i.test(t);isOperatorChar=t=>"+-*/%=&|<>!".indexOf(t)>=0;isPunctuation=t=>";(){}[]".indexOf(t)>=0;isSectionEnd=t=>0===t.indexOf(n.SECTION_END);isPropNameStart=t=>g.propStart.test(t);isPropName=t=>this.isPropNameStart(t)||g.propName.test(t)},this.id=0,this.lastToken=null,this.nextToken=null}peek(){return this.current}next(){return this.current=this.nextToken||this.readNext(),this.eof()||(this.nextToken=this.readNext()),this.current}eof(){return this.input.eof()}except(t){return this.input.except(t)}preview(){return this.nextToken}getTokenInstance(t,e){return this.lastToken=new S.Z({type:t,symbol:e,id:this.id++,line:this.input.line,col:this.input.col}),this.lastToken}removeComments(){const{comment:t}=R.T;this.input.input=this.input.input.replace(t,"").replace(/>>/g,"").replace(/<</g,"")}readString(){return this.getTokenInstance(i.Z.STRING,this.readEscaped('"'))}readNumber(){let t=!1;const e=this.readWhile(function(e){return"."===e?!t&&(t=!0,!0):this.validator.isDigit(e)}.bind(this));return this.getTokenInstance(i.Z.NUMBER,Number(e))}readWhile(t){let e="";for(;!this.eof()&&t(this.input.peek());)e+=this.input.next();return e}readEscaped(t){let e=!1,s="";for(this.input.next();!this.input.eof();){const i=this.input.next();if(e)s+=i,e=!1;else if("\\"===i)e=!0;else{if("string"==typeof t?i===t:t.call(this,i))break;s+=i}}return s}getKeywordType(t){const e=Object.keys(n).find((e=>n[e]===t));switch(n[e]){case n.SECTION_START:return i.Z.SECTION_START;case n.SECTION_END:return i.Z.SECTION_END;case n.CHOICE_START:return i.Z.CHOICE_START;case n.CHOICE_END:return i.Z.CHOICE_END;case n.TRUE:case n.FALSE:return i.Z.BOOLEAN}return e.includes("PROP")?i.Z.PROPERTY_KW:e.includes("IF")||e.includes("ELSE")||"THEN"===e?i.Z.CONDITIONAL_KW:e?i.Z.OTHER_KW:void this.except("Undefined keyword")}readIdentifier(){const t=this.readWhile(this.validator.isIdentifier);return this.getTokenInstance(this.validator.isKeyword(t)?this.getKeywordType(t):i.Z.VARIABLE,t)}readProperty(){return this.getTokenInstance(i.Z.PROPERTY_KW,this.readWhile(this.validator.isPropName))}readNext(){if(this.readWhile(this.validator.isWhiteSpace),this.input.eof())return null;const t=this.input.peek();return'"'===t?this.readString():"\n"===t?this.getTokenInstance(i.Z.NEWLINE_CHAR,this.input.next()):this.validator.isDigit(t)?this.readNumber():this.validator.isIdentifierStart(t)?this.readIdentifier():this.validator.isPropNameStart(t)?this.readProperty():this.validator.isPunctuation(t)?this.getTokenInstance(i.Z.PUNCTUATION,this.input.next()):this.validator.isOperatorChar(t)?this.getTokenInstance(i.Z.OPERATOR,this.readWhile(this.validator.isOperatorChar)):void this.except("Character "+t+"is unrecognised")}},k=class extends C{constructor(t){super(t),this.pos=0,this.line=1,this.col=0,this.index=0}async init(){if("object"==typeof module&&module.exports){const t=(await s.e(716).then(s.t.bind(s,716,19))).Assembler;this.assembler=new t(this.input),this.input=await this.assembler.assemble()}}handleRequire(){this.input.match(requireRegex)}next(){++this.index;const t=this.input.charAt(this.pos++);return"\n"===t?(this.line++,this.col=0):this.col++,t}peek(){return this.input.charAt(this.pos)}eof(){return this.pos===this.input.length}except(t){throw new y.Z(t,this.line,this.col,!0)}preview(t){return this.input.substr(this.index,t)}};Array.prototype.size=function(){return this.length};class A{constructor(t){this.input=t,this.utils=new class{isPunctuation=(t,e)=>t&&t.type===i.Z.PUNCTUATION&&(!e||t.symbol===e)&&t;isString=t=>t&&t.type===i.Z.STRING;isBoolean=t=>t&&t.type===i.Z.BOOLEAN;isTrue=t=>this.isBoolean(t)&&t.symbol===n.TRUE;isFalse=t=>this.isBoolean(t)&&t.symbol===n.FALSE;isPropertyKeyword=(t,e)=>t&&t.type===i.Z.PROPERTY_KW&&(!e||t.symbol===e)&&t;isOtherKeyword=(t,e)=>t&&t.type===i.Z.OTHER_KW&&(!e||t.symbol===e)&&t;isSectionStart=t=>t&&t.type===i.Z.SECTION_START;isSectionEnd=t=>t&&t.type===i.Z.SECTION_END;isChoiceStart=t=>t&&t.type===i.Z.CHOICE_START;isChoiceEnd=(t,e)=>t&&t.type===i.Z.CHOICE_END&&(!e||t.symbol===e)&&t;isConditionalKeyword=(t,e)=>t&&t.type===i.Z.CONDITIONAL_KW&&(!e||t.symbol===e)&&t;isOperator=t=>t&&t.type===i.Z.OPERATOR;isTokenFor=(t,e,s)=>e?s?t.type===e&&t.symbol===s:t.type===e:s?t.symbol===s:null;isKeyword=(t,e)=>t.type.includes("_KW")&&(!e||(!e||t.symbol===e)&&t);camelize=t=>t.replace(/([-_][a-z])/gi,(t=>t.toUpperCase().replace("-","").replace("_","")));getKeywordName=t=>Object.keys(n).find((e=>n[e].toLowerCase()===t.toLowerCase()))},this.counts={sectionNumber:1,sceneNumber:1,choiceNumber:1,identifiers:{}}}static parseText(t){return new A(new Z(new k(t)))}skipPunctuation(t){this.utils.isPunctuation(this.input.peek(),t)?this.input.next():this.except('Expecting punctuation: "'+t+'"')}skipPropertyKeyword(t){this.utils.isPropertyKeyword(this.input.peek(),t)?this.input.next():this.except('Expecting property: "'+t+'"')}skipOtherKeyword(t){this.utils.isOtherKeyword(this.input.peek(),t)?this.input.next():this.except('Expecting keyword: "'+t+'"')}skipSectionStart(){if(this.utils.isSectionStart(this.input.peek()))return this.input.next();this.except("Expecting section starter: ")}skipChoiceStart(){this.utils.isChoiceStart(this.input.peek())?this.input.next():this.except("Expecting choice starter")}skipNewLine(){for(;this.utils.isTokenFor(this.input.peek(),i.Z.NEWLINE_CHAR);)this.input.next();return!0}skipOperator(t){this.utils.isOperator(this.input.peek(),t)?this.input.next():this.except('Expecting operator: "'+t+'"')}skipConditionalToken(t){this.utils.isConditionalKeyword(this.input.peek(),t)?this.input.next():this.except('Expecting conditional keyword: "'+t+'"')}unexpected(){this.except("Unexpected token: "+JSON.stringify(this.input.peek()))}except(t){return this.input.except(t)}parseExpression(){return this.maybeBinary(this.parseAtom(...arguments),0)}maybeBinary(t,e){if(this.utils.isOperator(this.input.preview())){const s=this.input.preview(),i=h.Z[s.symbol];if(i>e){this.input.next(),this.input.next();const n=this.parseAtom(),r=new f.Z(s.symbol===_.Z.ASSIGNMENT?"assign":"binary",s.symbol,t,this.maybeBinary(n,i));return this.maybeBinary(r,e)}}return t}parseConditionalBlock(){this.skipConditionalToken(n.IF_BLOCK_START);const t=this.parseExpression();if(!this.utils.isPunctuation(this.input.peek(),l)){this.skipConditionalToken(n.THEN);const e=this.parseExpression(),s=new O.Z({cond:t,then:e});return this.skipNewLine(),this.utils.isConditionalKeyword(this.input.peek(),n.ELSE_BLOCK_START)&&(this.input.next(),s.else=this.parseExpression(),this.input.next()),s}if(this.utils.isPunctuation(this.input.peek(),l)){const e=this.parseExpression(),s=new O.Z({cond:t,then:e});return this.skipNewLine(),this.utils.isConditionalKeyword(this.input.peek(),n.ELSE_BLOCK_START)&&(this.input.next(),s.else=this.parseExpression(),this.input.next()),s}}parseSection(){let t=this.input.peek();const e=new c.Z({timer:0,title:""}),s=new r.Z([],[],this.counts.sectionNumber++,e);t=this.skipSectionStart();let n=1;for(;!this.utils.isSectionEnd(t,t.symbol)&&(this.skipNewLine(),t=this.input.peek(),!this.utils.isSectionEnd(t));){const e=this.parseExpression(!1);if(e instanceof E.Z?(e.owner=this.counts.sectionNumber-1,e.choiceI=n++,s.text.push(e),e.target||this.except("No target specified for choice number "+n-1)):e instanceof m?("identifier"===e.name&&this.counts.identifiers[e.value]?this.except("Non-unique section identifier "+e.value):"identifier"===e.name&&(this.counts.identifiers[e.value]=!0,s.identifier=e.value),s.settings[e.name]=e.value,"title"===e.name&&(s.title=e.value)):(e instanceof S.Z||e instanceof O.Z||e instanceof f.Z)&&s.text.push(e),this.input.peek().type===i.Z.SECTION_END)break;t=this.input.next()}return s}parseChoice(){this.skipChoiceStart();let t=this.input.peek();const e=new E.Z({owner:void 0,target:void 0,text:[]},{variables:[],mode:"basic",choiceI:null,condition:void 0,actions:[],input:null});for(;!this.utils.isTokenFor(t,i.Z.CHOICE_END)&&(this.skipNewLine(),t=this.input.peek(),!this.utils.isTokenFor(t,i.Z.CHOICE_END));){const s=this.parseExpression(!0);if(s instanceof m?"action"===s.name?e.actions.push(s.value):"input"===s.name?(e.mode="input",e.input=s.value):"target"===s.name?e.target=s.value:"targetType"===s.name?e.targetType=s.value:"identifier"===s.name&&(e.identifier=s.value):(s instanceof S.Z||s instanceof O.Z||s instanceof f.Z)&&e.text.push(s),this.input.peek().type===i.Z.CHOICE_END)break;s instanceof O.Z||(t=this.input.next())}return e}parseSettings(t){let e=p.Z,s=n.SETTINGS_END;const{isTokenFor:r}=this.utils;t===n.SECTION_SETTINGS_START&&(e=c.Z,s=n.SECTION_SETTINGS_END);const o=new e({referrable:!1,startAt:0,fullTimer:0});for(this.skipOtherKeyword(n.SETTINGS_START);!r(this.input.peek(),i.Z.OTHER_KW,s)&&(this.skipNewLine(),!r(this.input.peek(),i.Z.OTHER_KW,s));){if(r(this.input.peek(),i.Z.PROPERTY_KW)){const t=this.parseProperty();o[t.name]=t.value}else this.unexpected();if(r(this.input.peek(),i.Z.OTHER_KW,s))break}return o}parseProperty(){let t=this.input.peek();const e=this.utils.getKeywordName(t.symbol);let s=e===this.utils.getKeywordName(n.PROP_CHOICE_INPUT)?"input":null,r=!0;const o=[],{isTokenFor:a}=this.utils;this.skipPropertyKeyword(),t=this.input.peek();const h=(t,e,s,i)=>{let n;if("string"==typeof e?n=a(t,e):e instanceof Array&&(n=e.some((e=>a(t,e)))),n)try{s&&!s(t)||o.push(i?t:t.symbol)}catch(t){this.except(t.message)}else this.unexpected()},p=()=>{o.size()>0&&this.unexpected(),r=!1},c=t=>{o.size()>t-1&&this.unexpected(),r=!0},l={propIfTitle:()=>{p(),s="name",h(t,i.Z.STRING)},propChoiceAction:()=>{p(),s="action",o.push(this.parseExpression())},propChoiceInput:()=>{s="input",h(t,i.Z.VARIABLE,null,!0)},propChoiceRead:()=>{},propChoiceTargetType:()=>{p(),s="targetType",h(t,i.Z.STRING)},propChoiceTarget:()=>{p(),s="target",h(t,[i.Z.NUMBER,i.Z.STRING])},propFullTimer:()=>{c(2),s="fullTimer",h(t,i.Z.NUMBER)},propReferrable:()=>{p(),s="referrable",a(t,i.Z.BOOLEAN)?o.push(this.utils.isTrue(t)):this.unexpected()},propSceneFirst:()=>{p(),s="first",h(t,[i.Z.NUMBER,i.Z.STRING])},propSceneMusic:()=>{p(),s="music",h(t,i.Z.STRING,(t=>new URL(t.symbol)))},propSceneName:()=>{p(),s="name",h(t,i.Z.STRING)},propSceneSections:()=>{s="sections",h(t,[i.Z.NUMBER,i.Z.STRING])},propSectionTimer:()=>{p(),s="timer",h(t,i.Z.NUMBER)},propSectionTitle:()=>{p(),s="title",h(t,i.Z.STRING)},propIdentifier:()=>{p(),s="identifier",h(t,i.Z.STRING)},propStartAt:()=>{p(),s="startAt",h(t,i.Z.NUMBER)},propRequire:()=>{p(),s="require",h(t,i.Z.STRING)}};for(;!a(t,i.Z.NEWLINE_CHAR);)l[this.utils.camelize(e.toLowerCase())](),t=this.input.next();return"fullTimer"===s?{name:s,value:{timer:o[0],target:o[1]}}:new m({name:s,value:o.size()>0?r?o:o[0]:null})}parseScene(){this.skipOtherKeyword(n.SCENE_START);const{isTokenFor:t}=this.utils,e=new o.Z([],{first:0,name:""});for(;!t(this.input.peek(),i.Z.OTHER_KW,n.SCENE_END)&&(this.skipNewLine(),!t(this.input.peek(),i.Z.OTHER_KW,n.SCENE_END));){if(t(this.input.peek(),i.Z.PROPERTY_KW)){const t=this.parseProperty();e[t.name]=t.value}else this.unexpected();if(t(this.input.peek(),i.Z.OTHER_KW,n.SCENE_END))break}return e}parseAtom(t){if(this.utils.isTokenFor(this.input.peek(),i.Z.NEWLINE_CHAR))return this.skipNewLine();if(this.utils.isPunctuation(this.input.peek(),T)){this.input.next();const t=this.parseExpression();return this.utils.isPunctuation(this.input.preview(),d)&&this.input.next(),this.skipPunctuation(d),t}if(this.utils.isPunctuation(this.input.peek(),l)){this.input.next(),this.skipNewLine();const t=this.parseExpression();return this.skipNewLine(),this.input.next(),this.skipNewLine(),this.skipPunctuation(u),t}if(this.utils.isConditionalKeyword(this.input.peek(),n.IF_BLOCK_START))return this.parseConditionalBlock();if(this.utils.isBoolean(this.input.peek())){const t=this.input.peek();return t.symbol=this.utils.isTrue(t),t}if(!t&&this.utils.isTokenFor(this.input.peek(),i.Z.CHOICE_START))return this.parseChoice();if(this.utils.isPropertyKeyword(this.input.peek()))return this.parseProperty();const e=this.input.peek();if(e.type===i.Z.VARIABLE||e.type===i.Z.NUMBER||e.type===i.Z.STRING)return e;this.unexpected()}parseStory(t){this.input||(this.input=t,this.counts={sectionNumber:0,sceneNumber:0,choiceNumber:0});const e=new a.Z("",{sections:[],scenes:[],passages:[]},new p.Z({fullTimer:void 0,referrable:void 0,startAt:void 0,name:void 0}),{globals:{},stats:{}});this.story=e;let s=this.input.next();for(;!this.input.eof()&&(this.skipNewLine(),s=this.input.peek(),!this.input.eof());){const{isTokenFor:t}=this.utils;t(s,i.Z.SECTION_START)&&e.sections.push(this.parseSection()),t(s,i.Z.OTHER_KW,n.SCENE_START)&&e.scenes.push(this.parseScene()),t(s,i.Z.OTHER_KW,n.SETTINGS_START)&&(e.settings=this.parseSettings(n.SETTINGS_START)),s=this.input.next()}return e.settings.name&&(e.name=e.settings.name),e}}const x=A}}]);