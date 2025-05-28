<script setup lang="ts">
    import { ref, watch } from 'vue';
    import useClass from '../../hooks/useClass';
    import { show_loading, show_error } from '../../utils/function';
    import {useRouter, useRoute} from 'vue-router'
    import { useCommonWordsStore } from '../../store/commonWords';
import { ElMessage } from 'element-plus';
    
    const { getALLClassBaseInfoByLanguageId } = useClass();
    const router = useRouter();
    const route = useRoute();
    const commonWordsStore = useCommonWordsStore();
    const languageId = ref(route.params.id);
    const list = ref([]);

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

                return commonWordsStore.getCommonWords(languageId.value);
            }).catch((error)=>{
                show_error(error, "获取课程列表失败");
            }).finally(()=>{
                loadingObj.close();
            })
        },
        { immediate: true } // 立即执行一次，确保初始加载时也能触发逻辑
    );

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
            <el-button type="danger">删除语言</el-button>
        </div>

        <div class="class-list-box-body">
            <el-card class="card-box" :class="{'noFinish': item.isFinish == 0}" v-for="item in list" :key="item.id" shadow="hover">
                <template #header>
                <div class="card-header">
                    <span>
                        {{ item.title }}
                        {{ item.isFinish == 0 ? ' (未添加完成)' : '' }}
                    </span>
                </div>
                </template>
                <p class="car-body">{{ item.content }}</p>
                <template #footer>
                    <el-button @click="openClass(item.id, item.isFinish)">阅读课文</el-button>
                    <el-button type="danger">删除课文</el-button>
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