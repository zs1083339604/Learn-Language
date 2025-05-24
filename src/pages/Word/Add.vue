<script setup lang="ts">
    import { ref, onBeforeUnmount } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import { useClassStore } from '../../store/class';
    import { show_error, show_loading } from '../../utils/function';
    import WordBox from '../../components/WordBox.vue';
    import { readFile, readTextFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

    const router = useRouter();
    const route = useRoute();
    const loadingObj = show_loading("正在获取课程信息");
    const classStore = useClassStore();
    const classId = route.params.id;

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

    const items = ref([]);

    classStore.getClass(classId).then((result)=>{
        if(result.rows.length == 0){
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
            audioRef.value.ontimeupdate = handleTimeUpdate;
        }

        for(let i = 0; i < jsonData.length; i++){
            const item = jsonData[i].Metadata[0].Data;

            items.value.push(
                {
                    id: 0,
                    inlineId: 0,
                    word: item.text.Text,
                    oartOfSpeech: "名词",
                    pronunciation: "",
                    interpretation: "",
                    other: "",
                    applicable: "all",
                    spell: true,
                    startIndex: i
                }
            )

        }
    }).catch((error)=>{
        show_error(error, "获取课程信息失败");
    }).finally(()=>{
        loadingObj.close();
    })
    
    const handleTimeUpdate = () => {
        if (currentPlayingSegment && audioRef.value) {
            // 判断是否达到片段结束时间
            if (audioRef.value.currentTime >= currentPlayingSegment.endTime) {
                audioRef.value.pause();
                // audioPlayer.value.currentTime = currentPlayingSegment.startTime; // 可以选择暂停后回到起点
                currentPlayingSegment = null; // 清除片段标记
                console.log('片段播放结束。');
            }
        }
    };
    
    const nextStep = ()=>{
        console.log(items)
    }

    // 在组件卸载前释放 URL 资源，避免内存泄漏
    onBeforeUnmount(() => {
        if (audioSrc.value) {
            URL.revokeObjectURL(audioSrc.value);
            console.log('临时 URL 已撤销:', audioSrc.value);
        }

        if(audioRef.value){
            audioRef.value.removeEventListener('timeupdate', handleTimeUpdate);
            audioRef.value.onended = null; // 清除事件监听器
        }
    });

    const playAudio = (index) => {
        if (!audioRef.value || !audioSrc.value) {
            show_error("无音频数据", "无法播放音频");
            return;
        }
        const item = jsonData[index].Metadata[0].Data;
        
        // 转换时间（微软返回的很怪，不是微秒也不是毫秒）
        const startTime = item.Offset / 10000000;
        // 减法可以最大程度消除后面的读音影响
        const endTime = startTime + ((item.Duration - 800000 ) / 10000000);

        console.log(startTime, endTime, item)
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
        console.log(event, index);
    }
</script>

<template>
    <div class="word-add-box">
        <Breadcrumb :text="'aa'"></Breadcrumb>
        <div v-for="(item, index) in items">
            <WordBox v-model="items[index]" @playAudio="playAudio(index)" @mergeWord="mergeWord($event, index)"/>
        </div>

        <el-button type="primary" @click="nextStep">提交</el-button>
        <audio ref="audioRef" controls></audio>
    </div>
</template>

<style scoped>
    .word-add-box{
        overflow-y: auto;
    }
</style>