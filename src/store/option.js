import { defineStore } from "pinia";
import { select, insert, update } from "../utils/sqlite";

export const useOptionStore = defineStore("option", {
    actions: {
        getOption(){
            return new Promise((resolve, reject) => {
                select("option", ['*'], 'id = ?', [1]).then((result)=>{
                    this.option = result.rows[0];
                    // 解析AI平台的设置
                    this.formatAIOption("ChatGLM");
                    this.formatAIOption("ChatGPT");
                    this.formatAIOption("DeepSeek");
                    this.formatAIOption("Google");
                    this.formatAIOption("Groq");
                    resolve();
                }).catch((error)=>{
                    reject(error);
                })
            })
        },
        formatAIOption(aiName){
            if(this.option[aiName] && this.option[aiName] != "unll"){
                this.option[aiName] = JSON.parse(this.option[aiName]);
            }
        },
        saveOption(datas, replaceStoreData = true){
            return new Promise((resolve, reject) => {
                update("option", datas, 'id = ?', [1]).then(()=>{
                    if(replaceStoreData){
                        Object.assign(this.option, datas);
                    }
                    resolve();
                }).catch((error)=>{
                    reject(error);
                }) 
            });
        },
        getAIOption(){
            return {
                nowAiPlatform: this.option.nowAiPlatform,
                ChatGLM: this.option.ChatGLM,
                ChatGPT: this.option.ChatGPT,
                DeepSeek: this.option.DeepSeek,
                Google: this.option.Google,
                Groq: this.option.Groq
            }
        },
        saveAIOption(datas){
            return this.saveOption(datas);
        },
        getAIPromptOption(){
            return {
                annotation: this.option.annotationPrompt,
                translation: this.option.translationPrompt
            }
        },
        saveAIPromptOption(datas){
            return this.saveOption(datas);
        },
        getSoftOption(){
            return {
                annotationRule: this.option.annotationRule,
                annotationNumber: this.option.annotationNumber
            }
        },
        saveSoftOption(datas){
            return this.saveOption(datas);
        }
    },
    state(){
        return {
            option: {

            }
        }
    }
});