<script setup lang="ts">
    import { ref } from 'vue';
    import AiSettings from '../components/AiSettings.vue';

    
</script>

<template>
    <div class="set-page-box">
        <el-tabs type="border-card">
            <el-tab-pane label="AI设置"><AiSettings /></el-tab-pane>
            <el-tab-pane label="提示词设置">
                软件设置
            </el-tab-pane>
            <el-tab-pane label="软件设置">
                软件设置
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<style scoped>
    
</style>