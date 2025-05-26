import { insert, select } from "../utils/sqlite";

export default ()=>{

    const addWord = (classId, data) => {
        return insert("word", 
            ["classId", "inlineId", "content", "oartOfSpeech", "pronunciation", "interpretation", "other", "applicable", "spell", "startIndex"], 
            [classId, data.inlineId, data.word, data.oartOfSpeech, data.pronunciation, data.interpretation, data.other, data.applicable, data.spell, data.startIndex]
        );
    }

    const addWords = (classId, array) => {
        return new Promise(async (resolve, reject) => {
            try {
                for(let i = 0; i < array.length; i++) {
                    await addWord(classId, array[i]);
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

    return {
        addWord,
        addWords,
        getWordByWord
    }
}