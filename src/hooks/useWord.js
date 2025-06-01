import { insert, select, update, deleteData } from "../utils/sqlite";

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

    return {
        addWord,
        addWords,
        getWordByWord,
        getWordsByClassId,
        updateWordById,
        editWords,
        deleteWordsByClassId
    }
}