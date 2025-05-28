import { defineStore } from "pinia";
import { select, insert } from "../utils/sqlite";

export const useCommonWordsStore = defineStore("commonWords", {
    actions: {
        getCommonWords(languageId) {
            return new Promise((resolve, reject) => {
                if(languageId == this.languageId){
                    resolve(this.words);
                    return;
                }

                this.setLanguageId(languageId);

                select("word", ["id", "inlineId", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "spell"], "languageId = ? AND applicable = ?", [languageId, 1]).then((result)=>{
                    this.words = result.rows;
                    resolve(result.rows);
                }).catch((error)=>{
                    reject(error)
                })
            })
        },
        setLanguageId(languageId){
            this.languageId = languageId;
        },
        getWordInfoByWord(word){
            const index = this.words.findIndex(item => item.content == word);
            if(index == -1){
                return null;
            }
            return this.words[index];
        }
    },
    state(){
        return {
            languageId: 0,
            words: []
        }
    }
});