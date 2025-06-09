<script setup lang="ts">
    import { ref, onMounted, onBeforeUnmount, reactive, watch, nextTick } from 'vue';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import {useRouter, useRoute} from 'vue-router'
    import useClass from '../../hooks/useClass';
    import { show_error, show_loading, readClassData, stringToBoolean, deepCopy } from '../../utils/function';
    import { useAudioPlayer } from '../../hooks/useAudioPlayer';
    import useWord from '../../hooks/useWord';
    import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
    import WordMeaningDisplay from '../../components/WordMeaningDisplay.vue';
    import WordBox from '../../components/WordBox.vue';
    import { Headset, VideoPlay } from '@element-plus/icons-vue'
    import { useLanguagesStore } from '../../store/languages';
    import useAiChat from '../../hooks/useAiChat';

    const loadingObj = show_loading("正在获取数据……");
    const router = useRouter();
    const route = useRoute();
    const languagesStore = useLanguagesStore();
    const classId = ref(route.params.id);
    const {getClassFullInfoByID, editTranslationById, deleteClass} = useClass();
    const {getWordsByClassId, updateWordById, getWordBase64ByWord} = useWord();
    const {aiTranslation} = useAiChat();

    let classInfo = reactive({
        translation: ""
    }),
    audioData = ref([]),
    jsonData = [],
    wordArray = ref([]),
    sentenceArray = ref([]);

    const punctuationReg = /[，。？！【】（）《》“”；：\.\,\[\]\<\>\"\'「」]/;
    const sentenceDrawer = ref(false);
    const aiTranslationLoading = ref(false);

    const contentArray = ref([]);
    const tabsName = ref("mainText");
    const leftClickRule = ref("play");
    // 用于引用 WordMeaningDisplay 组件实例
    const wordMeaningDisplayRef = ref(null);
    // 控制组件的显示状态
    const isDisplayingWordMeaning = ref(false);
    const currentWordData = reactive({
        word: '未知单词',
        oartOfSpeech: '未知',
        pronunciation: '',
        interpretation: '无释义',
        other: '',
        spell: false
    });
    // 当前对单词操作的下标
    const nowWordOperateIndex = ref(-1);
    // 单词编辑弹窗
    const dialogWordEditVisible = ref(false);
    const dialogTranslationEditVisible = ref(false);
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
    const wordEditData = reactive({
        ...wordBoxBaseObject
    });

    // 监听单词操作
    watch(nowWordOperateIndex, (newValue, oldValue)=>{
        if(newValue < 0 || newValue >= contentArray.value.length){
            return;
        }

        const item = contentArray.value[newValue];
        seek(item.startTime);
        const wordItem = wordArray.value[newValue];
        switch(leftClickRule.value){
            case "play":
                playWord(wordItem.content);
                break;
            case "see":
                openMeaningDisplay(wordItem.id);
                break;
            case "edit":
                editWord(wordItem);
                break;
        }
    });

    getClassFullInfoByID(classId.value).then((result)=>{
        if(result.rows.length == 0 || result.rows[0].isFinish == 0){
            router.back();
            loadingObj.close();
            return;
        }

        if(!result.rows[0].translation){
            // 译文不能为null或undefined
            result.rows[0].translation = "";
        }
        Object.assign(classInfo, result.rows[0])

        return readClassData(classInfo);
    }).then((result)=>{
        audioData.value = result.audioData;
        jsonData = result.jsonData;

        return getWordsByClassId(classId.value);
        
        
    }).then((result)=>{
        wordArray.value = result.rows;
        return languagesStore.setLastViewId(classInfo.languageId, classId.value);
    }).then(()=>{
        contentArray.value = formatHTMLByArray(classInfo.content);
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
        pauseAudio,
        seek
    } = useAudioPlayer({
        audioDataRef: audioData
    });

    const audioWordRef = ref(null);

    const isSpanClick = ref(false);
    const pClick = (index)=>{
        if(!isSpanClick.value){
            isSpanClick.value = true;
            // 使用 watch 如果点击的单词相同，不会触发，所以先设置成别的值
            nowWordOperateIndex.value = -1;
            nextTick(()=>{
                nowWordOperateIndex.value = index;
                isSpanClick.value = false;
            })
        }
    }

    const playWord = (word) => {
        getWordBase64ByWord(word, classInfo.languageId, classId.value).then((result)=>{
            // 停止播放音频
            pauseAudio();
            if(audioWordRef.value){
                audioWordRef.value.src = "data:audio/mp3;base64," + result;
                audioWordRef.value.play();
            }else{
                throw Error("未找到音频播放器");
            }
        }).catch((error)=>{
            show_error(error, "播放音频失败")
        })
    }

    const handleDisplayClose = () => {
        isDisplayingWordMeaning.value = false;
    };

    function editWord(item){
        Object.assign(wordEditData, item, {
            word: item.content,
            spell: stringToBoolean(item.spell),
            applicable: parseInt(item.applicable)
        });
        dialogWordEditVisible.value = true;
    }

    const handleEditWord = ()=>{
        updateWordById(wordEditData.id, deepCopy(wordEditData), wordEditData.sort).then(()=>{
            const index = wordArray.value.findIndex(item => item.id == wordEditData.id);
            if(index == -1){
                ElMessage.warning("单词不存在");
                return;
            }
            Object.assign(wordArray.value[index], {
                oartOfSpeech: wordEditData.oartOfSpeech,
                pronunciation: wordEditData.pronunciation,
                interpretation: wordEditData.interpretation,
                other: wordEditData.other,
                spell: wordEditData.spell ? "true" : "false",
                applicable: String(wordEditData.applicable)
            });
            ElMessage.success("修改成功");
            dialogWordEditVisible.value = false;
        }).catch((error)=>{
            show_error(error, "单词修改失败");
        });
    };

    const handleEditTranslation = ()=>{
        editTranslationById(classId.value, classInfo.translation).then(()=>{
            ElMessage.success("修改成功");
            dialogTranslationEditVisible.value = false;
        }).catch((error)=>{
            show_error(error, "译文修改失败");
        })
    }

    const editWords = ()=>{
        router.push({
            path: "/word/operate/edit/" + classId.value
        });
    }

    const handleDeleteClass = ()=>{
        ElMessageBox.confirm(
            '确定要删除课文吗？',
            '警告',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(()=>{
            return deleteClass(classInfo.filePath, classInfo.audioFileName, classInfo.audioSrtJsonName , classId.value);
        }).then(()=>{
            ElMessage.success("删除成功");
            router.replace({
                path: "/class/list/" + classInfo.languageId
            })
        }).catch((error)=>{
            if(error != "cancel"){
                show_error(error);
            }
        })
    }

    const handleAITranslation = ()=> {
        aiTranslationLoading.value = true;
        aiTranslation(classInfo.content).then((result)=>{
            classInfo.translation = result;
        }).catch((error)=>{
            show_error(error, "AI翻译失败");
        }).finally(()=>{
            aiTranslationLoading.value = false;
        })
    }

    const playSentence = (index)=>{
        const item = sentenceArray.value[index];
        // console.log(sentenceArray.value[index])
        playSegmentDirectly(item.startTime, item.endTime - item.startTime)
    }

    function openDialog(){
        // 对话框打开停止监听
        window.removeEventListener('keyup', handleKeyUp);
    }

    function closeDialog(){
        // 对话框关闭重新监听
        window.addEventListener('keyup', handleKeyUp);
    }

    function openMeaningDisplay(id){
        const index = wordArray.value.findIndex(item => item.id == id);
        if(index == -1){
            ElMessage.warning("单词不存在");
            return;
        }
        const item = wordArray.value[index];

        Object.assign(currentWordData, {
            word: item.content,
            oartOfSpeech: item.oartOfSpeech,
            pronunciation: item.pronunciation,
            interpretation: item.interpretation,
            other: item.other,
            spell: stringToBoolean(item.spell)
        });
        
        if (wordMeaningDisplayRef.value) {
            wordMeaningDisplayRef.value.show(currentWordData);
        }
    };
    
    function formatHTMLByArray(msg){
        let startIndex = 0;
        const childArray = [];
        // 分句需要的变量
        let sentenceMsg = "", sentenceStartTime = 0, sentenceEndTime = 0;
        
        // 先循环 jsonData 数组，用来创建内层的b标签
        for(let i = 0; i < jsonData.length; i++){
            const item = jsonData[i];
            const searchText = item.Metadata[0].Data.text.Text;
            const jsonTextLength = item.Metadata[0].Data.text.Length;
            let textLength = 0;
            startIndex = msg.indexOf(searchText, startIndex);

            if(startIndex != -1){
                // 找到了字符串，判断是否是最后一项
                if(i != jsonData.length - 1){
                    // 不是最后一项，读取下一项文字的第一个字符，因为要考虑空格和标点符号，不能单纯读取长度
                    const nextItem = jsonData[i + 1];
                    const nextSearchText = nextItem.Metadata[0].Data.text.Text;
                    const nextStartIndex = msg.indexOf(nextSearchText, startIndex + jsonTextLength);

                    if(nextStartIndex != -1){
                        textLength = nextStartIndex - startIndex;
                    }else{
                        textLength = jsonTextLength;
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

                if(sentenceMsg == ""){
                    sentenceStartTime = startTime;
                }
                sentenceMsg += subString;
                sentenceEndTime = endTime;
                // 判断subString是否包含标点符号，用来分句
                if(punctuationReg.test(subString)){
                    sentenceArray.value.push({
                        content: sentenceMsg,
                        startTime: sentenceStartTime,
                        endTime: sentenceEndTime
                    });
                    sentenceMsg = "";
                }else if(i == jsonData.length - 1){
                    sentenceArray.value.push({
                        content: sentenceMsg,
                        startTime: sentenceStartTime,
                        endTime: sentenceEndTime
                    });
                }
            }
        }

        if(childArray.length != jsonData.length){
            show_error("分词出错，请复制必要数据联系作者。<br>数据："+JSON.stringify(classInfo), "系统错误");
            return;
        }

        const spanArray = [];
        // 循环 wordArray 创建 span
        for(let i = 0; i < wordArray.value.length; i++){
            const item = wordArray.value[i];
            let child = [], startTime = childArray[item.startIndex].startTime, endTime = 0;
            let conditionNumber = 0;
            let isBr = false;

            if(i != wordArray.value.length - 1){
                const nextItem = wordArray.value[i + 1];
                conditionNumber = nextItem.startIndex;
            }else{
                conditionNumber = childArray.length;
            }

            for(let j = item.startIndex; j < conditionNumber; j++){
                const bItem = childArray[j];
                if(/\n/.test(bItem.content)){
                    isBr = true;
                }
                child.push(bItem);
                endTime = bItem.endTime;
            }

            spanArray.push({
                child,
                startTime,
                endTime,
                isBr
            })
        }

        return spanArray;
    }

    // --- 键盘事件监听 ---
    const handleKeyUp = (event) => {
        if(event.code == "Space"){
            handlePlayAudio();
            event.preventDefault();
        }else if(event.code == "KeyT"){
            changeTab();
            event.preventDefault();
        }else if(event.code == "KeyR"){
            changeLeftClickRule("play");
        }else if(event.code == "KeyE"){
            changeLeftClickRule("edit");
        }else if(event.code == "KeyS"){
            changeLeftClickRule("see");
        }else if(event.code == "KeyC"){
            closeMeaningDisplay();
        }else if(event.code == "ArrowUp"){
            if(nowWordOperateIndex.value < contentArray.value.length - 1){
                nowWordOperateIndex.value++;
            }
            event.preventDefault();
        }else if(event.code == "ArrowDown"){
            if(nowWordOperateIndex.value > 0){
                nowWordOperateIndex.value--;
            }
            event.preventDefault();
        }
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

    function closeMeaningDisplay(){
        if (wordMeaningDisplayRef.value) {
            wordMeaningDisplayRef.value.hide();
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
        window.addEventListener('keyup', handleKeyUp);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('keyup', handleKeyUp);
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
                    <p>点击规则：</p>
                    <el-radio-group v-model="leftClickRule">
                        <el-radio-button label="播放单词" value="play" />
                        <el-radio-button label="查看释义" value="see" />
                        <el-radio-button label="编辑单词" value="edit" />
                    </el-radio-group>
                </div>
                <div class="tool-item">
                    <p>全篇工具：</p>
                    <el-button @click="editWords">编辑单词</el-button>
                    <el-button @click="dialogTranslationEditVisible = true">编辑译文</el-button>
                    <el-button type="success" @click="sentenceDrawer = true">句子朗读</el-button>
                    <el-button type="danger" @click="handleDeleteClass">删除课文</el-button>
                </div>
            </div>
            <div class="clss-show-body-main-content">
                <el-tabs
                    v-model="tabsName"
                    type="card"
                >
                    <el-tab-pane label="正文" name="mainText">
                        <template v-for="item,index in contentArray">
                            <p @click="pClick(index)" :class="['word-p', `pos-${wordArray[index].oartOfSpeech}`]">
                                <span 
                                    v-for="bItem in item.child" 
                                    :class="{'active': currentAudioTime > bItem.startTime && currentAudioTime < bItem.endTime}"
                                >
                                    {{ bItem.content.replace(/ /g, '&nbsp;') }}
                                </span>
                            </p>
                            <br v-if="item.isBr" />
                        </template>
                    </el-tab-pane>

                    <el-tab-pane label="译文" name="translation" v-html="classInfo.translation.replace(/\n/g, '<br>')">
                    </el-tab-pane>
                </el-tabs>
            </div>
        </div>

        <!-- 单词详情 -->
        <WordMeaningDisplay
        ref="wordMeaningDisplayRef" 
        v-model="isDisplayingWordMeaning"
        :data="currentWordData"
        @close="handleDisplayClose" />

        <!-- 单词编辑 -->
        <el-dialog v-model="dialogWordEditVisible" title="编辑单词" width="1100" @close="closeDialog" @open="openDialog">
            <WordBox v-model="wordEditData" :showTool="false"/>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogWordEditVisible = false">取消</el-button>
                    <el-button type="primary" @click="handleEditWord">确认</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 译文编辑 -->
        <el-dialog v-model="dialogTranslationEditVisible" title="编辑译文" width="1100" @close="closeDialog" @open="openDialog">
            <el-input
                v-model="classInfo.translation"
                :rows="20"
                type="textarea"
                placeholder="译文"
            />
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogTranslationEditVisible = false">取消</el-button>
                    <el-button type="success" @click="handleAITranslation" :loading="aiTranslationLoading">AI翻译</el-button>
                    <el-button type="primary" @click="handleEditTranslation">确认</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 句子朗读 -->
        <el-drawer
            v-model="sentenceDrawer"
            title="句子朗读"
            :direction="'rtl'"
        >
            <div class="sentence-box">
                <div class="sentence-item" v-for="item,index in sentenceArray">
                    <p>{{ item.content.replace(punctuationReg, '') }}</p>
                    <el-button :icon="VideoPlay" circle @click="playSentence(index)"/>
                </div>
            </div>
        </el-drawer>

        <!-- 音频播放 -->
        <audio class="playAudio" ref="audioRef" controls></audio>
        <!-- 单词播放 -->
        <audio ref="audioWordRef"></audio>
    </div>
</template>

<style scoped>
    .class-show-div{
        display: flex;
        flex-direction: column;
    }
    .class-show-body{
        flex-grow: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }
    .clss-show-body-main-content{
        flex-grow: 1;
        overflow-y: auto;
    }
    .clss-show-body-main-content span.active{
        color: red;
    }
    .playAudio{
        flex-shrink: 0;
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

    .el-tabs--top{
        height: 100%;
    }

    .sentence-item{
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        border: 1px solid #ccc;
        padding: 5px;
    }

    .word-p{
        cursor: pointer;
        user-select: none;
        position: relative; /* 相对定位，以便 ::after 绝对定位 */
        display: inline-block; /* 确保能应用宽度和定位 */
        padding-bottom: 5px; /* 为下划线留出空间 */
    }

    .word-p::after {
        content: ''; /* 伪元素必须有 content */
        position: absolute;
        left: 0;
        bottom: 0; /* 定位在单词下方 */
        width: 90%; /* 留一点空隙 */
        height: 3px; /* 下划线高度 */
        border-radius: 2px; /* 稍微圆角 */
        transition: background-color 0.3s ease; /* 颜色切换动画 */
    }

    /* 根据词性动态绑定的类名和颜色 */
    .pos-noun::after {
        background-color: #67C23A; /* 名词 */
    }

    .pos-numeral::after {
        background-color: #E6A23C; /* 数词 */
    }

    .pos-measure_word::after {
        background-color: #F56C6C; /* 量词 */
    }

    .pos-verb::after {
        background-color: #409EFF; /* 动词 */
    }

    .pos-adjective::after {
        background-color: #909399; /* 形容词 */
    }

    .pos-distinguishing_word::after {
        background-color: #B3E19D; /* 区别词 */
    }

    .pos-adverb::after {
        background-color: #606266; /* 副词 */
    }

    .pos-conjunction::after {
        background-color: #D3DCE6; /* 连词 */
    }

    .pos-preposition::after {
        background-color: #EBEEF5; /* 介词 */
    }

    .pos-auxiliary::after {
        background-color: #F2F6FC; /* 助词 */
    }

    .pos-modal_particle::after {
        background-color: #FDE2E2; /* 语气词 */
    }

    .pos-phrase::after {
        background-color: #9FE6B8; /* 短语 */
    }

    .pos-sentence_fragment::after {
        background-color: #BFE8F6; /* 短句 */
    }

    .pos-pronoun::after {
        background-color: #F7B3D0; /* 代词 */
    }

    .pos-interjection::after {
        background-color: #FFD700; /* 叹词 */
    }

    .pos-onomatopoeia::after {
        background-color: #ADD8E6; /* 拟声词 */
    }

    .pos-morpheme::after {
        background-color: #DDA0DD; /* 语素 */
    }

    .pos-other::after {
        background-color: #D9D9D9; /* 其他 */
    }

</style>

<style>
    .el-tabs__content{
        overflow-y: auto !important;
        padding-bottom: 10px;
    }
</style>