<script setup lang="ts">
    import { ref, reactive } from 'vue';
    import { useLanguagesStore } from '../../store/languages';
    import {useRouter, useRoute} from 'vue-router'
    import {Back} from '@element-plus/icons-vue'
    import TTSSelect from '../../components/TTSSelect.vue';
    import { ElMessage,ElMessageBox, ElLoading  } from 'element-plus';
    import { useVoicesStore } from '../../store/voices';
    import { show_error } from '../../utils/function';
    import { useClassStore } from '../../store/class';
import mitter from '../../utils/mitt';

    const router = useRouter();
    const route = useRoute();
    const languagesStore = useLanguagesStore();
    const voicesStore = useVoicesStore();
    const classStore = useClassStore();
    const languageId = route.params.id;
    const language = languagesStore.getItemById(languageId);

    const form = reactive({
        title: "",
        content: "",
        language: "",
        voice: ""
    });

    const handleClick = ()=>{
        router.back();
    }

    const nextStep = ()=>{
        if(form.title == "" || form.content == "" || form.voice == ""){
            ElMessage.warning("请填写完整信息");
            return;
        }

        const loading = ElLoading.service({
            lock: true,
            text: '正在进行配音和分词...',
            background: 'rgba(0, 0, 0, 0.7)',
        })

        ElMessageBox.confirm(
            '后续无法更改课文内容，请检查后操作。',
            '警告',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(()=>{
            return voicesStore.startTTS(form.voice,form.content, true);
        }).then((result)=>{
            if(result.code == 200){
                return classStore.addClass({
                    languageId: languageId,
                    title: form.title,
                    content: form.content,
                    audioFilePath: result.data.audio_path,
                    audioSrtJsonPath: result.data.json_path
                });
            }else{
                throw Error(result.msg);
            }
        }).then((result)=>{
            // 添加成功
            // result.changes: 1, result.lastId: 
            console.log(result);
        }).catch((error)=>{
            if(error != "cancel"){
                show_error(error);
            }
        }).finally(()=>{
            loading.close();
        })
    }

    if(language == undefined){
        // 未找到课文ID
        router.push({ path: "/language"})
    }else{
        form.language = language.languageText;
        form.voice = language.voice;
    }
    
</script>

<template>
    <div class="class-add-box">
        <div class="class-add-box-header">
            <el-button :icon="Back" circle @click="handleClick" />
            <p>当前语言：{{ language == undefined ? "未知" : language.title }}</p>
        </div>

        <div class="class-add-box-body">
            <el-form
                :model="form"
                label-width="68px"
                status-icon
                class="step-1-form"
            >
                <el-form-item label="配音员">
                    <TTSSelect :direction="'column'" :showComponent="['voiceSelect']" v-model:language="form.language" v-model:voice="form.voice"/>
                </el-form-item>
                <el-form-item label="课文标题" prop="title">
                    <el-input v-model="form.title" />
                </el-form-item>
                <el-form-item label="课文内容" prop="content" class="full-height-textarea">
                    <el-input v-model="form.content" type="textarea" />
                </el-form-item>
                <el-form-item>
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