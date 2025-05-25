<script setup lang="ts">
    import { ref, onBeforeUnmount, onMounted } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import { show_error, show_loading, deepCopy } from '../../utils/function';
    import WordBox from '../../components/WordBox.vue';
    import { readFile, readTextFile, exists } from '@tauri-apps/plugin-fs';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import useClass from '../../hooks/useClass';
    import useWord from '../../hooks/useWord';

    const router = useRouter();
    const route = useRoute();
    const loadingObj = show_loading("正在获取课程信息");
    const { getClass, setFinished } = useClass();
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

    let filePath = "", 
    audioFilePath = "", 
    audioSrtJsonPath = "", 
    classInfo = null,
    audioData = [],
    jsonData = [];

    const audioRef = ref(null);
    // 存储要播放的音频 URL
    const audioSrc = ref('');
    // 存储当前正在播放的片段信息，用于停止
    let currentPlayingSegment = null;
    let animationFrameId = null;

    const items = ref([]);

    getClass(classId).then((result)=>{
        if(result.rows.length == 0 || result.rows[0].isFinish == 1){
            throw Error("未获取到课程信息");
        }

        classInfo = result.rows[0];
        filePath = classInfo.filePath;
        audioFilePath = filePath + "/" + result.rows[0].audioFileName;
        audioSrtJsonPath = filePath + "/" + result.rows[0].audioSrtJsonName;
        return exists(audioFilePath);

    }).then((exis)=>{
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
        
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        // 使用 URL.createObjectURL() 创建临时 URL
        const url = URL.createObjectURL(audioBlob);
        
        audioSrc.value = url;
        if (audioRef.value) {
            audioRef.value.src = audioSrc.value;
        }

        for(let i = 0; i < jsonData.length; i++){
            // 插入Word数据
            const item = jsonData[i].Metadata[0].Data;
            const tempObj = deepCopy(wordBoxBaseObject);
            tempObj.word = item.text.Text;
            tempObj.startIndex = i;
            items.value.push(tempObj);
        }
    }).catch((error)=>{
        show_error(error, "获取课程信息失败");
    }).finally(()=>{
        loadingObj.close();
    })

    const updateTime = () => {
        // 如果音频暂停或结束，则停止RAF循环
        // 注意：也可以选择在暂停时让RAF继续运行，以便在resume时立即更新
        // 但为了节约资源，通常会在暂停时停止
        // 在这个场景下，onpause事件会主动停止RAF，所以这里可以简化
        // 保持这个检查也是安全的，以防万一
        if (!audioRef.value || audioRef.value.paused || audioRef.value.ended) {
            // 如果已经停止，就不再请求下一帧了
            // 确保 animationFrameId 被 onpause/onended 清除
            return;
        }
        
        if (currentPlayingSegment && audioRef.value) {
            // 判断是否达到片段结束时间
            if (audioRef.value.currentTime >= currentPlayingSegment.endTime) {
                audioRef.value.pause();
                currentPlayingSegment = null;
            }
        }

        // 只有在需要继续更新时才请求下一帧
        animationFrameId = requestAnimationFrame(updateTime);
    };

    onMounted(()=>{
        if (audioRef.value) {
            // 监听播放事件，启动 requestAnimationFrame 循环
            audioRef.value.onplay = () => {
                // 只有在没有RAF循环在运行时才启动它
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(updateTime);
                    console.log('RAF loop started on play');
                }
            };
            // 监听暂停事件，停止 requestAnimationFrame 循环
            audioRef.value.onpause = () => {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                    console.log('RAF loop stopped on pause');
                }
            };
            // 监听结束事件，停止 requestAnimationFrame 循环
            audioRef.value.onended = () => {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                    console.log('RAF loop stopped on ended');
                }
            };

            // 监听 seek 事件，当用户拖动进度条时
            audioRef.value.onseeking = () => {
                // 在这里强制停止RAF，然后让onplay再次启动，以确保一致性
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            };
        }
    })

    // 在组件卸载前释放 URL 资源，避免内存泄漏
    onBeforeUnmount(() => {
        if (audioSrc.value) {
            URL.revokeObjectURL(audioSrc.value);
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        if(audioRef.value){
            audioRef.value.onplay = null;
            audioRef.value.onpause = null;
            audioRef.value.onended = null;
            audioRef.value.onseeking = null;
        }
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

        const endTime = startTime + ((lastStartTime - startTimeNoSub  + lastDuration) / 10000000);

        // 设置当前播放时间
        audioRef.value.currentTime = startTime;
        // 存储当前播放片段的结束时间，供 timeupdate 监听
        currentPlayingSegment = {
            startTime: startTime,
            endTime: endTime
        };
        // 播放
        audioRef.value.play();
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
        addWords(classId, deepCopy(items.value)).then(()=>{
            return setFinished(classId);
        }).then(()=>{
            // 成功
            router.push("/");
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