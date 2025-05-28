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

    const router = useRouter();
    const route = useRoute();
    const commonWordsStore = useCommonWordsStore();
    const loadingObj = show_loading("正在获取课程信息");
    const { getClassFullInfoByID, setFinished } = useClass();
    const { addWords } = useWord();
    const classId = route.params.id;
    const wordBoxBaseObject = {
        id: 0,
        inlineId: 0,
        word: "",
        oartOfSpeech: "名词",
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
    jsonData = [];

    const items = ref([]);

    getClassFullInfoByID(classId).then((result)=>{
        if(result.rows.length == 0 || result.rows[0].isFinish == 1){
            throw Error("未获取到课程信息");
        }

        classInfo = result.rows[0];

        return readClassData(classInfo);
    }).then((result)=>{
        jsonData = result.jsonData;
        audioData.value = result.audioData;
    
        for(let i = 0; i < jsonData.length; i++){
            // 插入Word数据
            const item = jsonData[i].Metadata[0].Data;
            const wordItem = commonWordsStore.getWordInfoByWord(item.text.Text);
            const tempObj = deepCopy(wordBoxBaseObject);
            tempObj.word = item.text.Text;
            tempObj.startIndex = i;

            if(wordItem != null){
                tempObj.inlineId = wordItem.inlineId == 0 ? wordItem.id : wordItem.inlineId;
                tempObj.interpretation = wordItem.interpretation;
                tempObj.oartOfSpeech = wordItem.oartOfSpeech;
                tempObj.pronunciation = wordItem.pronunciation;
                tempObj.other = wordItem.other;
                tempObj.spell = stringToBoolean(wordItem.spell);
            }

            items.value.push(tempObj);
        }
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
                submit();
            }).catch(()=>{})
        }else{
            submit();
        }
    }

    function submit(){
        addWords(classInfo.languageId, classId, deepCopy(items.value)).then(()=>{
            return setFinished(classId);
        }).then(()=>{
            // 成功
            router.back();
            ElMessage.success("添加成功");
        }).catch((error)=>{
            show_error(error, "提交失败");
        });
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
        <div v-for="(item, index) in items">
            <WordBox v-model="items[index]" @playAudio="playAudio(index)" @mergeWord="mergeWord($event, index)" @separation="separation(index)"/>
        </div>

        <el-button type="primary" @click="nextStep">提交</el-button>
        <audio ref="audioRef"></audio>
    </div>
</template>

<style scoped>
    .word-add-box{
        overflow-y: auto;
    }
</style>