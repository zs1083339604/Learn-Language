<script setup lang="ts">
    import { ref, reactive, watch, computed, onMounted } from 'vue';
    import { ElMessage } from 'element-plus';
    import { useOptionStore } from '../store/option';
    import { deepCopy, show_error } from '../utils/function';

    const optionStore = useOptionStore();

    // AI 模型配置
    const aiModels = {
        ChatGLM: [
            { label: 'GLM-4-Plus', value: 'glm-4-plus' },
            { label: 'GLM-4-Air-250414', value: 'glm-4-air-250414' },
            { label: 'GLM-4-Long', value: 'glm-4-long' },
            { label: 'GLM-4-AirX', value: 'glm-4-airx' },
            { label: 'GLM-4-FlashX-250414', value: 'glm-4-flashx-250414' },
            { label: 'GLM-4-Flash-250414 (免费)', value: 'glm-4-flash-250414' },
        ],
        DeepSeek: [
            { label: 'deepseek-chat', value: 'deepseek-chat' },
            { label: 'deepseek-reasoner', value: 'deepseek-reasoner' },
        ],
        Groq: [
            { label: 'allam-2-7b', value: 'allam-2-7b' },
            { label: 'compound-beta(小贵)', value: 'compound-beta' },
            { label: 'deepseek-r1-distill-llama-70b', value: 'deepseek-r1-distill-llama-70b' },
            { label: 'gemma2-9b-it', value: 'gemma2-9b-it' },
            { label: 'llama-guard-3-8b', value: 'llama-guard-3-8b' },
            { label: 'llama3-8b-8192', value: 'llama3-8b-8192' },
            { label: 'llama3-70b-8192', value: 'llama3-70b-8192' },
            { label: 'llama-3.3-70b-versatile', value: 'llama-3.3-70b-versatile' },
            { label: 'llama-3.1-8b-instant', value: 'llama-3.1-8b-instant' },
            { label: 'llama-4-maverick-17b-128e-instruct', value: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
            { label: 'llama-4-scout-17b-16e-instruct', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
            { label: 'llama-prompt-guard-2-22m', value: 'meta-llama/llama-prompt-guard-2-22m' },
            { label: 'llama-prompt-guard-2-86m', value: 'meta-llama/llama-prompt-guard-2-86m' },
            { label: 'llama-guard-4-12b', value: 'meta-llama/llama-guard-4-12b' },
            { label: 'mistral-saba-24b', value: 'mistral-saba-24b' },
            { label: 'qwen-qwq-32b', value: 'qwen-qwq-32b' }
        ],
        Google: [
            { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
            { label: 'Gemini 2.0 Flash-Lite', value: 'gemini-2.0-flash-lite' },
            { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            { label: 'Gemini 1.5 Flash-8B', value: 'gemini-1.5-flash-8b' },
            { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
            { label: 'Gemini 2.5 Pro Preview', value: 'gemini-2.5-pro-preview-05-06' },
            { label: 'Gemini 2.5 Flash Preview', value: 'gemini-2.5-flash-preview-05-20' },
        ],
        ChatGPT: [
            { label: 'gpt-4.1-2025-04-14', value: 'gpt-4.1-2025-04-14' },
            { label: 'o4-mini-2025-04-16', value: 'o4-mini-2025-04-16' },
            { label: 'o3-2025-04-16', value: 'o3-2025-04-16' },
            { label: 'gpt-3.5-turbo-0125', value: 'gpt-3.5-turbo-0125' },
        ],
    };

    // 存储所有模型配置的对象，键为 'platform_modelValue'
    const allModelConfigs = reactive({});

    // 当前在表单中显示的设置
    const currentSettings = reactive({
        model: '',
        apiKey: '',
        proxy: '',
    });

    // 当前选中的 AI 平台
    const selectedAiPlatform = ref('ChatGLM');

    // 计算属性：根据当前选择的平台获取可用模型列表
    const availableModels = computed(() => {
        return aiModels[selectedAiPlatform.value] || [];
    });

    /**
     * 从 localStorage 加载所有模型配置和当前选中的模型
     */
    const loadAllConfigs = () => {
        Object.assign(allModelConfigs, optionStore.getAIOption());

        if(!allModelConfigs.nowAiPlatform){
            // 默认值，按理说永远不会走到这，万一呢
            allModelConfigs.nowAiPlatform = 'ChatGLM';
        }

        selectedAiPlatform.value = allModelConfigs.nowAiPlatform;
        
        // 获取模型信息
        const tempModelInfo = allModelConfigs[allModelConfigs.nowAiPlatform];
        if(tempModelInfo){
            replaceCurrentSettings(tempModelInfo);
        }else{
            // 默认值
            currentSettings.model = availableModels.value.length > 0 ? availableModels.value[0].value : '';
        }
    };

    const replaceCurrentSettings = (data) => {
        currentSettings.model = data.model;
        currentSettings.apiKey = data.apiKey;
        currentSettings.proxy = data.proxy;
    }

    /**
     * 将所有模型配置和当前选中的模型保存到 localStorage
     */
    const saveAllConfigs = () => {
        optionStore.saveAIOption(deepCopy(allModelConfigs)).then(()=>{
            ElMessage.success('保存AI设置成功！');
        }).catch((error)=>{
            show_error(error, "保存AI设置失败");
        })
    };

    /**
     * 根据当前选中的平台，加载对应的API Key和Proxy到表单
     */
    const loadCurrentModelSettings = () => {
        const storedConfig = allModelConfigs[selectedAiPlatform.value];
        if (storedConfig && storedConfig != "null") {
            replaceCurrentSettings(storedConfig);
        } else {
            // 如果没有存储，则清空
            currentSettings.apiKey = '';
            currentSettings.proxy = '';
            currentSettings.model = availableModels.value.length > 0 ? availableModels.value[0].value : '';
        }
    };

    // 监听 selectedAiPlatform 和 currentSettings.model 的变化
    watch([selectedAiPlatform], (newPlatform, oldPlatform) => {
        if (newPlatform === oldPlatform) {
            // 避免不必要的加载，只在实际发生变化时执行
            return;
        }

        if (newPlatform !== oldPlatform) {
            // 如果平台改变
            loadCurrentModelSettings();
        }
    }, { immediate: true }); // immediate: true 确保组件加载时立即执行一次

    // 保存当前表单中的设置到 allModelConfigs，并持久化
    const saveSettings = () => {
        if (!currentSettings.model) {
            ElMessage.warning('请选择一个模型！');
            return;
        }
        if (!currentSettings.apiKey) {
            ElMessage.warning('请输入 API 密钥！');
            return;
        }

        if(currentSettings.proxy.trim() != ""){
            // 如果输入了代理，检查是否合法
            const regex = /^(http|https|socks5):\/\/.+$/;
           if(!regex.test(currentSettings.proxy)){
                show_error('代理地址格式不正确，请使用 http://, https:// 或 socks5:// 开头');
                return;
           }
        }

        allModelConfigs.nowAiPlatform = selectedAiPlatform.value;
        allModelConfigs[selectedAiPlatform.value] = {
            apiKey: currentSettings.apiKey,
            proxy: currentSettings.proxy,
            model: currentSettings.model
        };

        saveAllConfigs();
    };

    // 组件挂载时加载所有配置
    onMounted(() => {
        loadAllConfigs();
    });

    // 初始化时，确保模型选择器有值，即使localStorage为空
    watch(availableModels, (newModels) => {
        if (newModels.length > 0 && !currentSettings.model) {
            currentSettings.model = newModels[0].value;
        }
    }, { immediate: true });

</script>

<template>

    <el-form label-width="120px" @submit.prevent>
        <el-form-item label="选择 AI 平台">
            <el-radio-group v-model="selectedAiPlatform">
                <el-radio-button value="ChatGLM">ChatGLM</el-radio-button>
                <el-radio-button value="DeepSeek">DeepSeek</el-radio-button>
                <el-radio-button value="Groq">Groq</el-radio-button>
                <el-radio-button value="Google">Google</el-radio-button>
                <el-radio-button value="ChatGPT">ChatGPT</el-radio-button>
            </el-radio-group>
        </el-form-item>

        <el-form-item label="模型选择">
            <el-select v-model="currentSettings.model" placeholder="请选择模型" style="width: 100%">
                <el-option
                v-for="model in availableModels"
                :key="model.value"
                :label="model.label"
                :value="model.value"
                />
            </el-select>
        </el-form-item>

        <el-form-item label="API 密钥">
            <el-input
                v-model="currentSettings.apiKey"
                type="password"
                show-password
                placeholder="请输入 API 密钥"
            />
        </el-form-item>

        <el-form-item label="代理地址 (可选)">
            <el-input
                v-model="currentSettings.proxy"
                placeholder="例如: http://user:pass@host:port 或 socks5://host:port"
            />
        </el-form-item>

        <el-form-item>
            <el-button type="primary" @click="saveSettings">保存AI设置</el-button>
        </el-form-item>
    </el-form>

</template>

<style scoped>

</style>