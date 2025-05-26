import { defineStore } from "pinia";
import { select, insert } from "../utils/sqlite";

export const useLanguagesStore = defineStore("languages", {
    actions: {
        getLanguages(){
            return new Promise((resolve, reject) => {
                select("language", ["title", "id", "languageText", "voice", "lastViewId"]).then((datas)=>{
                    this.languages = datas.rows;
                    resolve(datas.rows);
                }).catch((err)=>{
                    reject(err);
                })
            })
        },

        addLanguage(data){
            return new Promise((resolve, reject) => {
                if(data.title == "" || data.language == "" || data.voice == ""){
                    reject("标题或配音员为空");
                    return;
                }
                insert("language", ["title", "languageText", "voice"], [data.title, data.language, data.voice]).then((datas)=>{
                    return this.getLanguages();
                }).then(()=>{
                    resolve();
                }).catch((err)=>{
                    reject(err);
                });
            })
        },

        getItemById(id){
            return this.languages.find(item => item.id == id)
        }
    },
    state(){
        return {
            languages: []
        }
    }
});