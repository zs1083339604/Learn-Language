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
import { resourceDir } from '@tauri-apps/api/path';
import { show_loading } from './utils/function';
// import { readTextFile, BaseDirectory, exists } from '@tauri-apps/plugin-fs';

// (async ()=>{
//   console.log(await exists("datas/复杂消息3.json", { baseDir: BaseDirectory.Resource}));
//   console.log(JSON.parse(await readTextFile("datas/复杂消息3.json", { baseDir: BaseDirectory.Resource})));
// })()
const loadingObj = show_loading("正在初始化");
const inited = ref(false);
connect().then(async ()=>{
  return resourceDir();
}).then((result)=>{
  // 说明：exe路径不放在optionStore中，是因为它不可更改
  localStorage.setItem("exe_path", result);
  inited.value = true;
  loadingObj.close();
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
    <RouterView class="router-view" v-if="inited"></RouterView>
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