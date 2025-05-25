import { insert } from "../utils/sqlite";

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

    return {
        addWord,
        addWords
    }
}