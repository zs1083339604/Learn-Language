import { invoke } from '@tauri-apps/api/core';
import { useOptionStore } from '../store/option';

const useAiChat = () => {
    const sendRequest = (url, method, headers, body, proxy) => {
        return new Promise((resolve, reject) => {

            proxy = proxy ? proxy : null;
            invoke('send_api_request', {
                request: {
                    url,
                    method,
                    headers,
                    body,
                    proxy,
                },
            }).then((response)=>{
                if (response.code == 200) {
                    resolve(response);
                } else {
                    reject(response.msg || '未知错误')
                }
            }).catch((error)=>{
                reject(error);
            });
        })
    };

    /**
     * ChatGLM 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "glm-4", "glm-4-plus")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址 (如 "http://user:pass@host:port" 或 "socks5://user:pass@host:port")
     * @returns {Promise<{success: boolean, data?: string, error?: string}>} AI 模型输出或错误信息
     */
    const chatGLM = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            const headers = {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false, // 禁用流式传输
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;

                const choices = data?.choices;
                if (choices && choices.length > 0) {
                    const message = choices[0].message;
                    if (message.content) {
                        resolve(message.content);
                        return;
                    }
                }

                reject('ChatGLM 响应格式不正确或无内容');
            }).catch((error)=>{
                // 接口错误返回示例："API 请求失败，状态码: 401 Unauthorized，响应: {\"error\":{\"code\":\"401\",\"message\":\"令牌已过期或验证不正确！\"}}"
                // 懒得解析了，直接展示给用户吧😀
                reject(error);
            });
        })
        
    };

    /**
     * DeepSeek 模型 *作者没有deepSeek Api 该函数未经测试！*
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "deepseek-chat", "deepseek-reasoner")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<{success: boolean, data?: string, error?: string}>} AI 模型输出或错误信息
     */
    const deepSeek = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.deepseek.com/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                messages: [
                    {
                        content: 'You are a helpful assistant',
                        role: 'system',
                    },
                    {
                        content: prompt,
                        role: 'user',
                    },
                ],
                model: model,
                stream: false,
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('DeepSeek 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                reject(error);
            })
        })
    };

    /**
     * Groq 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "llama3-8b-8192", "llama3-70b-8192")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<{success: boolean, data?: string, error?: string}>} AI 模型输出或错误信息
     */
    const groq = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.groq.com/openai/v1/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false,
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('Groq 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                // 接口错误示例："API 请求失败，状态码: 401 Unauthorized，响应: {"error":{"message":"Invalid API Key","type":"invalid_request_error","code":"invalid_api_key"}}"
                reject(error);
            });
        })
    };

    /**
     * Google Gemini 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "gemini-1.5-flash", "gemini-1.5-pro")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<{success: boolean, data?: string, error?: string}>} AI 模型输出或错误信息
     */
    const google = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const headers = {
                'Content-Type': 'application/json',
            };
            const body = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const candidates = data?.candidates;
                if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts.length > 0) {
                    const textPart = candidates[0].content.parts.find(part => part.text);
                    if (textPart) {
                        resolve(textPart.text);
                        return;
                    }
                }

                reject('Google Gemini 响应格式不正确或无内容');
            }).catch((error)=>{
                /**
                 * 接口错误示例：
                 * "API 请求失败，状态码: 400 Bad Request，响应: {
                    "error": {
                        "code": 400,
                        "message": "API key not valid. Please pass a valid API key.",
                        "status": "INVALID_ARGUMENT",
                        "details": [
                        {
                            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
                            "reason": "API_KEY_INVALID",
                            "domain": "googleapis.com",
                            "metadata": {
                            "service": "generativelanguage.googleapis.com"
                            }
                        },
                        {
                            "@type": "type.googleapis.com/google.rpc.LocalizedMessage",
                            "locale": "en-US",
                            "message": "API key not valid. Please pass a valid API key."
                        }
                        ]
                    }
                    }
                    "
                 */
                reject(error);
            })
        })
    };

    /**
     * ChatGPT 模型
     * @param {string} prompt 用户输入
     * @param {string} model 模型名称 (如 "gpt-4.1", "gpt-3.5-turbo-0125")
     * @param {string} apiKey API 密钥
     * @param {string} [proxy] 可选的代理地址
     * @returns {Promise<{success: boolean, data?: string, error?: string}>} AI 模型输出或错误信息
     */
    const chatGPT = (prompt, model, apiKey, proxy) => {
        return new Promise((resolve, reject) => {
            const url = 'https://api.openai.com/v1/chat/completions';
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
            const body = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                const data = result.data.data;
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('ChatGPT 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                /**
                 * 接口错误返回示例："API 请求失败，状态码: 401 Unauthorized，响应: {
                        "error": {
                            "message": "Incorrect API key provided: qqqqqqqq**********1231. You can find your API key at https://platform.openai.com/account/api-keys.",
                            "type": "invalid_request_error",
                            "param": null,
                            "code": "invalid_api_key"
                        }
                    }
                    "
                 */
                reject(error);
            })
        })
    };

    const aiAnnotation = (wordsString)=>{
        return new Promise((resolve, reject) => {
            const prompt = `你是一个语言专家，用户会把单词以数组形式发给你，请你以简体中文的形式返回给用户，并解释单词词性、单词读音、单词中文释义、附加说明、以及其适用性是仅限于本课文输出0，该语言通用输出1。
以如下格式返回，每个单词之前用2个换行隔开，不要输出多余的话：
单词：单词内容
词性：可选输出 noun,numeral,measure_word,verb,adjective,distinguishing_word,adverb,conjunction,preposition,auxiliary,modal_particle,phrase,sentence_fragment,pronoun,interjection,onomatopoeia,morpheme,other
读音：
中文释义：
附加说明：
适用性：可选输出 0,1

单词：${wordsString}`

            const optionStore = useOptionStore();
            const aiOption = optionStore.getAIOption();
            const nowAiPlatform = aiOption.nowAiPlatform;
            const model = aiOption[nowAiPlatform].model;
            const apiKey = aiOption[nowAiPlatform].apiKey;
            const proxy = aiOption[nowAiPlatform].proxy;

            switch(nowAiPlatform){
                case 'ChatGLM':
                    chatGLM(prompt, model, apiKey, proxy).then((result)=>{
                        resolve(result);
                    }).catch((error)=>{
                        reject(error);
                    });
                    break;
                case 'DeepSeek':
                    deepSeek(prompt, model, apiKey, proxy).then((result)=>{
                        resolve(result);
                    }).catch((error)=>{
                        reject(error);
                    });
                    break;
                case 'Groq':
                    groq(prompt, model, apiKey, proxy).then((result)=>{
                        resolve(result);
                    }).catch((error)=>{
                        reject(error);
                    });
                    break;
                case 'Google':
                    google(prompt, model, apiKey, proxy).then((result)=>{
                        resolve(result);
                    }).catch((error)=>{
                        reject(error);
                    });
                    break;
                case 'ChatGPT':
                    chatGPT(prompt, model, apiKey, proxy).then((result)=>{
                        resolve(result);
                    }).catch((error)=>{
                        reject(error);
                    });
                    break;
                default :
                    reject('未知的AI平台');
            }
        });
    }

    return {
        chatGLM,
        deepSeek,
        groq,
        google,
        chatGPT,
        aiAnnotation
    };
};

export default useAiChat;