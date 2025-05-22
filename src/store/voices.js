import { defineStore } from "pinia";
import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from "@tauri-apps/api/core";

export const useVoicesStore = defineStore("voices", {
    actions: {
        getVoicesList(){
            return new Promise((resolve, reject) => {
                if(localStorage.getItem("voices") && localStorage.getItem("languages")){
                    this.voices = JSON.parse(localStorage.getItem("voices"));
                    this.languages = JSON.parse(localStorage.getItem("languages"));
                    resolve();
                }else{
                    this.getVoicesListRemove().then(()=>{
                        resolve()
                    }).catch((error)=>{
                        reject(error)
                    })
                }
            })
        },

        getVoicesListRemove() {
            return new Promise(async (resolve, reject) => {
                try {
                    const response = await fetch('https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4', {
                        method: 'GET',
                    });
                    if(response.status == 200){
                        const result = await response.json();
    
                        // 定义一个映射对象，将 Locale 转换为语言归属地
                        const localeToLanguage = {
                            'af-ZA': '南非语',
                            'am-ET': '阿姆哈拉语（埃塞俄比亚）',
                            'ar-EG': '阿拉伯语 (埃及)',
                            'ar-AE': '阿拉伯语（阿联酋）',
                            'ar-BH': '阿拉伯语（巴林）',
                            'ar-DZ': '阿拉伯语（阿尔及利亚）',
                            'ar-SA': '阿拉伯语（沙特阿拉伯）',
                            'ar-IQ': '阿拉伯语（伊拉克）',
                            'ar-JO': '阿拉伯语（约旦）',
                            'ar-KW': '阿拉伯语（科威特）',
                            'ar-LB': '阿拉伯语（黎巴嫩）',
                            'ar-LY': '阿拉伯语（利比亚）',
                            'ar-MA': '阿拉伯语（摩洛哥）',
                            'ar-OM': '阿拉伯语（阿曼）',
                            'ar-QA': '阿拉伯语（卡塔尔）',
                            'ar-SY': '阿拉伯语（叙利亚）',
                            'ar-TN': '阿拉伯语（突尼斯）',
                            'az-AZ': '阿塞拜疆语',
                            'be-BY': '白俄罗斯语',
                            'bg-BG': '保加利亚语',
                            'bn-BD': '孟加拉语（孟加拉）',
                            'bs-BA': '波斯尼亚语',
                            'ca-ES': '加泰罗尼亚语',
                            'cs-CZ': '捷克语',
                            'cy-GB': '威尔士语',
                            'da-DK': '丹麦语',
                            'de-DE': '德语（德国）',
                            'de-AT': '德语（奥地利）',
                            'de-CH': '德语（瑞士）',
                            'el-GR': '希腊语',
                            'en-US': '英语（美国）',
                            'en-GB': '英语（英国）',
                            'en-AU': '英语（澳大利亚）',
                            'en-CA': '英语（加拿大）',
                            'en-IN': '英语（印度）',
                            'en-IE': '英语（爱尔兰）',
                            'en-NZ': '英语（新西兰）',
                            'en-ZA': '英语（南非）',
                            'es-ES': '西班牙语（西班牙）',
                            'es-MX': '西班牙语（墨西哥）',
                            'es-AR': '西班牙语（阿根廷）',
                            'es-CO': '西班牙语（哥伦比亚）',
                            'es-CL': '西班牙语（智利）',
                            'es-PE': '西班牙语（秘鲁）',
                            'et-EE': '爱沙尼亚语',
                            'eu-ES': '巴斯克语',
                            'fa-IR': '波斯语（伊朗）',
                            'fi-FI': '芬兰语',
                            'fil-PH': '菲律宾语',
                            'fr-FR': '法语（法国）',
                            'fr-CA': '法语（加拿大）',
                            'fr-CH': '法语（瑞士）',
                            'fr-BE': '法语（比利时）',
                            'gl-ES': '加利西亚语',
                            'gu-IN': '古吉拉特语',
                            'he-IL': '希伯来语',
                            'hi-IN': '印地语',
                            'hr-HR': '克罗地亚语',
                            'hu-HU': '匈牙利语',
                            'hy-AM': '亚美尼亚语',
                            'id-ID': '印尼语',
                            'is-IS': '冰岛语',
                            'it-IT': '意大利语',
                            'ja-JP': '日语',
                            'jv-ID': '爪哇语',
                            'ka-GE': '格鲁吉亚语',
                            'kk-KZ': '哈萨克语',
                            'km-KH': '高棉语',
                            'kn-IN': '卡纳达语',
                            'ko-KR': '韩语',
                            'lo-LA': '老挝语',
                            'lt-LT': '立陶宛语',
                            'lv-LV': '拉脱维亚语',
                            'mk-MK': '马其顿语',
                            'ml-IN': '马拉雅拉姆语',
                            'mn-MN': '蒙古语',
                            'mr-IN': '马拉地语',
                            'ms-MY': '马来语（马来西亚）',
                            'ms-SG': '马来语（新加坡）',
                            'my-MM': '缅甸语',
                            'ne-NP': '尼泊尔语',
                            'nl-NL': '荷兰语（荷兰）',
                            'nl-BE': '荷兰语（比利时）',
                            'no-NO': '挪威语',
                            'pa-IN': '旁遮普语',
                            'pl-PL': '波兰语',
                            'pt-PT': '葡萄牙语（葡萄牙）',
                            'pt-BR': '葡萄牙语（巴西）',
                            'ro-RO': '罗马尼亚语',
                            'ru-RU': '俄语',
                            'si-LK': '僧伽罗语',
                            'sk-SK': '斯洛伐克语',
                            'sl-SI': '斯洛文尼亚语',
                            'sq-AL': '阿尔巴尼亚语',
                            'sr-RS': '塞尔维亚语',
                            'su-ID': '巽他语',
                            'sv-SE': '瑞典语',
                            'sw-KE': '斯瓦希里语（肯尼亚）',
                            'ta-IN': '泰米尔语（印度）',
                            'ta-SG': '泰米尔语（新加坡）',
                            'te-IN': '泰卢固语',
                            'th-TH': '泰语',
                            'tr-TR': '土耳其语',
                            'uk-UA': '乌克兰语',
                            'ur-PK': '乌尔都语',
                            'uz-UZ': '乌兹别克语',
                            'vi-VN': '越南语',
                            'zh-CN': '中文（大陆）',
                            'zh-HK': '中文（香港）',
                            'zh-TW': '中文（台湾）',
                            'zh-SG': '中文（新加坡）',
                            'zh-MO': '中文（澳门）',
                            'zu-ZA': '祖鲁语',
                            'ar-YE': '阿拉伯语（也门）',
                            'bn-IN': '孟加拉语（印度）',
                            'en-HK': '英语（香港）',
                            'en-SG': '英语（新加坡）',
                            'en-KE': '英语（肯尼亚）',
                            'en-NG': '英语（尼日利亚）',
                            'en-PH': '英语（菲律宾）',
                            'en-TZ': '英语（坦桑尼亚）',
                            'es-BO': '西班牙语（玻利维亚）',
                            'es-CR': '西班牙语（哥斯达黎加）',
                            'es-CU': '西班牙语（古巴）',
                            'es-DO': '西班牙语（多米尼加共和国）',
                            'es-EC': '西班牙语（厄瓜多尔）',
                            'es-GQ': '西班牙语（赤道几内亚）',
                            'es-GT': '西班牙语（危地马拉）',
                            'es-HN': '西班牙语（洪都拉斯）',
                            'es-NI': '西班牙语（尼加拉瓜）',
                            'es-PA': '西班牙语（巴拿马）',
                            'es-PR': '西班牙语（波多黎各）',
                            'es-PY': '西班牙语（巴拉圭）',
                            'es-SV': '西班牙语（萨尔瓦多）',
                            'es-US': '西班牙语（美国）',
                            'es-UY': '西班牙语（乌拉圭）',
                            'es-VE': '西班牙语（委内瑞拉）',
                            'ga-IE': '爱尔兰语',
                            'iu-Cans-CA': '因纽特语（加拿大）',
                            'iu-Latn-CA': '因纽特语（加拿大）',
                            'mt-MT': '马耳他语',
                            'nb-NO': '挪威语（伯克梅尔）',
                            'ps-AF': '普什图语',
                            'so-SO': '索马里语',
                            'sw-TZ': '斯瓦希里语（坦桑尼亚）',
                            'ta-LK': '泰米尔语（斯里兰卡）',
                            'ta-MY': '泰米尔语（马来西亚）',
                            'ur-IN': '乌尔都语（印度）',
                            'zh-CN-liaoning': '中文（辽宁）',
                            'zh-CN-shaanxi': '中文（陕西）',
                        };

                        // 映射性别
                        const genderMap = {
                            'Female': '女',
                            'Male': '男'
                        };

                        const tempArray = {};

                        // 遍历 voices 数组
                        result.forEach(voice => {
                            const locale = voice.Locale;
                            const language = localeToLanguage[locale] || locale;
                            voice["Gender"] = genderMap[voice["Gender"]];

                            // 如果分类结果中还没有这个语言分类，就创建一个空数组
                            if (!tempArray[language]) {
                                tempArray[language] = [];
                            }

                            // 将当前 voice 对象添加到对应的语言分类中
                            tempArray[language].push({
                                FriendlyName: voice.FriendlyName,
                                Gender: voice.Gender,
                                Name: voice.Name,
                                simpleName: voice.FriendlyName.split(' ')[1] 
                            });
                        });

                        // 遍历完成后需要拆分数组，便于后面使用
                        // 数组1：包含语言ID和名称
                        const languageArray = [];
                        // 数组2：包含语言ID对应的语音列表
                        const voiceArray = [];
                        let idCounter = 1;

                        // 遍历原始数据
                        for (const [languageName, voices] of Object.entries(tempArray)) {
                            // 添加到数组1
                            languageArray.push({
                                id: idCounter,
                                name: languageName
                            });
                            
                            // 添加到数组2
                            voiceArray.push({
                                languageName: languageName,
                                list: voices
                            });
                            
                            idCounter++;
                        }

                        this.languages = languageArray;
                        this.voices = voiceArray;

                        localStorage.setItem("voices", JSON.stringify(this.voices));
                        localStorage.setItem("languages", JSON.stringify(this.languages));
                        resolve();
                    }else{
                        reject("status: " + response.status + " " + response.statusText);
                    }
                } catch (error) {
                    reject(error);
                }
            })
        },
        getVoicesByLanguage(name){
            const index = this.voices.findIndex(item => item.languageName == name);
            if(index != -1){
                return this.voices[index].list;
            }else{
                return [];
            }
        },
        startTTS(voice, text, save_file){
            return new Promise((resolve, reject) => {
                if(voice == "" || text == ""){
                    reject("配音员或文本不能为空");
                    return;
                }
                try {
                    const root_path = localStorage.getItem("exe_path") == undefined ? "" : localStorage.getItem("exe_path");
                    const result = invoke("start_tts", {data: {
                        voice: voice,
                        text: text,
                        pitch: 0,
                        rate: 0,
                        volume: 0,
                        root_path: root_path,
                        save_file
                    }})

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            })
        },

        async updataVoices(){
            localStorage.removeItem("voices");
            localStorage.removeItem("languages");
            this.voices = [];
            this.languages = [];
            return await this.getVoicesListRemove();
        }
    },
    state() {
        return{
            languages: [],
            voices: []
        }
    },
})
