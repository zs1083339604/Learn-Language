<script setup lang="ts">
    import { reactive, ref } from 'vue';
    import { useLanguagesStore } from '../../store/languages';
    import {useRouter, useRoute} from 'vue-router'
    import TTSSelect from '../../components/TTSSelect.vue';
    import { ElMessage,ElMessageBox } from 'element-plus';
    import { useVoicesStore } from '../../store/voices';
    import { show_error, show_loading } from '../../utils/function';
    import Breadcrumb from '../../components/Breadcrumb.vue';
    import useClass from '../../hooks/useClass';
    import useAiChat from '../../hooks/useAiChat';

    const router = useRouter();
    const route = useRoute();
    const languagesStore = useLanguagesStore();
    const voicesStore = useVoicesStore();
    const { addClass, getNoFinishClass } = useClass();
    const {aiTranslation} = useAiChat();
    const languageId = route.params.id;
    const language = languagesStore.getItemById(languageId);
    const step_1_finish = ref(false);
    const aiTranslationLoading = ref(false);

    // 查询是否有未消完成的课程
    getNoFinishClass(languageId).then((result)=>{
        if(result.rows.length == 1){
            router.replace({
                path: "/word/operate/add/" + result.rows[0].id
            })
        }
    }).catch((error)=>{
        show_error(error, "查询课程草稿失败");
    })

    const form = reactive({
        title: "",
        content: "",
        translation: "",
        language: "",
        voice: ""
    });

    const handleAITranslation = ()=>{
        aiTranslationLoading.value = true;
        const loadingObj = show_loading("正在翻译……");
        aiTranslation(form.content).then((result)=>{
            form.translation = result;
        }).catch((error)=>{
            show_error(error, "AI翻译失败");
        }).finally(()=>{
            aiTranslationLoading.value = false;
            loadingObj.close();
        })
    }

    const nextStep = ()=>{
        if(form.title == "" || form.content == "" || form.voice == ""){
            ElMessage.warning("请填写完整信息");
            return;
        }

        if(step_1_finish.value == false){
            ElMessageBox.confirm(
                '后续无法更改课文内容，请检查后操作。',
                '警告',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            ).then(()=>{
                step_1_finish.value = true;
            }).catch(()=>{});
        
            return;
        }

        const loadingObj = show_loading("正在进行配音和分词...");

        voicesStore.startTTS(form.voice,form.content, true).then((result)=>{
            if(result.code == 200){
                return addClass({
                    languageId: languageId,
                    title: form.title,
                    content: form.content,
                    translation: form.translation,
                    audioFileName: result.data.audio_name,
                    audioSrtJsonName: result.data.json_name,
                    filePath: result.data.root_name
                });
            }else{
                throw Error(result.msg);
            }
        }).then((result)=>{
            // 添加成功
            // result.changes: 1, result.lastId: 
            router.replace({
                path: "/word/operate/add/" + result.lastId
            })
        }).catch((error)=>{
            show_error(error);
        }).finally(()=>{
            loadingObj.close();
        })
    }

    if(language == undefined){
        // 未找到课文ID
        router.back();
    }else{
        form.language = language.languageText;
        form.voice = language.voice;
    }
    
</script>

<template>
    <div class="class-add-box">
        <div class="class-add-box-header">
            <Breadcrumb :text="language == undefined ? '未知' : language.title"></Breadcrumb>
        </div>

        <div class="class-add-box-body">
            <el-form
                :model="form"
                label-width="68px"
                status-icon
                class="step-1-form"
            >
                <template v-if="!step_1_finish">
                    <el-form-item label="配音员">
                        <TTSSelect :direction="'column'" :showComponent="['voiceSelect']" v-model:language="form.language" v-model:voice="form.voice"/>
                    </el-form-item>
                    <el-form-item label="课文标题" prop="title">
                        <el-input v-model="form.title" />
                    </el-form-item>
                    <el-form-item label="课文内容" prop="content" class="full-height-textarea">
                        <el-input v-model="form.content" type="textarea" />
                    </el-form-item>
                </template>
                
                <el-form-item label="课文译文" prop="translation" class="full-height-textarea" v-if="step_1_finish" >
                    <el-input v-model="form.translation" type="textarea" placeholder="课文翻译，可不填，后续可更改"/>
                </el-form-item>
                <el-form-item>
                    <el-button type="success" @click="handleAITranslation" :loading="aiTranslationLoading" v-if="step_1_finish">AI翻译</el-button>
                    <el-button type="primary" @click="nextStep">下一步</el-button>
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<style scoped>
    .class-add-box{
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .class-add-box-header{
        margin-bottom: 20px;
        display: flex;
        align-items: center;
    }

    .class-add-box-header p{
        margin-left: 20px;
    }

    .class-add-box-body{
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .step-1-form{
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .full-height-textarea{
        flex-grow: 1;
    }

    .full-height-textarea .el-textarea{
        height: 100%;
    }
</style>

<style>
    .full-height-textarea textarea{
        height: 100%;
    }
</style>