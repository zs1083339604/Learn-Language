import { insert, select, update } from "../utils/sqlite";

export default ()=>{

    const addWord = (languageId, classId, data) => {
        return insert("word", 
            ["classId", "languageId", "inlineId", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "applicable", "spell", "startIndex"], 
            [classId, languageId, data.inlineId, data.word, data.oartOfSpeech, data.pronunciation, data.interpretation, data.other, data.applicable, data.spell, data.startIndex]
        );
    }

    const addWords = (languageId, classId, array) => {
        return new Promise(async (resolve, reject) => {
            try {
                for(let i = 0; i < array.length; i++) {
                    await addWord(languageId, classId, array[i]);
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
        return select("word", ["id", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "startIndex", "spell", "applicable"], "classId = ?", [classId]);
    }

    const updateWordById = (id, data) => {
        return update("word", {
            oartOfSpeech: data.oartOfSpeech, 
            pronunciation: data.pronunciation, 
            interpretation: data.interpretation, 
            other: data.other, 
            applicable: data.applicable,
            spell: data.spell,
            startIndex: data.startIndex
        }, "id = ?", [id]);
    }

    return {
        addWord,
        addWords,
        getWordByWord,
        getWordsByClassId,
        updateWordById
    }
}