"use strict";

/**
 * Input and Output Type
 */
class IOType {
    constructor(name="IOType", description="") {
        this.name = name;
        this.description = description;
        this._isText = false;
    }
    static get className() {
        return 'IOType';
    }

    /**
     * HTML markup for the instance, excluding any metadata
     * @returns {string}
     */
    toHtml() {
        return '';
    }

    isText(){
        return this._isText;
    }

    getValue(){

    }
}

class VoidIOType extends IOType {
    constructor(description = "") {
        super("VoidIOType", description);
    }
    static get className() {
        return 'VoidIOType';
    }
}

class Word extends IOType {
    constructor(word,lang="en", sentenceStart = "", sentenceEnd="", description="") {
        super("Word", description);
        this.word = word;
        this.lang = lang;
        this.sentenceStart = sentenceStart;
        this.sentenceEnd = sentenceEnd;
        this._isText = true;
    }

    static get className() {
        return 'Word';
    }
    toHtml() {
        return this.word;
    }

    getValue(){
        return this.word;
    }

    getSentence(){
        return this.sentenceStart+" "+this.word+" "+this.sentenceEnd;
    }
}

class Sentence extends IOType {
    constructor(sentence, lang="en", description="") {
        super("Sentence", description);
        this.sentence = sentence;
        this.lang = lang;
        this._isText = true;
    };
    static get className() {
        return 'Sentence';
    };
    toHtml() {
        return this.sentence;
    }

    getValue(){
       return this.sentence;
    }
}

class Paragraph extends IOType {
    constructor(paragraph, lang="en", description="") {
        super("Paragraph", description);
        this.paragraph = paragraph;
        this.lang = lang;
        this._isText = true;
    }
    static get className() {
        return 'Paragraph';
    }
    toHtml() {
        return "<p>" + this.paragraph + "</p>";
    }

    getValue(){
        return this.paragraph;
    }
}

class AnnotatedParagraph extends IOType{
    constructor(paragraph,annotations = null,lang="en", description="") {
        super("AnnotatedParagraph", description);
        this.paragraph = paragraph;

        if(annotations){
            this.annotations = annotations;
        }else{
            this.annotations = [];
        }

        this.lang = lang;
        this._isText = true;
    }
    static get className() {
        return 'AnnotatedParagraph';
    }

    addTextAnnotation(position,textToAnnotate,text){
        this.annotations.push({
            type: "text",
            position: position,
            textToAnnotate: textToAnnotate,
            text:text,
        });
    }

    addHTMLAnnotation(position,textToAnnotate, html){
        this.annotations.push({
            type: "html",
            position: position,
            textToAnnotate: textToAnnotate,
            html:html,
        });
    }
    addImageAnnotation(position,textToAnnotate, imageURL,imageALT){
        this.annotations.push({
            type: "image",
            position: position,
            textToAnnotate: textToAnnotate,
            image:imageURL,
            imageALT: imageALT
        });
    }

    addWikipediaAnnotation(position,textToAnnotate,wikiLinks){
        this.annotations.push({
            type:"wiki",
            position: position,
            textToAnnotate: textToAnnotate,
            wikiLinks:wikiLinks,
        });
    }

    toHtml() {
        return "<p>" + this.paragraph + "</p>";
    }

    getValue(){
        return this.paragraph;
    }
}

class ParsedLanguageType extends IOType {
    /**
     * @param {string} raw_string
     * @param {Array.<string>} sentences - sentence[word]
     * @param {Array.<string>} pos_tags - sentence[POS_tag of corresponding word]
     * @param {string} language
     * @param {string} name
     * @param {string} description
     */
    constructor(raw_string = "",
                sentences= [],
                pos_tags = [],
                language = "",
                description="A paragraph made up of sentences with syntactic metadata") {
        super("ParsedLanguageType", description);
        this.raw_string = raw_string;
        this.sentences= sentences;
        this.pos_tags = pos_tags;
        this.language = language;
    }
    toHtml() {
        let html = '';
        if (this.sentences instanceof Array) {
            html = '<p>';
            this.sentences.forEach((sentence, i) => {
                sentence.forEach((word, j) => {
                    let pos_tag = '';
                    if (i < this.pos_tags.length && j < this.pos_tags[i].length) {
                        pos_tag = '<span class="easy-reading-highlight">(';
                        pos_tag += this.pos_tags[i][j];
                        pos_tag += ')</span> ';
                    }
                    html += word + pos_tag;
                });
                html += '<br/>';
            });
            html += '</p>';
        } else if (this.raw_string) {
            html = this.raw_string;
        } else if (typeof this.sentences === 'string' || this.sentences instanceof String) {
            html = this.sentences;
            return html;
        }
    }
}

