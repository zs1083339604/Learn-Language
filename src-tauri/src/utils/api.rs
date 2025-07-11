use crate::utils::custom_result::CustomResult;
use crate::utils::tts::TTS;
use base64::{engine::general_purpose, Engine as _};
use futures_util::{sink::SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::Url;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Message},
};
use uuid::Uuid;
use tauri_plugin_http::reqwest;
use reqwest::{ClientBuilder, Proxy, header::{HeaderMap, HeaderValue, HeaderName}};

#[derive(Deserialize)]
pub struct TTSData {
    voice: String,
    text: String,
    pitch: i32,
    rate: i32,
    volume: i32,
    root_path: String,
    save_file: bool,
}

#[derive(Deserialize, Serialize)]
pub struct ApiRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: serde_json::Value,
    pub proxy: Option<String>, // http://user:pass@host:port 或 socks5://user:pass@host:port
}


/// 配音
///
/// 根据传入数据调用微软Edge浏览器的大声朗读接口，实现配音功能
///
/// # Arguments
///
/// * `data` - 配音所需的数据 `TTSData`。
///
/// # Returns
///
/// * 如果配音，则返回 `Ok(CustomResult::success)`
/// * 如果发生错误，则返回 `Err(CustomResult:error)`
#[tauri::command]
pub async fn start_tts(data: TTSData) -> Result<CustomResult, CustomResult> {
    let voice = data.voice;
    let text = data.text;
    let pitch = data.pitch;
    let rate = data.rate;
    let volume = data.volume;
    let mut root_path = data.root_path;
    let save_file = data.save_file;

    // 检查参数
    if voice.is_empty() || text.is_empty() {
        return Err(CustomResult::error(Some("参数错误".to_string()), None));
    }

    // 格式化数据
    let pitch_str = if pitch >= 0 {
        format!("+{}", pitch)
    } else {
        format!("{}", pitch)
    };

    let rate_str = if rate >= 0 {
        format!("+{}", rate)
    } else {
        format!("{}", rate)
    };

    let volumn_str = if volume >= 0 {
        format!("+{}", volume)
    } else {
        format!("{}", volume)
    };

    let tts_client = TTS {};
    let send_request_id = Uuid::new_v4().to_string().replace('-', "");
    let sec_ms_gec_value = tts_client.generate_sec_ms_gec()?.data["hax"].clone();
    let sec_ms_gec = sec_ms_gec_value
        .as_str()
        .ok_or_else(|| CustomResult::error(Some("生成令牌字符串失败".to_string()), None))?;
    let audio_output_format = "audio-24khz-48kbitrate-mono-mp3";
    let binary_delim = "Path:audio\r\n";

    let url_str = format!(
        "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?\
         TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC={}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId={}",
        sec_ms_gec, send_request_id
    );

    let mut request = url_str
        .into_client_request()
        .map_err(|e| CustomResult::error(Some(format!("编码URL失败：{}", e.to_string())), None))?;

    // 添加请求头
    request
        .headers_mut()
        .insert("Pragma", "no-cache".parse().unwrap());
    request
        .headers_mut()
        .insert("Cache-Control", "no-cache".parse().unwrap());
    request.headers_mut().insert(
        "Origin",
        "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"
            .parse()
            .unwrap(),
    );
    request.headers_mut().insert("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0".parse().unwrap());
    request
        .headers_mut()
        .insert("Accept-Encoding", "gzip, deflate, br".parse().unwrap());
    request
        .headers_mut()
        .insert("Accept-Language", "en-US,en;q=0.9".parse().unwrap());

    let (mut socket, _) = connect_async(request)
        .await
        .map_err(|e| CustomResult::error(Some(format!("连接wss失败：{}", e.to_string())), None))?;

    // 发送音频格式设定
    let audio_config = tts_client.convert_to_audio_format_websocket_string(audio_output_format);
    socket
        .send(Message::Text(audio_config.into()))
        .await
        .map_err(|e| CustomResult::error(Some(format!("发送音频格式失败：{}", e)), None))?;

    // 发送 SSML 文本
    let ssml = tts_client.convert_to_ssml_websocket_string(
        &send_request_id,
        &voice,
        &text,
        &pitch_str,
        &rate_str,
        &volumn_str,
    );
    socket
        .send(Message::Text(ssml.into()))
        .await
        .map_err(|e| CustomResult::error(Some(format!("发送SSML文本失败：{}", e)), None))?;

    // 接收数据
    let mut audio_data: Vec<u8> = Vec::new();
    let mut messages: Vec<Value> = vec![];

    while let Some(msg) = socket.next().await {
        let msg =
            msg.map_err(|e| CustomResult::error(Some(format!("读取WS输出失败：{}", e)), None))?;

        match msg {
            Message::Text(txt) => {
                if txt.contains("Path:turn.end") {
                    break;
                } else if txt.contains("Path:audio.metadata") {
                    // 找到第一个空行之后的第一个非空行，这应该是 JSON 数据的开始
                    if let Some(start_index) = txt.find("\r\n\r\n") {
                        let json_start = start_index + 2; // 跳过两个换行符
                        let json_part = &txt[json_start..];
                        // 尝试解析 JSON
                        if let Ok(json) = serde_json::from_str(json_part) {
                            messages.push(json);
                        } else {
                            eprintln!("JSON 解析失败: {}", json_part);
                        }
                    }
                }
            }
            Message::Binary(bin) => {
                if let Some(index) = bin
                    .windows(binary_delim.len())
                    .position(|w| w == binary_delim.as_bytes())
                {
                    audio_data.extend_from_slice(&bin[index + binary_delim.len()..]);
                }
            }
            _ => {}
        }
    }

    let mut path_str = String::from("");
    let json_name = format!("output_{}.json", send_request_id);
    let output_name = format!("output_{}.mp3", send_request_id);
    if save_file {
        // 如果保存文件
        if root_path.is_empty() {
            root_path = ".".to_string();
        }

        let path_buf = PathBuf::from(root_path).join("datas").join(send_request_id.clone());
        path_str = path_buf.display().to_string();

        let folder_path = Path::new(&path_str);
        if !folder_path.exists() {
            fs::create_dir_all(folder_path)
                .map_err(|e| CustomResult::error(Some(format!("创建文件夹失败：{}", e)), None))?;
        }

        // 保存音频数据
        let path_buf =
            PathBuf::from(path_str.clone()).join(output_name.clone());
        let output_path = path_buf.display().to_string();
        let mut file = File::create(&output_path)
            .map_err(|e| CustomResult::error(Some(format!("创建音频文件失败：{}", e)), None))?;
        file.write_all(&audio_data)
            .map_err(|e| CustomResult::error(Some(format!("写入音频文件失败：{}", e)), None))?;

        // 写入JSON数据
        let path_buf =
            PathBuf::from(path_str.clone()).join(json_name.clone());
        let json_path = path_buf.display().to_string();
        let mut json_file = File::create(&json_path)
            .map_err(|e| CustomResult::error(Some(format!("创建JSON文件失败：{}", e)), None))?;
        let json_str = serde_json::to_string(&messages)
            .map_err(|e| CustomResult::error(Some(format!("序列化JSON失败：{}", e)), None))?;
        json_file
            .write_all(json_str.as_bytes())
            .map_err(|e| CustomResult::error(Some(format!("写入JSON文件失败：{}", e)), None))?;
    }

    // 编码成base64
    let base64_audio = encode_audio_to_base64(None, Some(audio_data))?;

    Ok(CustomResult::success(
        None,
        Some(json!({
            "audio": base64_audio,
            "root_name": path_str,
            "audio_name": output_name,
            "json_name": json_name,
            "text": text
        })),
    ))
}

