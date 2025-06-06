<script setup lang="ts">
    import { ref } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import { show_error, show_loading, deepCopy, stringToBoolean, readClassData } from '../../utils/function';
    import WordBox from '../../components/WordBox.vue';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import useClass from '../../hooks/useClass';
    import useWord from '../../hooks/useWord';
    import { useCommonWordsStore } from '../../store/commonWords';
    import { useAudioPlayer } from '../../hooks/useAudioPlayer';
    import InfiniteList from 'vue3-infinite-list';
    import useAiChat from '../../hooks/useAiChat';


    const router = useRouter();
    const route = useRoute();
    const commonWordsStore = useCommonWordsStore();
    const loadingObj = show_loading("正在获取课程信息");
    const { getClassFullInfoByID, setFinished } = useClass();
    const { addWords, getWordsByClassId, editWords } = useWord();
    const { aiAnnotation } = useAiChat();
    const classId = route.params.id;
    const model = route.params.model;
    const nextButtonLoading = ref(false);
    const aiAnnotationLoading = ref(false);
    const semiAutomaticAIAnnotationLoading = ref(false);

    const wordBoxBaseObject = {
        id: 0,
        inlineId: 0,
        word: "",
        oartOfSpeech: "noun",
        pronunciation: "",
        interpretation: "",
        other: "",
        applicable: 1,
        spell: true,
        startIndex: "",
        isSeparation: false,
        highlight: false
    };

    let classInfo = null,
    audioData = ref([]),
    jsonData = [],
    idArray = [];

    const items = ref([]);
    // 暂存的临时数组
    let newItems = [];

    getClassFullInfoByID(classId).then((result)=>{
        if(result.rows.length == 0){
            throw Error("未获取到课程信息");
        }

        classInfo = result.rows[0];

        return readClassData(classInfo);
    }).then((result)=>{
        jsonData = result.jsonData;
        audioData.value = result.audioData;

        if(model == "edit"){
            return getWordsByClassId(classId);
        }
    
        for(let i = 0; i < jsonData.length; i++){
            // 插入Word数据
            const item = jsonData[i].Metadata[0].Data;
            const tempObj = deepCopy(wordBoxBaseObject);
            tempObj.word = item.text.Text;
            tempObj.startIndex = i;

            const wordItem = commonWordsStore.getWordInfoByWord(item.text.Text);
            if(wordItem != null){
                tempObj.inlineId = wordItem.inlineId == 0 ? wordItem.id : wordItem.inlineId;
                tempObj.interpretation = wordItem.interpretation;
                tempObj.oartOfSpeech = wordItem.oartOfSpeech;
                tempObj.pronunciation = wordItem.pronunciation;
                tempObj.other = wordItem.other;
                tempObj.spell = stringToBoolean(wordItem.spell);
            }
            
            newItems.push(tempObj);
        }
    }).then((result)=>{
        if(model == "edit"){
            // 仅在编辑时，才会走到这里
            for(let i = 0; i < result.rows.length; i++){
                const item = result.rows[i];
                const tempObj = deepCopy(wordBoxBaseObject);
                tempObj.word = item.content;
                Object.assign(tempObj, item);
                tempObj.spell = stringToBoolean(item.spell);
                tempObj.isSeparation = item.content != jsonData[item.startIndex].Metadata[0].Data.text.Text;

                idArray.push(item.id);
                newItems.push(tempObj);
            }
        }
        // 在所有数据处理完毕后，一次性赋值
        items.value = newItems;
    }).catch((error)=>{
        show_error(error, "获取课程信息失败");
    }).finally(()=>{
        loadingObj.close();
    })

    const {
        audioRef,
        audioSrc,
        playSegmentDirectly
    } = useAudioPlayer({
        audioDataRef: audioData
    });

    const playAudio = (index) => {
        if (!audioRef.value || !audioSrc.value) {
            show_error("无音频数据", "无法播放音频");
            return;
        }
        const item = items.value[index];
        
        // 转换时间（微软返回的很怪，不是微秒也不是毫秒）
        const startTimeNoSub = jsonData[item.startIndex].Metadata[0].Data.Offset;
        const startTime = startTimeNoSub / 10000000;
        // 获取结束时间，因为有些单词可能合并过，不能单纯 + Duration
        const indexArray = getFullWordDataIndexArray(index);
        const lastIndex = indexArray[indexArray.length - 1];
        const lastStartTime = jsonData[lastIndex].Metadata[0].Data.Offset;
        const lastDuration = jsonData[lastIndex].Metadata[0].Data.Duration;

        const duration = (lastStartTime - startTimeNoSub  + lastDuration) / 10000000;

        playSegmentDirectly(startTime, duration);
    }

    const mergeWord = (event, index) => {
        const item = items.value[index];
        const startIndex = item.startIndex;
        
        if(event == "top"){
            // 向上合并
            if(startIndex == 0){
                ElMessage.warning("第一项，不能向上合并");
                return;
            }
            const previousItem = items.value[index - 1];
            previousItem.word = previousItem.word + item.word;
            previousItem.isSeparation = true;
            previousItem.highlight = true;
        }else if(event == "bottom"){
            // 向下合并
            if(index == items.value.length - 1){
                ElMessage.warning("最后一项，不能向下合并");
                return;
            }
            const nextItem = items.value[index + 1];
            nextItem.word = item.word + nextItem.word;
            nextItem.isSeparation = true;
            nextItem.startIndex = item.startIndex;
            nextItem.highlight = true;
        }

        items.value.splice(index, 1);
    }

    const separation = (index)=>{
        const indexArray = getFullWordDataIndexArray(index);

        if(indexArray.length == 1){
            ElMessage.warning("该项不可分离");
            return;
        }
        
        const insertArray = [];
        for(let i = 0; i < indexArray.length; i++){
            // 插入Word数据
            const index = indexArray[i];
            const item = jsonData[index].Metadata[0].Data;
            const tempObj = deepCopy(wordBoxBaseObject);
            tempObj.word = item.text.Text;
            tempObj.startIndex = index;
            tempObj.highlight = true;
            insertArray.push(tempObj);
        }

        items.value.splice(index, 1, ...insertArray);
    }

    const handleAIAnnotation = async ()=>{
        aiAnnotationLoading.value = true;
        const allWordsToAnnotate = [];
        const seenWords = new Set();

        // 收集所有需要标注的唯一单词
        items.value.forEach(item => {
            const word = item.word;
            if (word && !seenWords.has(word)) {
                allWordsToAnnotate.push(word);
                seenWords.add(word);
            }
        });

        const BATCH_SIZE = 20; // 定义每批发送的单词数量
        let startIndex = 0;
        
        try {
            while (startIndex < allWordsToAnnotate.length) {
                const currentBatchWords = allWordsToAnnotate.slice(startIndex, startIndex + BATCH_SIZE);
                
                // 发送当前批次的单词给AI
                console.log("当前批次的单词：" + currentBatchWords)
                const result = await aiAnnotation(JSON.stringify(currentBatchWords)); // 使用 await 等待AI返回
                console.log("AI标注结果：", result);

                // 解析AI返回的数据
                const annotatedDataArray = parseAIAnnotationResult(result);

                const annotatedDataMap = new Map();
                annotatedDataArray.forEach(annotation => {
                    annotatedDataMap.set(annotation.word, annotation);
                });

                // 匹配并更新items中的数据
                items.value.forEach(item => {
                    const annotation = annotatedDataMap.get(item.word);
                    if (annotation) {
                        item.oartOfSpeech = annotation.oartOfSpeech;
                        item.pronunciation = annotation.pronunciation;
                        item.interpretation = annotation.interpretation;
                        item.other = annotation.other;
                        item.applicable = annotation.applicable;
                    }
                });

                startIndex += BATCH_SIZE; // 更新起始索引，准备下一批
            }

            ElMessage.success("AI标注完成！");
        } catch (error) {
            show_error(error, "ai标注失败");
        } finally {
            aiAnnotationLoading.value = false;
        }
    }

    const nextStep = ()=>{
        // 循环判断 items 是否有未填写的数据
        let emptyDataNumber = 0;
        items.value.forEach(item => {
            if(item.word == "" || item.pronunciation == "" || item.interpretation == ""){
                emptyDataNumber++;
            }
        })

        if(emptyDataNumber != 0){
            ElMessageBox.confirm(
                '有 ' + emptyDataNumber + ' 项单词未填写读音或释义，是否继续？',
                '警告',
                {
                    confirmButtonText: '继续',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            ).then(()=>{
                nextButtonLoading.value = true;
                submit();
            }).catch(()=>{})
        }else{
            nextButtonLoading.value = true;
            submit();
        }
    }

    function submit(){
        if(model == 'add'){
            addWords(classInfo.languageId, classId, deepCopy(items.value)).then(()=>{
                return setFinished(classId);
            }).then(()=>{
                // 成功
                router.back();
                ElMessage.success("添加成功");
            }).catch((error)=>{
                show_error(error, "添加失败");
            }).finally(()=>{
                nextButtonLoading.value = false;
            })
        }else if(model == "edit"){
            const datas = deepCopy(items.value);
            const missingIds = findMissingIds(datas, idArray);
            editWords(datas, missingIds, classInfo.languageId, classId).then(()=>{
                router.back();
                ElMessage.success("修改成功");
            }).catch((error)=>{
                show_error(error, "修改失败");
            }).finally(()=>{
                nextButtonLoading.value = false;
            })
        }
    }

    /**
     * 解析AI返回的字符串，将其转换为结构化的数组。
     * @param {string} aiResult AI返回的原始字符串数据
     * @returns {Array<Object>} 解析后的词汇标注数据数组
     */
    function parseAIAnnotationResult(aiResult){
        const lines = aiResult.split('\n').filter(line => line.trim() !== ''); // 按行分割并过滤空行
        const result = [];
        let currentWordAnnotation = {};

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.includes('：')) { // 包含冒号的行是属性行
                const [key, value] = trimmedLine.split('：').map(s => s.trim());
                switch (key) {
                    case '单词':
                        currentWordAnnotation.word = value;
                        break;
                    case '词性':
                        let oartOfSpeech = value;
                        // gemini和groq在测试中会返回多个词性，只用第一个
                        const oartOfSpeechArray = oartOfSpeech.split(/[\/\,\+]/);
                        if(oartOfSpeechArray.length > 1){
                            oartOfSpeech = oartOfSpeechArray[0];
                        }
                        currentWordAnnotation.oartOfSpeech = oartOfSpeech;
                        break;
                    case '读音':
                        currentWordAnnotation.pronunciation = value;
                        break;
                    case '中文释义':
                        currentWordAnnotation.interpretation = value;
                        break;
                    case '附加说明':
                        currentWordAnnotation.other = value;
                        break;
                    case '适用性':
                        currentWordAnnotation.applicable = parseInt(value, 10); // 转换为数字
                        break;
                    default:
                        // 忽略其他未知键
                        break;
                }
            }

            if(trimmedLine.includes('适用性')){
                // 一个单词最后一项
                if (Object.keys(currentWordAnnotation).length > 0) {
                    result.push(currentWordAnnotation);
                    currentWordAnnotation = {};
                }
            }
        });

        return result;
    };

    // 从最终修改的数据中，查询已删除的ID
    function findMissingIds(array1, array2) {
        const array1Ids = new Set(array1.map(item => item.id));
        const missingIds = [];
        for (const id of array2) {
            if (!array1Ids.has(id)) {
                missingIds.push(id);
            }
        }

        return missingIds;
    }


    function getFullWordDataIndexArray(index) {
        const resultIndexArray = [];
        const startIndex = items.value[index].startIndex;
        let conditionNumber = 0;
        if(index == items.value.length - 1){
            // 最后一项
            conditionNumber = jsonData.length;
        }else{
            // 非最后一项
            const nextStartIndex = items.value[index + 1].startIndex;
            conditionNumber = nextStartIndex;
        }

        for(let i = startIndex; i < conditionNumber; i++){
            resultIndexArray.push(i);
        }

        return resultIndexArray;
    }
</script>

<template>
    <div class="word-add-box">
        <Breadcrumb :text="classInfo != null ? classInfo.title : '未知'"></Breadcrumb>

        <div class="word-list-box">
            <InfiniteList :data="items" :width="'100%'" :height="'100%'" :itemSize="150"  v-slot="{ item, index }" :overscanCount="10" style="padding: 10px;">
                <WordBox v-model="items[index]" @playAudio="playAudio(index)" @mergeWord="mergeWord($event, index)" @separation="separation(index)"/>
            </InfiniteList>
        </div>

        <div class="word-add-box-tool-box">
            <el-button type="primary" @click="nextStep" :loading="nextButtonLoading">提交</el-button>
            <el-button type="success" @click="handleAIAnnotation" :loading="aiAnnotationLoading">全自动AI标注</el-button>
            <el-button type="info" :loading="semiAutomaticAIAnnotationLoading">半自动AI标注（无需API密钥）</el-button>
        </div>
        
        <audio ref="audioRef"></audio>
    </div>
</template>

<style scoped>
    .word-add-box{
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .word-list-box{
        padding-bottom: 10px;
        flex-grow: 1;
        overflow-y: auto;
    }
</style>