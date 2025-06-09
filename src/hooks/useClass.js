import { insert, select, update, deleteData } from "../utils/sqlite";
import { remove } from "@tauri-apps/plugin-fs";
import useWord from "./useWord";

export default ()=>{

    const addClass = (data) => {
        return new Promise((resolve, reject) => {
            if(data.title == "" || data.content == "" || data.audioFileName == "" || data.audioSrtJsonName == "" || data.filePath == ""){
                reject("名称、正文、音频或JSON路径有误");
                return;
            }
            insert("class", ["languageId", "title", "content", "translation", "audioFileName", "audioSrtJsonName", "filePath"], [data.languageId, data.title, data.content, data.translation, data.audioFileName, data.audioSrtJsonName, data.filePath]).then((datas)=>{
                resolve(datas);
            }).catch((err)=>{
                reject(err);
            });
        })
    }

    const getNoFinishClass = (languageId) => {
        return select("class", ["id"], "languageId = ? AND isFinish = 0", [languageId]);
    }

    const getClassFullInfoByID = (id) => {
        return select("class", ["*"], "id = ?", [id]);
    }

    const setFinished = (id) => {
        return update("class", {isFinish: 1}, "id = ?", [id]);
    }

    const getALLClassBaseInfo = ()=>{
        return select("class", ["id", "title", "isFinish", "languageId"], null, null);
    }

    const getALLClassBaseInfoByLanguageId = (languageId)=>{
        return select("class", ["id", "title", "content", "isFinish"], "languageId = ?", [languageId]);
    }

    const editTranslationById = (id, translation) => {
        return update("class", {translation: translation}, "id = ?", [id]);
    }

    const deleteClass = (filePath, audioFileName, audioSrtJsonName, id)=>{
        const audioFilePath = filePath + "/" + audioFileName,
        audioSrtJsonPath = filePath + "/" + audioSrtJsonName;
        const {deleteWordsByClassId, deleteWordBase64ByClassID} = useWord();

        return new Promise((resolve, reject) => {
            // 删除字幕文件
            remove(audioSrtJsonPath).then(()=>{
                // 删除音频
                return remove(audioFilePath);
            }).then(()=>{
                // 删除文件夹
                return remove(filePath);
            }).then(()=>{
                // 文件删除成功，删除数据库
                // 删除所有单词配音数据
                return deleteWordBase64ByClassID(id);
            }).then(()=>{
                // 删除所有单词数据
                return deleteWordsByClassId(id);
            }).then(()=>{
                // 删除课文
                return deleteData("class", "id = ?", [id]);
            }).then(()=>{
                resolve();
            }).catch((error)=>{
                reject(error)
            })
        })
    }

    return {
        addClass,
        getNoFinishClass,
        getClassFullInfoByID,
        setFinished,
        getALLClassBaseInfo,
        getALLClassBaseInfoByLanguageId,
        editTranslationById,
        deleteClass
    }
}