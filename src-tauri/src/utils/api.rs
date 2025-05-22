use crate::utils::custom_result::CustomResult;
use crate::utils::tts::TTS;
use base64::{engine::general_purpose, Engine as _};
use futures_util::{sink::SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Message},
};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct TTSData {
    voice: String,
    text: String,
    pitch: i32,
    rate: i32,
    volume: i32,
    root_path: String,
    save_file: bool
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
    let mut output_path = String::from("");
    let mut json_path = String::from("");
    if save_file {
        // 如果保存文件
        if root_path.is_empty() {
            root_path = ".".to_string();
        }
    
        let path_buf = PathBuf::from(root_path).join(send_request_id.clone());
        path_str = path_buf.display().to_string();

        let folder_path = Path::new(&path_str);
        if !folder_path.exists() {
            fs::create_dir_all(folder_path)
                .map_err(|e| CustomResult::error(Some(format!("创建文件夹失败：{}", e)), None))?;
        }

        // 保存音频数据
        let path_buf = PathBuf::from(path_str.clone()).join(format!("output_{}.mp3", send_request_id));
        output_path = path_buf.display().to_string();
        let mut file = File::create(&output_path)
            .map_err(|e| CustomResult::error(Some(format!("创建音频文件失败：{}", e)), None))?;
        file.write_all(&audio_data)
            .map_err(|e| CustomResult::error(Some(format!("写入音频文件失败：{}", e)), None))?;

        // 写入JSON数据
        let path_buf = PathBuf::from(path_str.clone()).join(format!("output_{}.json", send_request_id));
        json_path = path_buf.display().to_string();
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
            "root_path": path_str,
            "audio_path": output_path,
            "json_path": json_path,
            "text": text
        })),
    ))
}

/// 获取exe运行路径
///
/// # Returns
///
/// * 如果获取成功，则返回 `Ok(CustomResult::success)`。
/// * 如果获取失败，则返回 `Err(CustomResult:error)`
#[tauri::command]
pub async fn get_exe_path() -> Result<CustomResult, CustomResult> {
    let exe_path = std::env::current_exe()
        .map_err(|e| CustomResult::error(Some(format!("当前执行路径获取失败：{}", e)), None))?;

    if let Some(exe_dir) = exe_path.parent() {
        return Ok(CustomResult::success(
            None,
            Some(json!({"path": exe_dir.display().to_string()})),
        ));
    } else {
        return Err(CustomResult::error(
            Some(format!("无法获取可执行文件的父目录")),
            None,
        ));
    }
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
        bytes_to_encode = fs::read(path)
            .map_err(|e| CustomResult::error(Some(format!("读取音频文件 '{}' 失败：{}", path, e)), None))?;
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