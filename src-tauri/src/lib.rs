use tauri::{
    plugin::{Builder as PluginBuilder, PluginApi, PluginHandle},
    AppHandle, Manager, Runtime,
};

#[cfg(target_os = "android")]
use serde::{Deserialize, Serialize};

struct DisplayNamePlugin<R: Runtime>(Option<PluginHandle<R>>);

#[cfg(target_os = "android")]
#[derive(Debug, Deserialize)]
struct DisplayNameResponse {
    name: Option<String>,
}

#[cfg(target_os = "android")]
#[derive(Serialize)]
struct GetDisplayNamePayload {
    uri: String,
}

fn init_display_name<R: Runtime>(
    app: &AppHandle<R>,
    #[allow(unused_variables)] api: PluginApi<R, ()>,
) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "android")]
    let handle = Some(api.register_android_plugin("charbot.dev", "DisplayNamePlugin")?);
    #[cfg(not(target_os = "android"))]
    let handle: Option<PluginHandle<R>> = None;
    app.manage(DisplayNamePlugin(handle));
    Ok(())
}

#[tauri::command]
async fn get_display_name(
    state: tauri::State<'_, DisplayNamePlugin<tauri::Wry>>,
    uri: String,
) -> Result<Option<String>, String> {
    #[cfg(target_os = "android")]
    {
        let handle = state.0.as_ref().ok_or("displayname plugin not initialized")?;
        let response = handle
            .run_mobile_plugin_async::<DisplayNameResponse>(
                "getDisplayName",
                GetDisplayNamePayload { uri },
            )
            .await
            .map_err(|e| e.to_string())?;
        Ok(response.name)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (&state, uri);
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(PluginBuilder::new("displayname").setup(init_display_name).build())
        .invoke_handler(tauri::generate_handler![get_display_name])
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            std::fs::create_dir_all(dir.join("covers"))?;
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
