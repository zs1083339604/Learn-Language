<script setup lang="ts">
    import { ref, onBeforeUnmount, onMounted } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import useClass from '../../hooks/useClass';
    import { show_error, show_loading, readClassData } from '../../utils/function';
    import { useAudioPlayer } from '../../hooks/useAudioPlayer';
    import useWord from '../../hooks/useWord';

    const loadingObj = show_loading("正在获取数据……");
    const router = useRouter();
    const route = useRoute();
    const classId = ref(route.params.id);
    const {getClassFullInfoByID} = useClass();
    const {getWordsByClassId} = useWord();

    let classInfo = null,
    audioData = [],
    jsonData = [];

    const audioRef = ref(null);
    // 存储要播放的音频 URL
    const audioSrc = ref('');
    // 存储当前正在播放的片段信息，用于停止
    let currentPlayingSegment = null;
    let animationFrameId = null;

    

    getClassFullInfoByID(classId.value).then((result)=>{
        if(result.rows.length == 0 || result.rows[0].isFinish == 0){
            router.back();
            loadingObj.close();
            return;
        }

        classInfo = result.rows[0];

        return readClassData(classInfo);
    }).then((result)=>{
        audioData = result.audioData;
        jsonData = result.jsonData;

        return getWordsByClassId(classId);
        
        
    }).then((result)=>{
        formatHTMLByArray(classInfo.content, jsonData, result.rows);
    }).catch((error)=>{
        show_error(error);
    }).finally(()=>{
        loadingObj.close();
    })
    
    function formatHTMLByArray(msg, jsonArray, wordArray){
        let startIndex = 0;
        const bArray = [];
        // 先循环 jsonArray 数组，用来创建内层的b标签
        for(let i = 0; i < jsonArray.length; i++){
            const item = jsonArray[i];
            const searchText = item.Metadata[0].Data.text.Text;
            // const textLength = item.Metadata[0].Data.text.Length;
            let textLength = 0;
            startIndex = msg.indexOf(searchText, startIndex);

            if(startIndex != -1){
                // 找到了字符串，判断是否是最后一项
                if(i != jsonArray.length - 1){
                    // 不是最后一项，读取下一项文字的第一个字符，因为要考虑空格和标点符号，不能单纯读取长度
                    const nextItem = jsonArray[i + 1];
                    const nextSearchText = nextItem.Metadata[0].Data.text.Text;
                    const nextStartIndex = msg.indexOf(nextSearchText, startIndex + textLength);
                    
                    if(nextStartIndex != -1){
                        textLength = nextStartIndex - startIndex;
                    }else{
                        textLength = item.Metadata[0].Data.text.Length;
                    }
                }else{
                    // 如果是最后一项
                    textLength = msg.length - startIndex;
                }

                const endIndex = startIndex + textLength;
                const subString = msg.substring(startIndex, endIndex);

                const startTime = item.Metadata[0].Data.Offset / 10000000;
                const duration = item.Metadata[0].Data.Duration / 10000000;
                const endTime = startTime + duration;
                bArray.push({
                    content: `<b>${subString}</b>`,
                    startTime,
                    endTime
                })
            }
        }

        if(bArray.length != jsonArray.length){
            show_error("分词出错，请复制必要数据联系作者。<br>数据："+JSON.stringify(classInfo), "系统错误");
            return;
        }

        const spanArray = [];
        // 循环 wordArray 创建 span
        for(let i = 0; i < wordArray.length; i++){
            const item = wordArray[i];
            console.log(item)
        }
    }
</script>

<template>
    <div class="class-show-div">
        <div class="class-show-header">
            <Breadcrumb :text="classId"/>
        </div>
        阅读课文
    </div>
</template>

<style scoped>
    
</style>