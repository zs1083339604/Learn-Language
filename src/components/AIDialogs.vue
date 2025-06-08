<script setup lang="ts">
    import { ref, watch } from 'vue';
    import { ElMessage, ElMessageBox } from 'element-plus';
    import { openUrl } from '@tauri-apps/plugin-opener';
    import { show_error } from '../utils/function';
    import useAiChat from '../hooks/useAiChat';

    const props = defineProps({
        type: {
            type: String,
            default: 'annotation',
            validator: (value) => ['annotation', 'translation'].includes(value),
        },
    });

    const emit = defineEmits(['submit']);

    // 对话框的显示状态
    const dialogVisible1 = ref(false);
    const dialogVisible2 = ref(false);
    const dialogVisible3 = ref(false);
    const nowNumber = ref(1);
    const fullNumber = ref(1);
    const {getAIPrompt} = useAiChat();
    let copyContentVar = '';
    let contentToCopy = '';

    // AI模型对应的URL
    const modelUrls = {
        ChatGPT: 'https://chatgpt.com/',
        ChatGLM: 'https://chatglm.cn/',
        DeepSeek: 'https://chat.deepseek.com/',
        Gemini: 'https://gemini.google.com/'
    };

    // 用于show方法resolve的Promise
    let showResolve = null;
    let showReject = null;

    // 用于run方法resolve的Promise
    let runResolve = null;
    let runReject = null;

    // 指示对话框是否正在被“正常”关闭（进入下一个流程）
    const isClosingNormally = ref(false);

    // 第三步textarea的内容
    const aiResponseContent = ref('');

    // 打开AI模型网址
    const openModelUrl = async (model) => {
        const url = modelUrls[model];
        if (url) {
            await openUrl(url);
        } else {
            ElMessage.error(`未找到 ${model} 的网址。`);
        }
    };

    // 关闭所有对话框
    const hideAllDialogs = () => {
        // 设置为正常关闭，避免关闭回调中触发reject
        isClosingNormally.value = true;
        dialogVisible1.value = false;
        dialogVisible2.value = false;
        dialogVisible3.value = false;
        // 清空textarea内容
        aiResponseContent.value = '';
        // 重置标志
        // 使用setTimeout确保在对话框关闭动画结束后再重置，以防万一
        setTimeout(() => {
            isClosingNormally.value = false;
        }, 300);
    };

    // 第一个对话框相关方法

    const selectModel = async (model) => {
        try {
            await openModelUrl(model);
            if (showResolve) {
                showResolve(true);
                showResolve = null; // 清空resolve，防止重复调用
            }
            hideAllDialogs(); // 关闭所有对话框，准备进入下一个阶段
        } catch (error) {
            show_error(error, "打开网址失败");   
        }
    };

    const skipModelSelection = () => {
        if (showResolve) {
            showResolve(true);
            showResolve = null;
        }
        hideAllDialogs();
    };

    const cancelModelSelection = () => {
        if (showResolve) {
            showResolve(false);
            showResolve = null;
        }
        hideAllDialogs();
    };

    const handleDialogClose1 = () => {
        // 如果不是正常关闭，并且show方法还在等待结果，则视为取消
        if (!isClosingNormally.value && showResolve) {
            showResolve(false);
            showResolve = null;
        }
    };

    // 第二个对话框相关方法

    const copyContent = async () => {
        const promptObj = getAIPrompt(copyContentVar , props.type);
        if(promptObj.code != 200){
            throw Error(promptObj.msg)
        }
        contentToCopy = promptObj.data;

        try {
            await navigator.clipboard.writeText(contentToCopy);
            ElMessage.success('内容已复制到剪贴板！请粘贴到AI对话框');
            // 设置为正常关闭，防止handleDialogClose2触发reject
            isClosingNormally.value = true;
            dialogVisible2.value = false; // 关闭第二个对话框
            dialogVisible3.value = true; // 显示第三个对话框
            // 在这里立即重置标志，因为我们知道下一个对话框已经打开了
            // 确保在Element Plus对话框关闭动画结束后再重置，以防万一
            setTimeout(() => {
                isClosingNormally.value = false;
            }, 300);
        } catch (err) {
            show_error(err, "复制失败");
            ElMessageBox.alert(contentToCopy, '复制失败，请手动复制到AI对话框中。');
        }
    };

    const handleDialogClose2 = () => {
        // 如果不是正常关闭，并且run方法还在等待结果，则视为取消
        if (!isClosingNormally.value && runReject) {
            runReject(new Error('用户取消了操作'));
            runReject = null;
        }
        // 如果是正常关闭，此处不应触发 reject
    };

    // 第三个对话框相关方法

    const submitContent = () => {
        if (aiResponseContent.value.trim() === '') {
            ElMessage.warning('请输入AI返回的内容！');
            return;
        }

        if(aiResponseContent.value.trim() == contentToCopy){
            ElMessageBox.alert('请将复制的内容粘贴到AI软件中<br />等待AI输出内容<br />将AI输出的内容粘贴到这里', '提示', {
                confirmButtonText: '我明白了',
                dangerouslyUseHTMLString: true
            })
            return;
        }

        if (runResolve) {
            runResolve(aiResponseContent.value);
            runResolve = null;
        }
        hideAllDialogs();
    };

    const handleDialogClose3 = () => {
        // 如果不是正常关闭，并且run方法还在等待结果，则视为取消
        if (!isClosingNormally.value && runReject) {
            runReject(new Error('用户取消了操作'));
            runReject = null;
        }
    };

    // 暴露给父组件的方法

    /**
     * 显示第一个对话框。
     * @returns {Promise<boolean>} 如果用户点击了跳过或任意AI模型，返回true；用户点击取消返回false。
     */
    const show = () => {
        return new Promise((resolve, reject) => {
            showResolve = resolve;
            showReject = reject;
            dialogVisible1.value = true;
        });
    };

    /**
     * 从第二个对话框开始显示，到第三个对话框。
     * @returns {Promise<string>} 用户点击提交按钮后，返回textarea中的数据。
     */
    const run = (text, now, full) => {
        return new Promise((resolve, reject) => {
            runResolve = resolve;
            runReject = reject;
            copyContentVar = text;
            nowNumber.value = now;
            fullNumber.value = full;
            dialogVisible2.value = true;
        });
    };

    /**
     * 关闭所有对话框。
     */
    const hide = () => {
        hideAllDialogs();
        // 确保在hide时，如果show或run还在等待，也将其resolve/reject
        if (showResolve) {
            showResolve(false); // 视为取消
            showResolve = null;
        }
        if (runReject) {
            runReject(new Error('对话框被强制关闭'));
            runReject = null;
        }
    };

    // 暴露方法给父组件
    defineExpose({
        show,
        run,
        hide,
    });
