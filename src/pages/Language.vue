<script setup lang="ts">
    import { reactive, toRaw } from 'vue';
    import TTSSelect from '../components/TTSSelect.vue';
    import { show_error } from '../utils/function';
    import { useLanguagesStore } from '../store/languages';
    import { ElMessage } from 'element-plus';

    const languagesStore = useLanguagesStore();
    const form = reactive({
        title: "",
        language: "",
        voice: ""
    });

    const onSubmit = ()=>{
        languagesStore.addLanguage(toRaw(form)).then(()=>{
            ElMessage.success("添加成功");
            form.title = "";
            form.language = "";
            form.voice = "";
        }).catch((error)=>{
            show_error(error, "添加失败");
        });
    }
</script>

<template>
    <div class="language-add-box">
        <el-form :model="form" label-width="70">
            <el-form-item label="语言名称">
                <el-input v-model="form.title" />
            </el-form-item>
            <el-form-item label="选择配音">
                <TTSSelect :direction="'row'" v-model:language="form.language" v-model:voice="form.voice"/>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="onSubmit">添加语言</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<style scoped>
    
</style>