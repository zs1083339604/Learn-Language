<script setup lang="ts">
    import { ref } from 'vue';
    import {Back} from '@element-plus/icons-vue'
    import {useRouter} from 'vue-router'

    defineProps({
        text: {
            type: String,
            default: "未知"
        }
    })

    const router = useRouter();

    const handleClick = ()=>{
        router.back();
    }
</script>

<template>
    <div class="breadcrumb-box">
        <el-button :icon="Back" circle @click="handleClick" />
        <p>当前课程：{{ text }}</p>
    </div>
</template>

<style scoped>
    .breadcrumb-box{
        margin-bottom: 20px;
        display: flex;
        align-items: center;
    }

    .breadcrumb-box p{
        margin-left: 20px;
    }
</style>