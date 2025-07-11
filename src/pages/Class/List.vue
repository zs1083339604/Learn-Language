<script setup lang="ts">
    import { ref, watch } from 'vue';
    import useClass from '../../hooks/useClass';
    import { show_loading, show_error } from '../../utils/function';
    import {useRouter, useRoute} from 'vue-router'
    import { useCommonWordsStore } from '../../store/commonWords';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import { useLanguagesStore } from '../../store/languages';
    
    const { getALLClassBaseInfoByLanguageId, deleteClass, getClassFullInfoByID } = useClass();
    const router = useRouter();
    const route = useRoute();
    const commonWordsStore = useCommonWordsStore();
    const languageId = ref(route.params.id);
    const list = ref([]);
    const languagesStore = useLanguagesStore();
    const language = ref([]);

    // 监听 route.params.id 的变化
    watch(
        () => route.params.id,
        (newId) => {
            const loadingObj = show_loading("正在获取课程列表");
            languageId.value = newId;
            getALLClassBaseInfoByLanguageId(languageId.value).then((result)=>{
                list.value = [];
                result.rows.forEach(element => {
                    list.value.push(element);
                });
                language.value = languagesStore.getItemById(languageId.value);

                return commonWordsStore.getCommonWords(languageId.value);
            }).catch((error)=>{
                show_error(error, "获取课程列表失败");
            }).finally(()=>{
                loadingObj.close();
            })
        },
        { immediate: true } // 立即执行一次，确保初始加载时也能触发逻辑
    );

    const handleDeleteClass = (id) => {
        ElMessageBox.confirm(
            '确定要删除课文吗？',
            '警告',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(()=>{
            return deleteClassFun(id)
        }).then(()=>{
            ElMessage.success("删除成功");
        }).catch((error)=>{
            if(error != "cancel"){
                show_error(error);
            }
        })
    }

    const handleDeleteLanguage = () => {
        ElMessageBox.confirm(
            '确定要删除该语言吗？其下所有课文均会被删除',
            '警告',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(()=>{
            // 删除下面的所有课文
            const ids = list.value.map(item => item.id);
            return Promise.all(ids.map(id => deleteClassFun(id)))
        }).then(()=>{
            // 删除语言
            return languagesStore.deleteLanguageById(languageId.value);
        }).then(()=>{
            ElMessage.success("删除成功");
            router.replace('/language/add');
        }).catch((error)=>{
            if(error != "cancel"){
                show_error(error, "删除失败");
            }
        })
    }

    function deleteClassFun(id){
        return new Promise((resolve, reject) => {
            getClassFullInfoByID(id).then((result)=>{
                if(result.rows.length == 1){
                    const item = result.rows[0];
                    return deleteClass(item.filePath, item.audioFileName, item.audioSrtJsonName , id);
                }else{
                    throw Error("未找到课文信息")
                }
            }).then(()=>{
                const index = list.value.findIndex(item => item.id == id);
                if(index != -1){
                    list.value.splice(index, 1);
                }
                resolve()
            }).catch((error)=>{
                reject(error);
            })
        })
    }

    const openClass = (id, isFinish)=>{
        if(isFinish == 0){
            ElMessage.warning("该课文未添加完成，请点击添加课文按钮。");
            return;
        }
        router.push('/class/show/' + id);
    }
</script>

<template>
    <div class="class-list-box">
        <div class="class-list-box-header">
            <el-button type="primary" @click="router.push('/class/add/' + languageId)">添加课文</el-button>
            <el-button type="danger" @click="handleDeleteLanguage">删除语言</el-button>
        </div>

        <div class="class-list-box-body">
            <el-card class="card-box" :class="{'noFinish': item.isFinish == 0, 'lastView': item.id == language.lastViewId}" v-for="item in list" :key="item.id" shadow="hover">
                <template #header>
                <div class="card-header">
                    <span>
                        {{ item.title }}
                        {{ item.isFinish == 0 ? ' (未添加完成)' : '' }}
                        {{ item.id == language.lastViewId ? ' (上次浏览)' : '' }}
                    </span>
                </div>
                </template>
                <p class="car-body">{{ item.content }}</p>
                <template #footer>
                    <el-button @click="openClass(item.id, item.isFinish)">阅读课文</el-button>
                    <el-button @click="handleDeleteClass(item.id)" type="danger">删除课文</el-button>
                </template>
            </el-card>
        </div>
    </div>
</template>

<style scoped>
    .class-list-box-header{
        margin-bottom: 20px;
    }

    .class-list-box-body{
        display: flex;
        flex-wrap: wrap;
    }

    .car-body{
        width: 100%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    .card-box{
        width: 300px;
        margin-right: 20px;
        margin-bottom: 20px;
    }
</style>

<style>
    .card-box.lastView,
    .card-box.lastView .el-card__header,
    .card-box.lastView .el-card__footer{
        border-color: rgb(64, 158, 255);
    }

    .card-box.noFinish,
    .card-box.noFinish .el-card__header,
    .card-box.noFinish .el-card__footer{
        border-color: rgb(245, 108, 108);
    }
</style>