<script setup lang="ts">
    import { computed,watch, onBeforeUnmount } from 'vue';
    import {Top, Bottom, VideoPlay, Scissor} from '@element-plus/icons-vue'

    const props = defineProps({
        modelValue: {
            type: Object,
            required: true,
            // default: () => ({
            //     id: 0,
            //     inlineId: 0,
            //     word: "",
            //     oartOfSpeech: "名词",
            //     pronunciation: "",
            //     interpretation: "",
            //     other: "",
            //     applicable: 1,
            //     spell: true,
            //     startIndex: 0,
            //     isSeparation: false,
            //     highlight: false
            // })
        }
    });

    const emit = defineEmits(['update:modelValue', 'mergeWord', 'playAudio', 'separation']);

    // 使用 computed 属性实现双向绑定
    const internalData = computed({
        get() {
            // 当父组件的 modelValue 改变时，这里会重新计算
            // 返回 modelValue 的一个副本，供内部表单使用
            return props.modelValue; // 直接使用 prop，因为 ElInput 内部会处理更新
        },
        set(newValue) {
            // 当内部表单通过 v-model 尝试修改 internalData 时
            // 这个 set 方法会被调用，newValue 是表单组件传入的新值
            // 我们将这个新值通过 emit 事件传回父组件
            emit('update:modelValue', newValue);
        }
    });

    // 用于存储定时器的引用，以便在需要时清除
    let highlightTimer = null;

    // 监听 highlight 属性的变化
    watch(
        () => internalData.value.highlight,
        (newVal) => {
            if (newVal === true) {
                // 当 highlight 变为 true 时，启动定时器
                if (highlightTimer) {
                    clearTimeout(highlightTimer);
                }
                highlightTimer = setTimeout(() => {
                    // 通过 emit 传递回父组件
                    emit('update:modelValue', { ...internalData.value, highlight: false });
                    highlightTimer = null;
                }, 2000);
            }else{
                if (highlightTimer) {
                    clearTimeout(highlightTimer);
                    highlightTimer = null;
                }
            }
        },
        { immediate: true }
    );

    onBeforeUnmount(()=>{
        if (highlightTimer) {
            clearTimeout(highlightTimer);
            highlightTimer = null;
        }
    })
</script>

<template>
    <div class="wordBox-box" :class="{ 'highlighted': internalData.highlight }">
        <div class="wordBox-item-flex">
            <div class="wordBox-item-group-box" :title="internalData.word">
                <el-input v-model="internalData.word" placeholder="单词、短语、句子" :disabled="true"/>
            </div>
            <div class="wordBox-item-group-box">
                <p>词性：</p>
                <el-select
                v-model="internalData.oartOfSpeech"
                placeholder="选择词性"
                filterable
                >
                    <el-option label="名词" value="名词"/>
                    <el-option label="数词" value="数词"/>
                    <el-option label="量词" value="量词"/>
                    <el-option label="动词" value="动词"/>
                    <el-option label="形容词" value="形容词"/>
                    <el-option label="区别词" value="区别词"/>
                    <el-option label="副词" value="副词"/>
                    <el-option label="连词" value="连词"/>
                    <el-option label="介词" value="介词"/>
                    <el-option label="助词" value="助词"/>
                    <el-option label="语气词" value="语气词"/>
                    <el-option label="短语" value="短语"/>
                    <el-option label="短句" value="短句"/>
                    <el-option label="其他" value="其他"/>
                </el-select>
            </div>
            <div class="wordBox-item-group-box">
                <p>读音：</p>
                <el-input v-model="internalData.pronunciation" placeholder="读音" />
            </div>
            <div class="wordBox-item-group-box">
                <p>释义：</p>
                <el-input v-model="internalData.interpretation" placeholder="释义" />
            </div>
            <div class="wordBox-item-group-box">
                <p>附加说明：</p>
                <el-input v-model="internalData.other" placeholder="附加说明"/>
            </div>
        </div>
        <div class="wordBox-item-flex">
            <div class="wordBox-item-group-box">
                <p>适用性：</p>
                <el-radio-group v-model="internalData.applicable">
                    <el-radio :value="1" size="large" border>通用</el-radio>
                    <el-radio :value="0" size="large" border style="margin-left: -15px;">仅本课</el-radio>
                </el-radio-group>
            </div>
            <div class="wordBox-item-group-box">
                <p>是否拼写：</p>
                <el-switch
                    v-model="internalData.spell"
                    inline-prompt
                    active-text="是"
                    inactive-text="否"
                />
            </div>
            <div class="wordBox-item-group-box" style="margin-left: -15px;">
                <p>工具：</p>
                <el-button :icon="Scissor" circle title="分离单词" @click="emit('separation')" v-if="internalData.isSeparation"/>
                <el-button :icon="Top" circle title="向上合并" @click="emit('mergeWord', 'top')"/>
                <el-button :icon="Bottom" circle title="向下合并" @click="emit('mergeWord', 'bottom')"/>
                <el-button :icon="VideoPlay" circle title="播放单词" @click="emit('playAudio')"/>
            </div>
        </div>
    </div>
</template>

<style scoped>
    .wordBox-box{
        border: 1px solid rgb(220, 223, 230);
        border-radius: 10px;
        padding: 15px 15px 0;
        margin-bottom: 15px;
        transition: border-color 0.3s ease;
    }

    .wordBox-box.highlighted{
        border-color: rgb(64, 158, 255);
    }

    .wordBox-item-flex{
        display: flex;
        align-items: center;
    }

    .wordBox-item-group-box{
        margin-right: 20px;
        display: flex;
        min-width: 150px;
        align-items: center;
        margin-bottom: 20px;
    }

    .wordBox-item-group-box p{
        flex-shrink: 0;
    }

    .wordBox-item-box{
        overflow-y: auto;
    }
</style>