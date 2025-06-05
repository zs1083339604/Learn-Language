<script setup lang="ts">
    import { ref } from 'vue';
    import {Back} from '@element-plus/icons-vue'
    import {useRouter} from 'vue-router'
    import { Setting } from '@element-plus/icons-vue'
    import SetPage from '../pages/SetPage.vue';
    
    defineProps({
        text: {
            type: String,
            default: "未知"
        }
    })

    const setPageDialogVisiable = ref(false);
    const router = useRouter();

    const handleClick = ()=>{
        router.back();
    }
</script>

<template>
    <div class="breadcrumb-box">
        <el-button :icon="Back" circle @click="handleClick" />
        <p>当前课程：{{ text }}</p>
        <el-button class="set-button" type="primary" :icon="Setting" circle title="打开设置界面" @click="setPageDialogVisiable = true"/>
    </div>
    
    <el-dialog
        v-model="setPageDialogVisiable"
        title="设置"
        width="1024"
        align-center
    >
        <div class="set-page-dialog-outer-box">
            <SetPage></SetPage>
        </div>
        
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="setPageDialogVisiable = false">关闭</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
    .breadcrumb-box{
        width: 100%;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
    }

    .breadcrumb-box p{
        margin-left: 20px;
        flex-grow: 1;
    }

    .set-button{
        justify-items: flex-end;
    }

    .set-page-dialog-outer-box{
        height: 500px;
        overflow-y: auto;
    }
</style>