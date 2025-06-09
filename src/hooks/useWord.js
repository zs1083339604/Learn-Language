import { insert, select, update, deleteData } from "../utils/sqlite";
import { useLanguagesStore } from "../store/languages";
import { useVoicesStore } from "../store/voices";
import { show_loading } from "../utils/function";

export default ()=>{

    const addWord = (languageId, classId, data, sort) => {
        return insert("word", 
            ["classId", "languageId", "inlineId", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "applicable", "spell", "startIndex", "sort"], 
            [classId, languageId, data.inlineId, data.word, data.oartOfSpeech, data.pronunciation, data.interpretation, data.other, data.applicable, data.spell, data.startIndex, sort]
        );
    }

    const addWords = (languageId, classId, array) => {
        return new Promise(async (resolve, reject) => {
            try {
                for(let i = 0; i < array.length; i++) {
                    await addWord(languageId, classId, array[i], i);
                }
                resolve();
            } catch (error) {
                reject(error)
            }
        })
    }

    const getWordByWord = (word) => {
        return select("word", ["id", "inlineId", "oartOfSpeech", "pronunciation", "interpretation", "other", "spell"], "content = ? AND applicable = ? LIMIT 1", [word, 1]);
    }

    const getWordsByClassId = (classId) => {
        return select("word", ["id", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "startIndex", "spell", "applicable", "sort"], "classId = ? ORDER BY sort ASC", [classId]);
    }

    const updateWordById = (id, data, sort) => {
        return update("word", {
            content: data.word, 
            oartOfSpeech: data.oartOfSpeech, 
            pronunciation: data.pronunciation, 
            interpretation: data.interpretation, 
            other: data.other, 
            applicable: data.applicable,
            spell: data.spell,
            startIndex: data.startIndex,
            sort: sort
        }, "id = ?", [id]);
    }

    const deleWordById = (id) => {
        return deleteData("word", "id = ?", [id]);
    }

    const editWords = (data, deleIdArray, languageId, classId) => {
        return new Promise(async (resolve, reject) => {
            try {
                for(let i = 0; i < data.length; i++){
                    const item = data[i];
                    // 判断ID
                    if(item.id == 0){
                        // 新增
                        await addWord(languageId, classId, item, i);
                    }else{
                        // 修改
                        await updateWordById(item.id, item, i);
                    }
                    
                }
                for(let i = 0; i < deleIdArray.length; i++){
                    await deleWordById(deleIdArray[i]);
                }
                resolve();
            } catch (error) {
                reject(error)
            }
        })
    }

    const deleteWordsByClassId = (classId) => {
        return deleteData("word", "classId = ?", [classId]);
    }

    const getWordBase64ByWord = (word, languageId, classId) =>{
        return new Promise((resolve, reject) => {
            let base64 = "";
            // 先从数据库wordBase64表获取
            select("wordBase64", ["base64"],"word = ?", [word]).then(async (result)=>{
                if(result.rows.length == 0){
                    // 数据库中没有单词音频，配音
                    const loadingObj = show_loading("正在配音……");
                    const languagesStore = useLanguagesStore();
                    const languageItem = languagesStore.getItemById(languageId);
                    const voicesStore = useVoicesStore();
                    try {
                        const audioResult = await voicesStore.startTTS(languageItem.voice, word, false);
                        if(audioResult.code == 200){
                            // 配音成功，保存数据
                            base64 = audioResult.data.audio;
                            await insert("wordBase64", ["classId", "word", "base64"], [classId, word, base64]);

                            resolve(base64);
                        }else{
                            throw Error(result.msg);
                        }
                    } catch (error) {
                        reject(error);
                    }

                    loadingObj.close();
                }else{
                    resolve(result.rows[0].base64);
                }
            }).catch((error)=>{
                reject(error)
            })
        })
    }

    const deleteWordBase64ByClassID = (id) => {
        return deleteData("wordBase64", "classId = ?", [id]);
    }

    return {
        addWord,
        addWords,
        getWordByWord,
        getWordsByClassId,
        updateWordById,
        editWords,
        deleteWordsByClassId,
        getWordBase64ByWord,
        deleteWordBase64ByClassID
    }
}