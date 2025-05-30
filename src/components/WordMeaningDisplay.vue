<script setup lang="ts">
    import { ref, watch } from 'vue';
    import { Close } from '@element-plus/icons-vue'; // 导入 Element Plus 的关闭图标

    // 定义 props 来接收 v-model 的值，控制组件的显示/隐藏
    const props = defineProps({
        modelValue: {
            type: Boolean,
            default: false
        },
        // 接收要显示的数据对象
        data: {
            type: Object,
            default: () => ({
                word: '未知单词',
                oartOfSpeech: '未知',
                pronunciation: '',
                interpretation: '无释义',
                other: '',
                spell: false
            })
        }
    });

    // 定义 emit，用于更新 v-model
    const emit = defineEmits(['update:modelValue', 'close']);

    // 内部控制组件显示状态的响应式数据
    const isVisible = ref(props.modelValue);
    // 内部存储单词数据，以防直接修改 props.data
    const wordData = ref({});

    // 监听 props.modelValue 的变化，同步到内部的 isVisible
    watch(
        () => props.modelValue,
        (newVal) => {
            isVisible.value = newVal;
        },
        { immediate: true } // 立即执行一次，确保初始状态同步
    );

    // 监听 props.data 的变化，更新内部的 wordData
    watch(
        () => props.data,
        (newVal) => {
            wordData.value = { ...newVal }; // 深拷贝传入的数据，防止直接修改 props
        },
        { immediate: true, deep: true } // 立即执行一次，并深度监听数据变化
    );

    // 暴露 show 和 hide 函数
    const show = (data = props.data) => {
        // 如果组件已经显示，则先关闭，再显示
        if (isVisible.value) {
            hide(); // 先调用 hide
            // 使用 setTimeout 确保关闭动画完成后再显示，提供更好的用户体验
            setTimeout(() => {
                wordData.value = { ...data }; // 更新数据
                isVisible.value = true;
                emit('update:modelValue', true);
            }, 300); 
        } else {
            wordData.value = { ...data }; // 更新数据
            isVisible.value = true;
            emit('update:modelValue', true);
        }
    };

    const hide = () => {
        isVisible.value = false;
        emit('update:modelValue', false);
        emit('close'); // 额外触发一个 close 事件，方便父组件监听
    };

    const getChinesePartOfSpeech = (englishPosValue) => {
        const posMap = {
            'noun': '名词',
            'numeral': '数词',
            'measure_word': '量词',
            'verb': '动词',
            'adjective': '形容词',
            'distinguishing_word': '区别词',
            'adverb': '副词',
            'conjunction': '连词',
            'preposition': '介词',
            'auxiliary': '助词',
            'modal_particle': '语气词',
            'phrase': '短语',
            'sentence_fragment': '短句',
            'pronoun': '代词',
            'interjection': '叹词',
            'onomatopoeia': '拟声词',
            'morpheme': '语素',
            'other': '其他',
        };
        // 使用 ?? 操作符，如果找不到对应的英文值，则返回 '未知词性'
        return posMap[englishPosValue] ?? '未知词性'; 
    };

    // 使用 defineExpose 暴露公共方法
    defineExpose({
        show,
        hide
    });
</script>

<template>
    <transition name="slide-fade">
        <div v-if="isVisible" class="word-meaning-display">
            <el-card class="box-card">
                <el-button 
                :icon="Close" 
                circle 
                class="close-button" 
                @click="hide"
                ></el-button>

                <h3>{{ wordData.word }}</h3>
                <p class="pronunciation">{{ wordData.pronunciation }}</p>

                <div class="info-item">
                    <strong>词性:</strong> {{ getChinesePartOfSpeech(wordData.oartOfSpeech) }}
                </div>
                <div class="info-item">
                    <strong>释义:</strong> {{ wordData.interpretation }}
                </div>
                <div class="info-item">
                    <strong>附加说明:</strong> {{ wordData.other || '无' }}
                </div>
                <div class="info-item">
                    <strong>可背写:</strong> 
                    {{ wordData.spell ? '是' : '否' }}
                </div>
            </el-card>
        </div>
    </transition>
  </template>

<style scoped>
    .word-meaning-display {
        position: fixed; /* 固定定位，确保在视图内 */
        bottom: 20px; /* 距离底部 20px */
        right: 20px; /* 距离右侧 20px */
        z-index: 1000; /* 确保在其他内容之上 */
        width: 320px; /* 组件宽度 */
        max-width: 90vw; /* 最大宽度，适应小屏幕 */
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* 添加阴影效果 */
        border-radius: 8px; /* 圆角 */
        overflow: hidden; /* 确保内容在圆角内 */
    }

    .box-card {
        position: relative; /* 相对定位，方便内部元素定位 */
        padding: 20px;
        --el-card-padding: 20px; /* 覆盖 Element Plus 默认 padding */
    }

    .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        border: none; /* 无边框 */
        background: none; /* 无背景 */
        font-size: 18px; /* 调整图标大小 */
        color: #909399; /* 颜色 */
        cursor: pointer;
        z-index: 10; /* 确保在标题之上 */
    }

    .close-button:hover {
        color: #606266;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #303133;
    }

    .pronunciation {
        color: #606266;
        font-style: italic;
        margin-bottom: 15px;
    }

    .info-item {
        margin-bottom: 8px;
        color: #606266;
        line-height: 1.5;
    }

    .info-item strong {
        color: #303133;
        margin-right: 5px;
    }

    /* 过渡动画效果 */
    /* 进入时 */
    .slide-fade-enter-active {
        transition: all 0.3s ease-out;
    }
    /* 离开时 */
    .slide-fade-leave-active {
        transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
    }

    .slide-fade-enter-from,
    .slide-fade-leave-to {
        transform: translateX(100%); /* 从右边滑入/滑出 */
        opacity: 0; /* 透明度从0开始/结束 */
    }
</style>