<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount, reactive } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import useClass from '../../hooks/useClass';
    import { show_error, show_loading, readClassData } from '../../utils/function';
    import { useAudioPlayer } from '../../hooks/useAudioPlayer';
    import useWord from '../../hooks/useWord';
import { ElNotification } from 'element-plus';

    const loadingObj = show_loading("正在获取数据……");
    const router = useRouter();
    const route = useRoute();
    const classId = ref(route.params.id);
    const {getClassFullInfoByID} = useClass();
    const {getWordsByClassId} = useWord();

    let classInfo = reactive({}),
    audioData = ref([]),
    jsonData = [];

    const contentArray = ref([]);
    const tabsName = ref("mainText");
    const leftClickRule = ref("play");

    getClassFullInfoByID(classId.value).then((result)=>{
        if(result.rows.length == 0 || result.rows[0].isFinish == 0){
            router.back();
            loadingObj.close();
            return;
        }

        Object.assign(classInfo, result.rows[0])

        return readClassData(classInfo);
    }).then((result)=>{
        audioData.value = result.audioData;
        jsonData = result.jsonData;

        return getWordsByClassId(classId);
        
        
    }).then((result)=>{
        contentArray.value = formatHTMLByArray(classInfo.content, jsonData, result.rows);
    }).catch((error)=>{
        show_error(error);
    }).finally(()=>{
        loadingObj.close();
    })

    const {
        audioRef,
        audioSrc,
        playSegmentDirectly,
        currentAudioTime,
        playAudio,
        pauseAudio
    } = useAudioPlayer({
        audioDataRef: audioData
    });

    const isSpanClick = ref(false);
    const spanClick = (item)=>{
        if(!isSpanClick.value){
            isSpanClick.value = true;
            switch(leftClickRule.value){
                case "play":
                    playSegmentDirectly(item.startTime, item.endTime - item.startTime);
                    break;
                case "see":
                    break;
                case "edit":
                    break;
            }
            isSpanClick.value = false;
        }
    }
    
    function formatHTMLByArray(msg, jsonArray, wordArray){
        let startIndex = 0;
        const childArray = [];
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
                childArray.push({
                    content: subString,
                    startTime,
                    endTime
                })
            }
        }

        if(childArray.length != jsonArray.length){
            show_error("分词出错，请复制必要数据联系作者。<br>数据："+JSON.stringify(classInfo), "系统错误");
            return;
        }

        const spanArray = [];
        // 循环 wordArray 创建 span
        for(let i = 0; i < wordArray.length; i++){
            const item = wordArray[i];
            let child = [], startTime = childArray[item.startIndex].startTime, endTime = 0;
            let conditionNumber = 0;

            if(i != wordArray.length - 1){
                const nextItem = wordArray[i + 1];
                conditionNumber = nextItem.startIndex;
            }else{
                conditionNumber = childArray.length;
            }

            for(let j = item.startIndex; j < conditionNumber; j++){
                const bItem = childArray[j];
                child.push(bItem);
                endTime = bItem.endTime;
            }

            spanArray.push({
                child,
                startTime,
                endTime
            })
        }

        return spanArray;
    }

    // --- 键盘事件监听 ---
    const handleKeyDown = (event) => {
        if(event.code == "Space"){
            handlePlayAudio();
        }else if(event.code == "KeyT"){
            changeTab();
        }else if(event.code == "KeyR"){
            changeLeftClickRule("play");
        }else if(event.code == "KeyE"){
            changeLeftClickRule("edit");
        }else if(event.code == "KeyS"){
            changeLeftClickRule("see");
        }
        
        console.log(event.code)
    };

    function handlePlayAudio(){
        if(audioRef.value.paused){
            playAudio();
        }else{
            pauseAudio();
        }
    }

    function changeTab(){
        if(tabsName.value == "mainText"){
            tabsName.value = "translation";
            showNotification("译文");
        }else{
            tabsName.value = "mainText";
            showNotification("正文");
        }
    }

    function changeLeftClickRule(rule){
        if(leftClickRule.value == rule){
            return;
        }
        leftClickRule.value = rule;
        if(rule == "play"){
            showNotification("左键点击：播放音频");
        }else if(rule == "edit"){
            showNotification("左键点击：编辑单词");
        }else if(rule == "see"){
            showNotification("左键点击：查看释义");
        }
    }

    function showNotification(message){
        ElNotification({
            title: '通知',
            message,
            type: 'info',
            duration: 2000
        })
    }

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });
</script>

<template>
    <div class="class-show-div">
        <div class="class-show-header">
            <Breadcrumb :text="classInfo == null ? '' : classInfo.title"/>
        </div>
        <div class="class-show-body">
            <div class="class-show-body-tool-box">
                <div class="tool-item">
                    <p>左键点击规则：</p>
                    <el-radio-group v-model="leftClickRule">
                        <el-radio-button label="播放单词" value="play" />
                        <el-radio-button label="查看释义" value="see" />
                        <el-radio-button label="编辑单词" value="edit" />
                    </el-radio-group>
                </div>
            </div>
            <div class="clss-show-body-main-content">
                <el-tabs
                    v-model="tabsName"
                    type="card"
                >
                    <el-tab-pane label="正文" name="mainText">
                        <span v-for="item in contentArray" @click="spanClick(item)">
                            <b v-for="bItem in item.child" :class="{'active': currentAudioTime > bItem.startTime && currentAudioTime < bItem.endTime}">
                                {{ bItem.content }}
                            </b>
                        </span>
                    </el-tab-pane>

                    <el-tab-pane label="译文" name="translation">
                        {{ classInfo == null ? "" : classInfo.translation}}
                    </el-tab-pane>
                </el-tabs>
            </div>
        </div>

        <audio class="playAudio" ref="audioRef" controls></audio>
    </div>
</template>

<style scoped>
    .class-show-div{
        display: flex;
        flex-direction: column;
    }
    .class-show-body{
        flex-grow: 1;
    }
    .clss-show-body-main-content b.active{
        color: red;
    }
    .playAudio{
        width: 100%;
    }
    .tool-item{
        display: flex;
        margin-bottom: 15px;
    }

    .tool-item p{
        margin-right: 10px;
    }
    .class-show-body-tool-box{
        margin-bottom: 25px;
    }
</style>