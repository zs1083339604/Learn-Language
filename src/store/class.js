import { defineStore } from "pinia";
import { insert } from "../utils/sqlite";

export const useClassStore = defineStore("class", {
    actions: {
        addClass(data){
            return new Promise((resolve, reject) => {
                if(data.title == "" || data.content == "" || data.audioFilePath == "" || data.audioSrtJsonPath == ""){
                    reject("名称、正文、音频或JSON路径有误");
                    return;
                }
                console.log(data);
                insert("class", ["languageId", "title", "content", "audioFilePath", "audioSrtJsonPath"], [data.languageId, data.title, data.content, data.audioFilePath, data.audioSrtJsonPath]).then((datas)=>{
                    resolve(datas);
                }).catch((err)=>{
                    reject(err);
                });
            })
        }
    },
    state(){
        return {
            class: []
        }
    }
});