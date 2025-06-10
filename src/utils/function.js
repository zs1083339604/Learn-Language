import { ElMessage, ElLoading } from "element-plus";
import { readFile, readTextFile, exists } from '@tauri-apps/plugin-fs';

function show_error(error, title = ""){
    if(error == undefined){
        return;
    }
    
    let error_str = typeof error == 'string' ? error : "";

    if(error_str == ""){
        // error是一个对象，判断是否有msg或message属性
        if(error.msg){
            error_str = error.msg;
        }else if(error.message){
            error_str = error.message;
        }
    }

    error_str = title == "" ? error_str : title + ": <br />" + error_str;
    

    ElMessage.error({
        dangerouslyUseHTMLString: true,
        message: error_str,
    });
}

function show_loading(text){
    const loading = ElLoading.service({
        lock: true,
        text: text,
        background: 'rgba(0, 0, 0, 0.7)',
    })

    return {
        close: function(){
            loading.close();
        },
        loading,
        setText: function(text){
            loading.text = text;
        }
    }
}

function deepCopy(obj){
    return JSON.parse(JSON.stringify(obj));
}

function stringToBoolean(str) {
    if (str === 'true' || str == '1') {
        return true;
    } else if (str === 'false') {
        return false;
    } else {
        return false;
    }
}

function readClassData(classInfo){
    let filePath = classInfo.filePath,
    audioFilePath = filePath + "/" + classInfo.audioFileName,
    audioSrtJsonPath = filePath + "/" + classInfo.audioSrtJsonName,
    audioData = [],
    jsonData = [];

    return new Promise((resolve, reject) => {
        
        exists(audioFilePath).then((exis)=>{
            if(!exis){
                throw Error("未获取到音频文件");
            }
    
            return exists(audioSrtJsonPath);
        }).then((exis)=>{
            if(!exis){
                throw Error("未获取到字幕文件");
            }
    
            return readFile(audioFilePath);
        }).then((result)=>{
            audioData = result;
            return readTextFile(audioSrtJsonPath);
        }).then((result)=>{
            jsonData = JSON.parse(result);
            resolve({
                filePath,
                audioFilePath,
                audioSrtJsonPath,
                audioData,
                jsonData
            });
        }).catch((error)=>{
            reject(error);
        })
    })
}

function getDefaultPrompt(){
    return{
        annotation: `你是一个语言专家，用户会把单词以数组形式发给你，请你以简体中文的形式返回给用户，并解释单词词性、单词读音、单词中文释义、附加说明、以及其适用性是仅限于本课文输出0，该语言通用输出1。
以如下格式返回，每个单词之前用2个换行隔开，不要输出多余的话：
单词：单词内容
词性：可选输出 noun,numeral,measure_word,verb,adjective,distinguishing_word,adverb,conjunction,preposition,auxiliary,modal_particle,phrase,sentence_fragment,pronoun,interjection,onomatopoeia,morpheme,other
读音：
中文释义：
附加说明：
适用性：可选输出 0,1

单词：\${var}`,
        translation: `你可以把世界各国的语言翻译成简体中文，请翻译下面的文章，只输出译文，不要回答无关的信息
文章：\${var}`
    }
}

export {
    show_error, show_loading, deepCopy, stringToBoolean, readClassData, getDefaultPrompt
}