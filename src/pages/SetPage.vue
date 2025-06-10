<script setup lang="ts">
    import { reactive, ref } from 'vue';
    import AiSettings from '../components/AiSettings.vue';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import { deepCopy, getDefaultPrompt, show_error } from '../utils/function';
    import { useOptionStore } from '../store/option';

    const optionStore = useOptionStore();
    const defaultPrompt = getDefaultPrompt();
    const userPrompt = optionStore.getAIPromptOption();
    const saveAiPromptButtonLoading = ref(false);
    const saveSoftOptionButtonLoading = ref(false);
    
    const aiPromptForm = reactive({
        annotation: userPrompt.annotation ? userPrompt.annotation : defaultPrompt.annotation,
        translation: userPrompt.translation ? userPrompt.translation : defaultPrompt.translation
    })

    const saveAiPromptOption = ()=>{
        // 检查annotation和translation中是否含有${var}
        if(aiPromptForm.annotation != "" && !aiPromptForm.annotation.includes('${var}')) {
            show_error("单词标注提示词中必须包含${var}，以标识单词位置。");
            return;
        }
        if(aiPromptForm.translation != "" && !aiPromptForm.translation.includes('${var}')) {
            show_error("原文翻译提示词中必须包含${var}，以标识原文位置。");
            return;
        }

        saveAiPromptButtonLoading.value = true;
        ElMessageBox.confirm(
            '更改提示词可能导致单词标注无法正常解析，确定要保存吗？',
            '警告',
            {
                confirmButtonText: '保存更改',
                cancelButtonText: '取消',
                type: 'warning',
            }
        ).then(() => {
            return optionStore.saveAIPromptOption({
                annotationPrompt: aiPromptForm.annotation ? aiPromptForm.annotation : null,
                translationPrompt: aiPromptForm.translation ? aiPromptForm.translation : null
            })
        }).then(()=>{
            if(aiPromptForm.annotation == ""){
                aiPromptForm.annotation = defaultPrompt.annotation;
            }
            if(aiPromptForm.translation == ""){
                aiPromptForm.translation = defaultPrompt.translation;
            }
            ElMessage.success("保存成功");
        }).catch((error) => {
            if(error != "cancel"){
                show_error(error, "保存提示词失败");
            }
        }).finally(()=>{
            saveAiPromptButtonLoading.value = false;
        })
    }

    const aiPromptReadMe = ()=>{
        ElMessageBox.alert(
            `单词或原文使用 <font color='red'>\${var}</font> 表示
            <br>
            单词标注AI的输出需遵循以下格式，否则系统无法识别：
            <br>
            <br>
            单词：单词名称<br>
            词性：<br>
            读音：<br>
            中文释义：<br>
            附加说明：<br>
            适用性：<br>
            <br>
            每个单词之前间留有一个空行。
            <br>
            如果您不小心修改了内容，请在输入框中<font color='red'>留空，系统会恢复默认值</font>
            `, 
            'AI提示词修改说明', 
            {
                confirmButtonText: 'OK',
                dangerouslyUseHTMLString: true
            }
        );
    }

    // 软件设置代码
    const softOptionForm = reactive({
        annotationRule: 'skip',
        annotationNumber: 20,
        showOartOfSpeech: true,
        playSpeed: '1.0'
    })

    const softOption = optionStore.getSoftOption();
    Object.assign(softOptionForm, softOption);

    const saveSoftOption = () => {
        saveSoftOptionButtonLoading.value = true;
        optionStore.saveSoftOption(deepCopy(softOptionForm)).then(()=>{
            ElMessage.success("保存成功");
        }).catch((error)=>{
            show_error(error, "保存设置失败");
        }).finally(()=>{
            saveSoftOptionButtonLoading.value = false;
        });
    }
</script>

<template>
    <div class="set-page-box">
        <el-tabs type="border-card">
            <el-tab-pane label="AI设置"><AiSettings /></el-tab-pane>
            <el-tab-pane label="提示词设置">
                <div class="ai-prompt-option-box">
                    <el-form :model="aiPromptForm" label-width="80">
                        <el-form-item label="单词标注">
                            <el-input v-model="aiPromptForm.annotation" type="textarea" autosize/>
                        </el-form-item>
                        <el-form-item label="原文翻译">
                            <el-input v-model="aiPromptForm.translation" type="textarea" autosize/>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="saveAiPromptOption" :loading="saveAiPromptButtonLoading">保存提示词设置</el-button>
                            <el-button @click="aiPromptReadMe">说明</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </el-tab-pane>
            <el-tab-pane label="软件设置">
                <div class="ai-prompt-option-box">
                    <el-form :model="softOptionForm" label-width="100">
                        <el-form-item label="AI标注规则">
                            <el-radio-group v-model="softOptionForm.annotationRule">
                                <el-radio value="skip" border>跳过有内容的单词</el-radio>
                                <el-radio value="all" border>全部标注</el-radio>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="AI标注并发数">
                            <el-input-number v-model="softOptionForm.annotationNumber" :min="1" :max="2000" />
                            <span style="color: #ccc; padding-left: 20px;">数字过大可能会导致单词丢失、等待时间过长等问题</span>
                        </el-form-item>
                        <el-form-item label="显示词性条">
                            <el-switch
                                v-model="softOptionForm.showOartOfSpeech"
                                inline-prompt
                                active-text="是"
                                inactive-text="否"
                            />
                        </el-form-item>
                        <el-form-item label="播放速率">
                            <el-radio-group v-model="softOptionForm.playSpeed">
                                <el-radio-button label="0.25" value="0.25" />
                                <el-radio-button label="0.5" value="0.5" />
                                <el-radio-button label="0.75" value="0.75" />
                                <el-radio-button label="1.0" value="1.0" />
                                <el-radio-button label="1.25" value="1.25" />
                                <el-radio-button label="1.5" value="1.5" />
                                <el-radio-button label="1.75" value="1.75" />
                                <el-radio-button label="2.0" value="2.0" />
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item>
                            <el-button type="primary" @click="saveSoftOption" :loading="saveSoftOptionButtonLoading">保存设置</el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<style scoped>
    
</style>