/// 获取app的版本号
///
/// # Returns
///
/// * `Ok(CustomResult::success)`
#[tauri::command]
pub async fn get_app_version(app_handle: tauri::AppHandle) -> Result<CustomResult, CustomResult> {
    let package_info = app_handle.package_info();
    let version = package_info.version.to_string();

    Ok(CustomResult::success(
        None,
        Some(json!({"version": version})),
    ))
}

/// 删除文件或空目录，或递归删除目录及其内容。
///
/// 如果路径指向文件，则删除文件。
/// 如果路径指向目录，则删除其所有内容，然后删除目录本身。
///
/// # Arguments
///
/// * `path_str` - 表示文件或目录路径的 `String`。
///
/// # Returns
///
/// * 如果删除成功，则返回 `Ok(CustomResult::success)`。
/// * 如果路径无效、不存在或删除过程中发生错误，则返回 `Err(CustomResult:error)`
#[tauri::command]
pub async fn delete_path_contents(path_str: String) -> Result<CustomResult, CustomResult> {
    let path = Path::new(&path_str);

    // 1. 验证路径是否合法 (简单的存在性检查，更复杂的合法性可能需要regex或更深入的OS检查)
    if !path.exists() {
        return Err(CustomResult::error(
            Some(format!("错误: 路径 '{}' 不存在.", path_str)),
            None,
        ));
    }

    if path.is_file() {
        match fs::remove_file(path) {
            Ok(_) => Ok(CustomResult::success(None, None)),
            Err(e) => Err(CustomResult::error(
                Some(format!("错误: 删除文件 '{}' 失败: {}", path_str, e)),
                None,
            )),
        }
    } else if path.is_dir() {
        match fs::remove_dir_all(path) {
            Ok(_) => Ok(CustomResult::success(None, None)),
            Err(e) => Err(CustomResult::error(
                Some(format!("错误: 删除目录 '{}' 失败: {}", path_str, e)),
                None,
            )),
        }
    } else {
        Err(CustomResult::error(
            Some(format!("错误: 路径 '{}' 不是文件也不是目录.", path_str)),
            None,
        ))
    }
}

