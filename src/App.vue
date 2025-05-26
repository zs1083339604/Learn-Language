<script setup>
import { ref } from 'vue';
import {RouterView} from 'vue-router'
import {
  Menu as IconMenu,
  Tools,
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus';
import { connect } from './utils/sqlite';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { resourceDir } from '@tauri-apps/api/path';
import { show_loading } from './utils/function';
import { useLanguagesStore } from './store/languages';
import { storeToRefs } from 'pinia';
// import { readTextFile, BaseDirectory, exists } from '@tauri-apps/plugin-fs';

// (async ()=>{
//   console.log(await exists("datas/复杂消息3.json", { baseDir: BaseDirectory.Resource}));
//   console.log(JSON.parse(await readTextFile("datas/复杂消息3.json", { baseDir: BaseDirectory.Resource})));
// })()
const loadingObj = show_loading("正在初始化");
const inited = ref(false);
const languagesStore = useLanguagesStore();
connect().then(async ()=>{
  return resourceDir();
}).then((result)=>{
  // 说明：exe路径不放在optionStore中，是因为它不可更改
  localStorage.setItem("exe_path", result);
  return languagesStore.getLanguages();
}).then(()=>{
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

const {languages} = storeToRefs(languagesStore);

</script>

<template>
  <div class="appBox" v-if="inited">
    <el-menu
      default-active="/language/add"
      :router="true"
      class="menu"
    >
      <!-- <el-menu-item index="language">
        <el-icon><IconMenu /></el-icon>
        <template #title>语言库</template>
      </el-menu-item> -->
      <el-sub-menu index="/language">
        <template #title>
          <el-icon><IconMenu /></el-icon>
          <span>语言库</span>
        </template>
        <el-menu-item-group>
          <el-menu-item :index="'/language/add'">添加语言</el-menu-item>
        </el-menu-item-group>
        <el-menu-item-group title="语言列表">
          <template v-for="item in languages">
            <el-menu-item :index="'/class/list/'+item.id">{{ item.title }}</el-menu-item>
          </template>
        </el-menu-item-group>
      </el-sub-menu>
      <el-menu-item index="/set">
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
    overflow-y: auto;
  }
  
</style>