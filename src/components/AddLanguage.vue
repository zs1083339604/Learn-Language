<script setup lang="ts">
    import { reactive, ref, toRaw } from 'vue';
    import TTSSelect from './TTSSelect.vue';
    import { useLanguagesStore } from '../store/languages';
    import { show_error } from '../utils/function';

    const dialogVisible = ref(false);
    const languagesStore = useLanguagesStore();

    const form = reactive({
        title: "",
        language: "",
        voice: ""
    });

    const onSubmit = ()=>{
        languagesStore.addLanguage(toRaw(form)).then(()=>{
            hide();
        }).catch((error)=>{
            show_error(error, "添加失败");
        });
    }

    const show = (obj) => {
        Object.assign(form, obj);
        dialogVisible.value = true;
    }

    const hide = ()=>{
        dialogVisible.value = false;
    }

    defineExpose({show, hide})
</script>

<template>
    <el-dialog v-model="dialogVisible" title="添加语言" width="700">
        <el-form :model="form" label-width="auto">
            <el-form-item label="语言名称">
                <el-input v-model="form.title" />
            </el-form-item>
            <el-form-item label="选择配音">
                <TTSSelect :direction="'row'" v-model:language="form.language" v-model:voice="form.voice"/>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="onSubmit">添加语言</el-button>
                <el-button @click="hide">取消</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
</template>

<style scoped>
    
</style>