/// 将音频数据（来自文件或内存）转成 Base64 编码字符串。
///
/// # Arguments
///
/// * `file_path` - 可选的音频文件路径 `Option<&str>`。如果提供，函数会尝试从该路径读取文件。
/// * `audio_data_bytes` - 可选的音频数据字节切片 `Option<Vec<u8>>`。如果 `file_path` 为 `None` 且此项提供，
///                        函数会直接使用这些字节进行编码。
///
/// # Returns
///
/// * 如果成功编码，则返回 Base64 字符串 `String`。
/// * 如果两个输入都为空，或读取文件失败，则返回 `Err(CustomResult::error)`。
pub fn encode_audio_to_base64(
    file_path: Option<&str>,
    audio_data_bytes: Option<Vec<u8>>,
) -> Result<String, CustomResult> {
    let bytes_to_encode: Vec<u8>;

    if let Some(path) = file_path {
        // 如果提供了文件路径，则尝试读取文件
        bytes_to_encode = fs::read(path).map_err(|e| {
            CustomResult::error(Some(format!("读取音频文件 '{}' 失败：{}", path, e)), None)
        })?;
    } else if let Some(data) = audio_data_bytes {
        // 如果文件路径为空，但提供了 Vec<u8>，则直接使用它
        bytes_to_encode = data;
    } else {
        // 如果两个输入都为空，返回错误
        return Err(CustomResult::error(
            Some("未提供文件路径或音频数据，无法进行 Base64 编码".to_string()),
            None,
        ));
    }

    // 执行 Base64 编码
    let encoded = general_purpose::STANDARD.encode(&bytes_to_encode);

    Ok(encoded)
}

