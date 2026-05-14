// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // If CLAUDE_CONFIG_DIR is set (e.g. via portable launcher), also redirect
    // WebView2 user data folder so EBWebView cache lives alongside it instead of
    // under %LOCALAPPDATA%\com.claude-code-haha.desktop\.
    if let Ok(config_dir) = std::env::var("CLAUDE_CONFIG_DIR") {
        let webview_data = std::path::PathBuf::from(&config_dir).join("EBWebView");
        if let Err(e) = std::fs::create_dir_all(&webview_data) {
            eprintln!("[desktop] failed to create EBWebView dir: {e}");
        }
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", &webview_data);
    }

    claude_code_desktop_lib::run()
}
