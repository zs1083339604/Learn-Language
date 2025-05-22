<script setup lang="ts">
    import { ref,computed } from 'vue';
    import { useVoicesStore } from '../store/voices';
    import { show_error } from '../utils/function';
    import { storeToRefs } from 'pinia';
    import {VideoPlay} from '@element-plus/icons-vue'

    const props = defineProps({
        direction: {
            type: String,
            required: false,
            default: "row",
            validator: (value) => {
                // value 必须是 'row' 或 'column' 中的一个
                return ['row', 'column'].includes(value);
            }
        },
        showTryPlay: {
            type: Boolean,
            required: false,
            default: true
        },
        // 为 v-model:language 和 v-model:voice 定义 props
        language: {
            type: String,
            default: "",
        },
        voice: {
            type: String,
            default: '',
        },
    })

    // 定义 emit 事件，用于更新父组件的 v-model 绑定的值
    const emit = defineEmits(['update:language', 'update:voice']);

    // 使用 computed 属性来创建内部的响应式变量，并监听父组件的 props 变化
    const internalLanguageValue = computed({
        get: () => props.language,
        set: (newValue) => {
            voices.value = voicesStore.getVoicesByLanguage(newValue);
            internalVoiceValue.value = voices.value[0].Name;
            emit('update:language', newValue);
        },
    });

    const internalVoiceValue = computed({
        get: () => props.voice,
        set: (newValue) => {
            emit('update:voice', newValue);
        },
    });

    const voicesStore = useVoicesStore();
    const {languages} = storeToRefs(voicesStore);
    const voices = ref([]);
    const tryPlayText = ref('');
    const tryPlayButtonLoading = ref(false);
    const audioRef = ref(null);
    
    voicesStore.getVoicesList().catch((error)=>{
        show_error(error, "配音员获取失败")
    })

    const tryPlay = ()=>{
        tryPlayButtonLoading.value = true;
        voicesStore.startTTS(internalVoiceValue.value, tryPlayText.value, false).then((result)=>{
            if(result.code == 200){
                if(audioRef.value){
                    audioRef.value.src = "data:audio/mp3;base64," + result.data.audio;
                    audioRef.value.play();
                }else{
                    throw Error("未找到音频播放器");
                }
            }else{
                throw Error(result.msg);
            }
        }).catch((error)=>{
            show_error(error, "试听失败");
        }).finally(()=>{
            tryPlayButtonLoading.value = false;
        })
    }
    
</script>

<template>
    <div class="ttsSelect-box" :class="direction">
        <div class="ttsSelect-select-box" :class="direction">
            <div class="ttsSelect-languages-select-box">
                <el-select v-model="internalLanguageValue" placeholder="选择语言" filterable>
                    <el-option
                        v-for="item in languages"
                        :key="item.id"
                        :label="item.name"
                        :value="item.name"
                    />
                </el-select>
            </div>
            <div class="ttsSelect-voices-select-box">
                <el-select v-model="internalVoiceValue" placeholder="选择配音员" filterable>
                    <el-option
                        v-for="item in voices"
                        :label="item.simpleName + ' (' + item.Gender + ')'"
                        :value="item.Name"
                    />
                </el-select>
            </div>
        </div>

        <div class="ttsSelect-tryPlay-box" v-if="showTryPlay">
            <el-input
                v-model="tryPlayText"
                placeholder="试听文本"
                class="input-with-select"
                maxlength="10"
                show-word-limit
            >
                <template #append>
                    <el-button :icon="VideoPlay" @click="tryPlay" :loading="tryPlayButtonLoading"/>
                </template>
            </el-input>
        </div>

        <audio src="" ref="audioRef" v-if="showTryPlay"></audio>
    </div>
</template>

<style scoped>
    .ttsSelect-box{
        width: 100%;
    }

    .ttsSelect-box.row,
    .ttsSelect-select-box.row{
        display: flex;
    }

    .ttsSelect-select-box.row .ttsSelect-languages-select-box,
    .ttsSelect-box.row .ttsSelect-select-box{
        margin-right: 10px;
    }

    .ttsSelect-box.column,
    .ttsSelect-select-box.column{
        display: flex;
        flex-direction: column;
    }

    .ttsSelect-select-box.column .ttsSelect-languages-select-box,
    .ttsSelect-box.column .ttsSelect-select-box{
        margin-bottom: 10px;
    }
</style>