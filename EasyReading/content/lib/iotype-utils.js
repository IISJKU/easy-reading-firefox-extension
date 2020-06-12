/**
 * Utility methods for handling I/O Types
 * @Class ioTypeUtils
 */
var ioTypeUtils = {
    /**
     * Converts an object to a specific IOType instance
     * @param ioObject
     * @returns IOType instance
     */
    toIOTypeInstance(ioObject) {
        let IOret = new IOType();
        if (typeof(ioObject) === "object" && ioObject.name !== undefined) {
            switch (ioObject.name) {
                case 'VoidIOType':
                    IOret = new VoidIOType();
                    break;
                case 'Word':
                    IOret = new Word(ioObject.word,ioObject.lang,ioObject.sentenceStart,ioObject.sentenceEnd);
                    break;
                case 'Sentence':
                    IOret = new Sentence(ioObject.sentence,ioObject.lang);
                    break;
                case 'Paragraph':
                    IOret = new Paragraph(ioObject.paragraph,ioObject.lang);
                    break;
                case 'AnnotatedParagraph':
                    IOret = new AnnotatedParagraph(ioObject.paragraph,ioObject.annotations, ioObject.lang);
                    break;
                case 'ImageIOType':
                    IOret = new ImageIOType(ioObject.url, ioObject.alt, ioObject.title);
                    break;
                case 'AudioType':
                    IOret = new AudioType(ioObject.mp3URL, ioObject.speechMarkURL, ioObject.speechMarks);
                    break;
                case 'JavaScriptType':
                    IOret = new JavaScriptType(ioObject.script);
                    break;
                case 'URLType':
                    IOret = new URLType(ioObject.url, ioObject.target);
                    break;
                case 'ContentReplacement':
                    IOret = new ContentReplacement(ioObject.replacements,ioObject.lang);
                    break;
                case 'Error':
                    IOret = new Error(ioObject.message,ioObject.type,ioObject.name,ioObject.description);
                    break;
                case 'NoResult':
                    IOret = new NoResult(ioObject.message, ioObject.name,ioObject.description);
                    break;

            }
        } else {
            return ioObject; // Backwards compatibility
        }
        return IOret;
    },

};