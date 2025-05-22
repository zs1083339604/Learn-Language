<script setup>
import { ref } from 'vue';
import {RouterView, useRouter} from 'vue-router'
import {
  Menu as IconMenu,
  Tools,
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus';
import { connect } from './utils/sqlite';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

const inited = ref(false);

connect().then(()=>{
  inited.value = true;
  return invoke("get_exe_path");
}).then((result)=>{
  if(result.code == 200){
    // 说明：exe路径不放在optionStore中，是因为它不可更改
    localStorage.setItem("exe_path", result.data.path);
  }
}).catch((error)=>{
  ElMessageBox.alert(error, '初始化失败', {
    confirmButtonText: 'OK',
    callback: (action) => {
      const window = getCurrentWindow();
      window.close().catch(error=>{
        ElMessage.error(error);
      })
    },
  });
})

const router = useRouter();

const handleOpen = (key, keyPath) => {
  console.log(key, keyPath)
  router.push({path: "/"  + key})
}
</script>

<template>
  <div class="appBox" v-if="inited">
    <el-menu
      default-active="language"
      class="menu"
      @select="handleOpen"
    >
      <el-menu-item index="language">
        <el-icon><IconMenu /></el-icon>
        <template #title>语言库</template>
      </el-menu-item>
      <el-menu-item index="set">
        <el-icon><Tools /></el-icon>
        <template #title>设置</template>
      </el-menu-item>
    </el-menu>
    <RouterView class="router-view"></RouterView>
  </div>
</template>

<style scoped>
  .router-view{
    height: 100%;
    box-sizing: border-box;
    padding: 20px;
    flex-grow: 1;
  }

  .appBox{
    display: flex;
    height: 100%;
  }

  .menu{
    width: 200px;
  }
  
</style>