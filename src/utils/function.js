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
        loading
    }
}

function deepCopy(obj){
    return JSON.parse(JSON.stringify(obj));
}

function stringToBoolean(str) {
    if (str === 'true') {
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

export {
    show_error, show_loading, deepCopy, stringToBoolean, readClassData
}