</script>

<template>
    <div class="ai-dialog-box">
        <el-dialog
            v-model="dialogVisible1"
            title="选择AI模型"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            width="500"
            @close="handleDialogClose1"
        >
            <div class="model-selection">
                <div class="model-select">
                    <el-button @click="selectModel('ChatGPT')">ChatGPT</el-button>
                    <el-button @click="selectModel('ChatGLM')">ChatGLM</el-button>
                    <el-button @click="selectModel('DeepSeek')">DeepSeek</el-button>
                    <el-button @click="selectModel('Gemini')">Gemini</el-button>
                </div>
                <div class="tool">
                    <el-button type="success" @click="skipModelSelection">我已打开AI软件，跳过</el-button>
                    <el-button type="danger" @click="cancelModelSelection">取消</el-button>
                </div>
            </div>
        </el-dialog>

        <el-dialog
            v-model="dialogVisible2"
            title="操作提示"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            width="40%"
            @close="handleDialogClose2"
        >
            <div class="copy-prompt">
                <p>1. 点击复制提示词按钮<br>
                    2. 将复制的内容粘贴到AI模型的对话框中<br />
                    3. 等待AI返回内容<br />
                    4. 将AI返回的内容复制到下一个对话框的输入框里<br />
                    <br />
                    当前进度：{{ nowNumber }} / {{ fullNumber }}
                </p>
                <el-button @click="copyContent" style="margin-top: 10px;width: 100%;">复制提示词</el-button>
            </div>
        </el-dialog>

        <el-dialog
            v-model="dialogVisible3"
            title="输入AI返回内容"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            width="50%"
            @close="handleDialogClose3"
        >
            <el-input
                v-model="aiResponseContent"
                type="textarea"
                :rows="10"
                placeholder="请在此处粘贴AI返回的内容..."
            >
            </el-input>
            <template #footer>
                <span class="dialog-footer">
                    <el-button type="primary" @click="submitContent">提交</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
    .model-select{
        margin-bottom: 10px;
    }

    .model-selection {
        margin-bottom: 20px;
    }

    .copy-prompt {
        margin-bottom: 20px;
    }
</style>