import { invoke } from '@tauri-apps/api/tauri';

const useAiChat = () => {
    const sendRequest = async (url, method, headers, body, proxy) => {
        try {
            const response = await invoke('send_api_request', {
                request: {
                    url,
                    method,
                    headers,
                    body,
                    proxy,
                },
            });

            if (response.code == 200) {
                return response;
            } else {
                throw Error(response.msg || '未知错误');
            }
        } catch (error) {
            console.error('Tauri Invoke Error:', error);
            return error;
        }
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
                const data = result.data;
                console.log(result);

                const choices = data?.choices;
                if (choices && choices.length > 0) {
                    const message = choices[0].message;
                    if (message.content) {
                        resolve(message.content);
                    }else{
                        reject('ChatGLM 响应格式不正确或无内容');
                    }
                }else{
                    reject('ChatGLM 响应格式不正确或无内容');
                }
            }).catch((error)=>{
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
                console.log(result)
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
                console.log(result);
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('Groq 响应格式不正确或无内容');
                }
            }).catch((error)=>{
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
                console.log(result);
                const candidates = data?.candidates;
                if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts && candidates[0].content.parts.length > 0) {
                    const textPart = candidates[0].content.parts.find(part => part.text);
                    if (textPart) {
                        resolve(textPart.text);
                    }else{
                        reject('Google Gemini 响应格式不正确或无内容');
                    }
                }else{
                    reject('Google Gemini 响应格式不正确或无内容');
                }
            }).catch((error)=>{
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
                        role: 'user',
                        content: prompt,
                    },
                ],
                stream: false,
            };

            sendRequest(url, 'POST', headers, body, proxy).then((result)=>{
                console.log(result);
                const choices = data?.choices;
                if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
                    resolve(choices[0].message.content);
                }else{
                    reject('ChatGPT 响应格式不正确或无内容');
                }
            }).catch((error)=>{
                reject(error);
            })
        })
    };

    return {
        chatGLM,
        deepSeek,
        groq,
        google,
        chatGPT,
    };
};

export default useAiChat;