class Page extends IOType {
    constructor(page, lang="en", description="") {
        super("Page", description);
        this.page = page;
        this.lang = lang;
    }
    static get className() {
        return 'Page';
    }

    getValue(){
        return this.page;
    }
}

class ImageIOType extends IOType {
    constructor(url, alt="", title="", description="") {
        super("ImageIOType", description);
        this.url = url;
        this.alt = alt;
        this.title = title;
    }
    toHtml() {
        if (!this.url) {
            return "No images found.";
        } else {
            let altText = "";
            if(this.alt) {
                altText = this.alt;
            }
            let html = "<img src=\"" + this.url + "\" alt=\"" + altText + "\"";
            if (this.title) {
                html += " title=\"" + this.title + "\"";
            }
            html += "/>";
            return html;
        }
    }

    getValue(){
        return this.url;
    }

    static get className() {
        return 'ImageIOType';
    }

}

class AudioType extends IOType {
    constructor(url, speechMarkURL = "", speechMarks = [], description="") {
        super("AudioType", description);
        this.mp3URL = url;
        this.speechMarkURL = speechMarkURL; // URL to a JSON file with speech marks
        this.speechMarks = speechMarks;
    }
    static get className() {
        return 'AudioType';
    }
    toHtml() {
        let html =  "<audio controls>";
        html += "<source src=\"" + this.mp3URL + "\" type=\"audio/mpeg\">";
        html += "Your browser does not support the audio tag. </audio>";
        return html;
    }

    getValue(){
        return this.mp3URL;
    }
}

class JavaScriptType extends IOType {

    constructor(script="", description="") {
        super("JavaScriptType", description);
        this.script = script;
    }
    static get className() {
        return 'JavaScriptType';
    }
    toHtml() {
        if (this.script.startsWith("<script")) {
            return this.script;
        } else {
            return "<script>" + this.script + "</script>";
        }
    }

    getValue(){
        return this.script;
    }
}

class URLType extends IOType {
    constructor(url, target="", description="") {
        super("URLType", description);
        this.url = url;
        this.target = target;
    }
    static get className() {
        return 'URLType';
    }
    toHtml() {
        let html =  "<a href=\"" + this.url.toString() + "\"";
        if (this.target) {
            html += " target=\"" + this.target + "\"";
        }
        html += "/>";
        return html;
    }

    getValue(){
        return this.url;
    }


}
class ContentReplacement extends IOType{
    constructor(replacments, lange = "en",description=""){
        super("ContentReplacement",description);

        if(replacments){
            this.replacements = replacments;
        }else{
            this.replacements = [];
        }

    }

    addReplacement(type, replacement){
        this.replacements.push({
            type: type,
            replacement: replacement,
        })
    }
    static get className() {
        return 'ContentReplacement';
    }
}

class TaggedText extends IOType{
    constructor(originalText,taggedText = null,lang="en", description="") {
        super("TaggedText", description);
        this.originalText = originalText;

        if(taggedText){
            this.taggedText = taggedText;
        }else{
            this.taggedText = [TaggedText.createPOSTag(this.originalText)];
        }

        this.lang = lang;
        this._isText = true;
    }
    static get className() {
        return 'TaggedText';
    }

    static createPOSTag(text,tags=null){


        return {
            text: text,
            tags : tags,
        }

    }

    getText(){
        let text = "";
        for(let i=0; i < this.taggedText.length; i++){

            text+=this.taggedText[i].text;
        }
        return text;
    }
}

class Error extends IOType{
    constructor(errorMessage,errorType="Error",description=""){
        super("Error", description);
        this.message = errorMessage;
        this.type = errorType;
    }

    getValue(){
        return this.message;
    }

    toHtml() {
        return this.message;
    }
}

class NoResult extends IOType{
    constructor(message,description=""){
        super("NoResult", description);
        this.message = message;
    }

    getValue(){
        return this.description;
    }

    toHtml() {
        return this.message;
    }
}

// Script running on NodeJS
if (typeof window === 'undefined') {
    module.exports.IOTypes = {
        IOType: IOType,
        VoidIOType: VoidIOType,
        Word: Word,
        Sentence: Sentence,
        Paragraph: Paragraph,
        AnnotatedParagraph:AnnotatedParagraph,
        ParsedLanguageType: ParsedLanguageType,
        Page: Page,
        TaggedText: TaggedText,
        ImageIOType: ImageIOType,
        AudioType: AudioType,
        URLType: URLType,
        ContentReplacement: ContentReplacement,
        JavaScriptType: JavaScriptType,
        Error: Error,
        NoResult: NoResult,
    };
}
