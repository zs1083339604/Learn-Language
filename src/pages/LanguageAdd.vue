<script setup lang="ts">
    import { ref, reactive, nextTick } from 'vue';
    import {Back, Top, Bottom} from '@element-plus/icons-vue'
    import {useRouter, useRoute} from 'vue-router'
    import { ElMessage } from 'element-plus';
    import { useLanguagesStore } from '../store/languages';

    const router = useRouter();
    const route = useRoute();
    const languagesStore = useLanguagesStore();
    const languageId = route.params.id;
    const language = languagesStore.getItemById(languageId);
    const formStep_show = ref([true, false]);
    const formStep_1 = reactive({
        title: "",
        content: ""
    });
    const formStep_2_default_obj = {
        id: 0,
        inlineId: 0,
        word: "",
        oartOfSpeech: "名词",
        pronunciation: "",
        interpretation: "",
        other: "",
        applicable: "all",
        spell: true,
        startIndex: 0
    }
    const formStep_2 = ref([]);

    const handleClick = ()=>{
        router.push({path: "/language"})
    }

    const nextStep_1 = () => {
        if(formStep_1.title == "" || formStep_1.content == ""){
            ElMessage.error("请填写完整信息");
            return;
        }

        pushStep2(formStep_1.content, 0);

        formStep_show.value[0] = false;
        formStep_show.value[1] = true;
    }

    // 插眼：此处有个bug，当用户使用非英语输入法时，能改变里面的内容，暂时不知道怎么解决
    const handleKeydown = (event, index)=>{
        // 检查按下的键
        if(event.keyCode == 37 || event.keyCode == 39){
            // 方向键不阻止
            return;
        }else if (event.keyCode == 13) {
            // 如果是回车键，获取光标的位置
            const cursorPosition = event.target.selectionStart;
            if(cursorPosition == 0){
                ElMessage.warning("不要在首位输入回车");
                return;
            }
            // 按照光标位置分隔文字
            const textBeforeCursor = event.target.value.slice(0, cursorPosition);
            const textAfterCursor = event.target.value.slice(cursorPosition);
            if(textAfterCursor == ""){
                ElMessage.warning("不要在结尾输入回车");
                return;
            }

            formStep_2.value[index].word = textBeforeCursor;
            pushStep2(textAfterCursor, formStep_2.value[index].startIndex + cursorPosition , index);
            
            // 等待Dom更新完成后，自动对齐焦点
            nextTick(()=>{
                formStep_2.value[index+1].wordDom.focus();
                // 将光标移到最前面
                formStep_2.value[index+1].wordDom.input.setSelectionRange(0, 0);
                // 将Input的视野拉最前面
                formStep_2.value[index+1].wordDom.input.scrollLeft = 0;
            });
        } else {
            // 非允许按键，阻止默认行为
            event.preventDefault();
        }
    }

    const setInputRef = (el, index)=>{
        if(el != null){
            formStep_2.value[index].wordDom = el;
        }
    }

    const mergeWord = (type, index)=>{
        if(type == "top"){
            if(index == 0){
                ElMessage.error("该项为第1项，无法向上合并");
                return;
            }

            formStep_2.value[index-1].word = formStep_2.value[index-1].word + formStep_2.value[index].word;
            formStep_2.value.splice(index, 1);
        }else{
            if(index == formStep_2.value.length - 1){
                ElMessage.error("该项为最后一项，无法向下合并");
                return;
            }
            formStep_2.value[index].word = formStep_2.value[index].word + formStep_2.value[index+1].word;
            formStep_2.value.splice(index + 1, 1);
        }
    }

    const newStep_2 = ()=>{
        // 根据startIndex截取formStep_1.content的文字为数组
        const temp_array = [];
        let lineBreakCount = 0;
        for(let i = 0; i < formStep_2.value.length; i++){
            let startIndex = formStep_2.value[i].startIndex + lineBreakCount;
            let length = formStep_2.value[i].word.length;
            let word = "";
            for(let j = 0; j < length; ){
                let temp_word = formStep_1.content[startIndex];
                startIndex++;
                if(temp_word == "\n"){
                    lineBreakCount++;
                    continue;
                }
                word += temp_word;
                j++;
            }
            temp_array.push(word);
        }
        console.log(temp_array);
    }

    function pushStep2(word, startIndex , index = -1){
        const tempData = {...formStep_2_default_obj, word, startIndex}
        if(index == -1){
            formStep_2.value.push(tempData);
        }else{
            // 在index的位置插入
            formStep_2.value.splice(index + 1, 0, tempData);
        }
    }

    // 清除所有标点符号的函数
    function removePunctuation(str) {
        return str.replace(/[^\w\s\u4e00-\u9fa5]|_/g, '').replace(/\s+/g, ' ');
    }
</script>

