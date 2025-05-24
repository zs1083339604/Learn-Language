<script setup lang="ts">
    import { ref, reactive, watch } from 'vue';
    import { useLanguagesStore } from '../store/languages';
    import { useRouter, RouterView } from 'vue-router'
    import { show_error } from '../utils/function';
    import AddLanguage from '../components/AddLanguage.vue';
    import { storeToRefs } from 'pinia';
    
    const router = useRouter();
    const languagesStore = useLanguagesStore();
    languagesStore.getLanguages().catch((error)=>{
        show_error(error);
    })
    const {languages} = storeToRefs(languagesStore);
    const treeDom = ref(null);
    const addLanguageRef = ref(null);
    const languagesList = ref([]);

    watch(languages, (value)=>{
        languagesList.value = [];
        value.forEach(item=>{
            languagesList.value.push({...item, leaf: false});
        })
    });

    const loadingButtonObject = reactive({
        addLanguageBtn: false
    })

    const defaultProps = {
        children: 'children',
        label: 'title',
        id: 'id',
        isLeaf: 'leaf'
    }

    const addLanguage = ()=>{
        addLanguageRef.value.show({
            title: "",
            language: "",
            voice: ""
        });
    }

    const loadNode = (node, resolve) => {
        if (node.level === 0) {
            return resolve([])
        }

        if (node.level === 1) {
            console.log(node);
            return resolve([])
        }

        if (node.level > 1) return resolve([]);
    }

    const addClass = (data)=>{
        router.push({
            path: "/class/add/" + data.id
        })
    }
    
</script>

<template>
    <div class="language-root-box">
        <div class="tool-box">
            <div class="add-language">
                <el-row>
                    <el-col :span="4"><el-button type="primary" @click="addLanguage" :loading="loadingButtonObject.addLanguageBtn">添加语言</el-button></el-col>
                </el-row>
            </div>
        </div>
        <div class="language-list">
            <el-tree
                :props="defaultProps"
                node-key="id"
                :expand-on-click-node="false"
                ref="treeDom"
                empty-text="无内容，请添加语言"
                :data="languagesList"
            >
                <template #default="{ node, data }">
                    <div class="tree-node-box">
                        <span>{{ node.label }}</span>
                        <div class="tree-node-tool-box">
                            <el-button type="primary" link @click="addClass(data)">添加课文</el-button>
                            <el-button
                                style="margin-left: 4px"
                                type="danger"
                                link
                                @click="remove(node, data)"
                            >
                            删除语言
                            </el-button>
                        </div>
                    </div>
                </template>
            </el-tree>
        </div>

        <AddLanguage ref="addLanguageRef"/>

        <RouterView></RouterView>
    </div>
</template>

<style scoped>
    .tool-box{
        margin-bottom: 20px;
    }

    .tree-node-box {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 14px;
        padding-right: 8px;
    }
</style>