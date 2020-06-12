class SentenceTokenizer{
    constructor(){
    }
    setEntry(entry){
        this.entry = this.compact(entry);
        this.sentences = null;
    }

    getSentences(){
        if (!this.entry) return [];
        let words = this.entry.split(' ');
        let endingWords = words.filter(function(w) {
            return w.endsWith('.') || w.endsWith('!') || w.endsWith('?');
        });

        let self = this;
        let lastSentence = words[0];
        self.sentences = [];
        words.reduce(function (prev, cur) {


            if (endingWords.indexOf(prev) !== -1) {
                self.sentences.push(self.compact(lastSentence));
                lastSentence = "";
            }
            lastSentence = lastSentence + " " + cur;
            return cur;
        });
        self.sentences.push(this.compact(lastSentence));
        return this.sentences;
    }


    compact(str){
        let res = str.trim();
        res = res.replace('  ', ' ');
        return res;
    }

}
