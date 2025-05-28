import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 音频播放器 Hook，支持完整播放和片段播放
 *
 * @param {object} options 配置对象
 * @param {Ref<Uint8Array>} options.audioDataRef 响应式地引用 Uint8Array 音频数据
 * @param {string} [options.mimeType='audio/mpeg'] 音频数据的 MIME 类型
 * @returns {object} 包含音频控制函数和状态
 */
export function useAudioPlayer(options) {
    const {
        audioDataRef,
        mimeType = 'audio/mpeg'
    } = options;

    const audioRef = ref(null); // 用于引用 <audio> 元素
    const audioSrc = ref(''); // 存储要播放的音频 URL
    let currentPlayingSegment = null; // 存储当前正在播放的片段信息，用于停止
    let animationFrameId = null; // requestAnimationFrame ID
    let audioObjectURL = null; // 用于存储 createObjectURL 返回的 URL，方便撤销

    // --- 内部辅助函数 ---

    // 开始 requestAnimationFrame 循环
    const startAnimationFrameLoop = () => {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updateTime);
            console.log('RAF loop started');
        }
    };

    // 停止 requestAnimationFrame 循环
    const stopAnimationFrameLoop = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            console.log('RAF loop stopped');
        }
    };

    // 根据当前音频播放时间更新逻辑
    const updateTime = () => {
        if (!audioRef.value) {
            stopAnimationFrameLoop();
            return;
        }

        if (currentPlayingSegment) {
            // 判断是否达到片段结束时间
            // 使用小量的误差值进行比较，避免浮点数精度问题导致提前或延后停止
            const currentTime = audioRef.value.currentTime;
            if (currentTime >= currentPlayingSegment.endTime - 0.01) {
                audioRef.value.pause();
                currentPlayingSegment = null;
                stopAnimationFrameLoop(); // 片段播放结束时停止循环
            }
        }

        // 只有在需要继续更新时才请求下一帧
        // 如果播放器没有暂停且没有结束，就继续循环，直到暂停/结束事件处理
        if (!audioRef.value.paused && !audioRef.value.ended) {
            animationFrameId = requestAnimationFrame(updateTime);
        } else {
            stopAnimationFrameLoop(); // 确保在外部暂停/结束时也停止循环
        }
    };

    // --- 暴露给外部的函数 ---

    /**
     * 准备音频源。当 audioDataRef 变化时会自动调用。
     */
    const prepareAudioSource = () => {
        // 确保有数据且数据有效
        if (!audioDataRef.value || audioDataRef.value.length === 0) {
            if (audioObjectURL) { // 如果之前有URL，先撤销
                URL.revokeObjectURL(audioObjectURL);
                audioObjectURL = null;
                audioSrc.value = '';
                if (audioRef.value) audioRef.value.src = '';
            }
            return;
        }

        // 撤销旧的 URL，防止内存泄漏
        if (audioObjectURL) {
            URL.revokeObjectURL(audioObjectURL);
            audioObjectURL = null;
        }

        const audioBlob = new Blob([audioDataRef.value], { type: mimeType });
        audioObjectURL = URL.createObjectURL(audioBlob); // 保存引用
        audioSrc.value = audioObjectURL;

        if (audioRef.value) {
            audioRef.value.src = audioSrc.value;
            audioRef.value.load(); // 重新加载音频
        }
        console.log('音频源已准备。');
    };

    /**
     * 播放完整音频。
     */
    const playWholeAudio = () => {
        if (!audioRef.value || !audioSrc.value) {
            ElMessage.error("无音频数据，无法播放完整音频");
            return;
        }
        currentPlayingSegment = null; // 取消片段标记
        audioRef.value.currentTime = 0; // 从头开始

        audioRef.value.play().catch(e => {
            console.error("播放完整音频失败:", e);
            ElMessage.error("播放完整音频失败：" + e.message);
        });
    };

    /**
     * 播放指定时间段的音频。
     * @param {number} startTimeInSeconds 开始时间 (秒)
     * @param {number} durationInSeconds 持续时间 (秒)
     */
    const playSegmentDirectly = (startTimeInSeconds, durationInSeconds) => {
        if (!audioRef.value || !audioSrc.value) {
            ElMessage.error("无音频数据，无法播放片段");
            return;
        }

        const endTime = startTimeInSeconds + durationInSeconds;

        // 检查音频是否加载完成
        if (audioRef.value.readyState < 2) {
            ElMessage.warning('音频加载中，请稍候。');
            audioRef.value.addEventListener('canplaythrough', () => {
                playSegmentDirectly(startTimeInSeconds, durationInSeconds); // 再次尝试
            }, { once: true });
            audioRef.value.load(); // 尝试加载
            return;
        }

        audioRef.value.currentTime = startTimeInSeconds;
        currentPlayingSegment = { startTime: startTimeInSeconds, endTime: endTime };

        audioRef.value.play().catch(e => {
            console.error("播放片段失败:", e);
            ElMessage.error("播放片段失败：" + e.message);
        });
    };

    /**
     * 暂停音频播放。
     */
    const pauseAudio = () => {
        if (audioRef.value) {
            audioRef.value.pause();
        }
    };

    /**
     * 停止音频播放并重置到开头。
     */
    const stopAudio = () => {
        if (audioRef.value) {
            audioRef.value.pause();
            audioRef.value.currentTime = 0;
            currentPlayingSegment = null;
        }
    };

    // --- 生命周期钩子 ---

    onMounted(() => {
        // 绑定音频事件监听器
        if (audioRef.value) {
            audioRef.value.onplay = startAnimationFrameLoop;
            audioRef.value.onpause = stopAnimationFrameLoop;
            audioRef.value.onended = () => {
                stopAnimationFrameLoop();
                currentPlayingSegment = null; // 播放结束时也清除片段标记
            };
            // onseeking 也可以考虑停止，但这里让 RAF 保持运行可能更好，
            // 因为 seeking 结束后很快会触发 onplay 或 timeupdate
            // audioRef.value.onseeking = stopAnimationFrameLoop;
        }

        // 监听 audioDataRef 的变化，动态更新音频源
        watch(audioDataRef, prepareAudioSource, { immediate: true });
    });

    onBeforeUnmount(() => {
        // 撤销 URL 以释放内存
        if (audioObjectURL) {
            URL.revokeObjectURL(audioObjectURL);
            audioObjectURL = null;
        }
        // 停止所有 RAF 循环
        stopAnimationFrameLoop();

        // 清除音频事件监听器，避免内存泄漏
        if (audioRef.value) {
            audioRef.value.onplay = null;
            audioRef.value.onpause = null;
            audioRef.value.onended = null;
            // audioRef.value.onseeking = null;
        }
    });

    return {
        audioRef, // 将 ref 暴露出去，供 <audio> 标签绑定
        audioSrc, // 暴露当前音频 URL，如果需要显示或调试
        playWholeAudio,
        playSegmentDirectly,
        pauseAudio,
        stopAudio,
        currentAudioTime: ref(0), // 可以暴露当前播放时间以便 UI 更新
        // 更多状态可以暴露，如 audioRef.value.paused, audioRef.value.duration 等
    };
}