<template>
    <div class="language-add-box">
        <div class="language-add-box-header">
            <el-button :icon="Back" circle @click="handleClick" />
            <p>当前语言：{{ language == undefined ? "未知" : language.title }}</p>
        </div>
        <div class="language-add-box-body step-1" v-if="formStep_show[0]">
            <el-form
                :model="formStep_1"
                label-width="68px"
                status-icon
                class="step-1-form"
            >
                <el-form-item label="课文标题" prop="title">
                    <el-input v-model="formStep_1.title" />
                </el-form-item>
                <el-form-item label="课文内容" prop="content" class="step-1-form-content">
                    <el-input v-model="formStep_1.content" type="textarea" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="nextStep_1">下一步</el-button>
                </el-form-item>
            </el-form>
        </div>
        <div class="language-add-box-body step-2" v-if="formStep_show[1]">
            <div class="step-2-item-box">
                <div class="step-2-item" v-for="item,index in formStep_2">
                    <div class="step-2-item-flex">
                        <div class="step-2-item-group-box">
                            <el-input v-model="item.word" placeholder="单词、短语、句子"
                            @keydown="handleKeydown($event, index)"
                            :ref="(el) => setInputRef(el, index)"
                            title="按回车键即可分句，为了保证配音准确请不要输入任何文字"
                            />
                        </div>
                        <div class="step-2-item-group-box">
                            <p>词性：</p>
                            <el-select
                            v-model="item.oartOfSpeech"
                            placeholder="选择词性"
                            filterable
                            >
                                <el-option label="名词" value="名词"/>
                                <el-option label="数词" value="数词"/>
                                <el-option label="量词" value="量词"/>
                                <el-option label="动词" value="动词"/>
                                <el-option label="形容词" value="形容词"/>
                                <el-option label="区别词" value="区别词"/>
                                <el-option label="副词" value="副词"/>
                                <el-option label="连词" value="连词"/>
                                <el-option label="介词" value="介词"/>
                                <el-option label="助词" value="助词"/>
                                <el-option label="语气词" value="语气词"/>
                                <el-option label="短语" value="短语"/>
                                <el-option label="短句" value="短句"/>
                                <el-option label="其他" value="其他"/>
                            </el-select>
                        </div>
                        <div class="step-2-item-group-box">
                            <p>读音：</p>
                            <el-input v-model="item.pronunciation" placeholder="读音" />
                        </div>
                        <div class="step-2-item-group-box">
                            <p>释义：</p>
                            <el-input v-model="item.interpretation" placeholder="释义" />
                        </div>
                        <div class="step-2-item-group-box">
                            <p>附加说明：</p>
                            <el-input v-model="item.other" placeholder="附加说明"/>
                        </div>
                    </div>
                    <div class="step-2-item-flex">
                        <div class="step-2-item-group-box">
                            <p>适用性：</p>
                            <el-radio-group v-model="item.applicable">
                                <el-radio value="all" size="large" border>通用</el-radio>
                                <el-radio value="this" size="large" border style="margin-left: -15px;">仅本课</el-radio>
                            </el-radio-group>
                        </div>
                        <div class="step-2-item-group-box">
                            <p>是否拼写：</p>
                            <el-switch
                                v-model="item.spell"
                                inline-prompt
                                active-text="是"
                                inactive-text="否"
                            />
                        </div>
                        <div class="step-2-item-group-box" style="margin-left: -15px;">
                            <p>工具：</p>
                            <el-button :icon="Top" circle title="向上合并" @click="mergeWord('top', index)"/>
                            <el-button :icon="Bottom" circle title="向下合并" @click="mergeWord('bottom', index)"/>
                        </div>
                    </div>
                </div>
            </div>
            <div class="step-2-buttons">
                <el-button type="primary" @click="newStep_2">添加课程</el-button>
                <el-button type="primary" disabled>智能分割</el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .language-add-box{
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .language-add-box-header{
        margin-bottom: 20px;
        display: flex;
        align-items: center;
    }

    .language-add-box-header p{
        margin-left: 20px;
    }

    .language-add-box-body{
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .step-1-form{
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }

    .step-1-form-content{
        flex-grow: 1;
    }

    .step-1-form-content .el-textarea{
        height: 100%;
    }

    .step-2-item{
        border: 1px solid rgb(220, 223, 230);
        border-radius: 10px;
        padding: 15px 15px 0;
        margin-bottom: 15px;
    }

    .step-2-item-flex{
        display: flex;
        align-items: center;
    }

    .step-2-item .step-2-item-group-box{
        margin-right: 20px;
        display: flex;
        min-width: 150px;
        align-items: center;
        margin-bottom: 20px;
    }

    .step-2-item .step-2-item-group-box p{
        flex-shrink: 0;
    }

    .step-2-item-box{
        overflow-y: auto;
    }
</style>

<style>
    .step-1-form-content .el-textarea textarea{
        height: 100%;
        resize: none;
    }
</style>