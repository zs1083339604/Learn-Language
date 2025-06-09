import { defineStore } from "pinia";
import { select, insert, update, deleteData } from "../utils/sqlite";

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
        },
        
        setLastViewId(languageId, classId){
            return new Promise((resolve, reject) => {
                const index = this.languages.findIndex(item => item.id == languageId);
                if(index == -1){
                    reject("语言不存在");
                    return;
                }

                update("language", {lastViewId: classId}, "id = ?", [languageId]).then(() => {
                    this.languages[index].lastViewId = classId;
                    resolve();
                }).catch((err)=>{
                    reject(err);
                })
            })
        },
        deleteLanguageById(id){
            return new Promise((resolve, reject) => {
                const index = this.languages.findIndex(item => item.id == id);
                if(index == -1){
                    reject("语言不存在");
                    return;
                }

                deleteData("language", "id = ?", [id]).then(() => {
                    this.languages.splice(index, 1);
                    resolve();
                }).catch((err)=>{
                    reject(err);
                })
            });
        }
    },
    state(){
        return {
            languages: []
        }
    }
});