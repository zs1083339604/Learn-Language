import { defineStore } from "pinia";
import { insert, select } from "../utils/sqlite";

export const useClassStore = defineStore("class", {
    actions: {
        addClass(data){
            return new Promise((resolve, reject) => {
                if(data.title == "" || data.content == "" || data.audioFileName == "" || data.audioSrtJsonName == "" || data.filePath == ""){
                    reject("名称、正文、音频或JSON路径有误");
                    return;
                }
                console.log(data);
                insert("class", ["languageId", "title", "content", "audioFileName", "audioSrtJsonName", "filePath"], [data.languageId, data.title, data.content, data.audioFileName, data.audioSrtJsonName, data.filePath]).then((datas)=>{
                    resolve(datas);
                }).catch((err)=>{
                    reject(err);
                });
            })
        },
        getNoFinishClass(languageId){
            return select("class", ["id"], "languageId = ? AND isFinish = 0", [languageId]);
        },
        getClass(id){
            return select("class", ["*"], "id = ?", [id]);
        }
    },
    state(){
        return {
            class: []
        }
    }
});