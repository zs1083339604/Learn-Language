import { insert, select, update } from "../utils/sqlite";

export default ()=>{

    const addClass = (data) => {
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
    }

    const getNoFinishClass = (languageId) => {
        return select("class", ["id"], "languageId = ? AND isFinish = 0", [languageId]);
    }

    const getClass = (id) => {
        return select("class", ["*"], "id = ?", [id]);
    }

    const setFinished = (id) => {
        return update("class", {isFinish: 1}, "id = ?", [id]);
    }

    return {
        addClass,
        getNoFinishClass,
        getClass,
        setFinished
    }
}