#[tauri::command]
pub async fn send_api_request(request: ApiRequest) -> Result<CustomResult, CustomResult> {
    println!("创建客户端...");
    let client_builder = ClientBuilder::new().connect_timeout(Duration::from_secs(5));

    let client : reqwest::Client;

    println!("客户端创建完成");
    if let Some(proxy_url_str) = request.proxy {
        println!("匹配到了代理");
        match Url::parse(&proxy_url_str) {
            Ok(proxy_url) => {
                if proxy_url.scheme() == "http" || proxy_url.scheme() == "https" || proxy_url.scheme() == "socks5" {
                    let proxy = Proxy::all(proxy_url_str).map_err(|e| 
                        CustomResult::error(Some(format!("添加代理失败：{}", e)), None)
                    )?;
                    client = client_builder.proxy(proxy).build().map_err(|e| 
                        CustomResult::error(Some(format!("创建客户端失败：{}", e)), None)
                    )?;
                    println!("代理添加成功");
                } else {
                    return Err(CustomResult::error(Some("不支持的代理协议".to_string()),  None));
                }
            }
            Err(e) => {
                return Err(CustomResult::error(Some(format!("解析代理URL失败: {}", e)), None))
            }
        }
    }else{
        client = client_builder.build().map_err(|e| 
            CustomResult::error(Some(format!("创建客户端失败：{}", e)), None)
        )?;
    }

    println!("添加请求头...");

    let mut headers = HeaderMap::new();
    for (key, value) in request.headers { // key 是 String 类型
        // 尝试将 String 类型的 key 转换为 HeaderName
        match HeaderName::from_bytes(key.as_bytes()) {
            Ok(header_name) => {
                // 尝试将 String 类型的 value 转换为 HeaderValue
                if let Ok(header_value) = HeaderValue::from_str(&value) {
                    // 如果 key 和 value 都成功转换，则插入到 HeaderMap
                    headers.insert(header_name, header_value);
                } else {
                    // 处理 header_value 解析失败的情况
                    // 打印警告或记录日志，或者选择在这里返回一个 CustomResult 错误
                    eprintln!("Warning: Invalid HeaderValue for key '{}': '{}'", key, value);
                }
            }
            Err(e) => {
                // 处理 key 无法解析为有效 HeaderName 的情况
                // 打印警告或记录日志，或者选择在这里返回一个 CustomResult 错误
                eprintln!("Warning: Invalid HeaderName '{}': {}", key, e);
                // 示例：如果你希望遇到无效头名称就停止并返回错误，可以这样做：
                // return Err(CustomResult::error(Some(format!("无效的请求头名称 '{}': {}", key, e)), None));
            }
        }
    }

    println!("请求头添加成功");

    let mut request_builder = match request.method.as_str() {
        "GET" => client.get(&request.url),
        "POST" => client.post(&request.url),
        "PUT" => client.put(&request.url),
        "DELETE" => client.delete(&request.url),
        _ => {
            return Err(CustomResult::error(Some(format!("不支持的 HTTP 方法: {}", request.method)), None));
        }
    };

    if !request.body.is_null() {
        request_builder = request_builder.json(&request.body);
    }

    request_builder = request_builder.headers(headers);

    // 超时时间 - 可能会影响正常输出
    // if let Some(timeout_s) = request.timeout_seconds {
    //     request_builder = request_builder.timeout(Duration::from_secs(timeout_s));
    // }

    println!("发送数据");
    match request_builder.send().await {
        Ok(response) => {
            println!("成功接收到数据");
            let status = response.status();
            println!("获取text");
            let text = response.text().await.unwrap_or_else(|_| "".to_string());

            if status.is_success() {
                println!("成功状态");
                match serde_json::from_str::<serde_json::Value>(&text) {
                    Ok(json_data) => Ok(CustomResult::success(None, Some(json!({"data": json_data})))),
                    Err(e) => Err(CustomResult::error(Some(format!("解析 JSON 响应失败: {} - 响应内容: {}", e, text)), None)),
                }
            } else {
                println!("失败状态");
                Err(CustomResult::error(Some(format!("API 请求失败，状态码: {}，响应: {}", status, text)), None))
            }
        }
        Err(e) =>{ 
            println!("失败接收到数据");
            Err(CustomResult::error(Some(format!("发送 HTTP 请求失败: {}", e)), None))
        } ,
    }
}