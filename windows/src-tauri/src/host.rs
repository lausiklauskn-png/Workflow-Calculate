//! Die Hülle: hält die Engine, beantwortet ihre Rückfragen mit Fenstern des Systems (Speichern unter, Setup starten)
//! und reicht Aufrufe der Seite weiter. Nur Verträge aus bridge/contracts.json kommen von der Seite an.
//! Vorbild: Datei-Organizer Pro und BookLedgerPro windows/src-tauri/src/host.rs (ohne Ordner, Eingang, Tresor, Sprache, Scanner).
use crate::{engine::Engine,win};
use base64::{Engine as _,engine::general_purpose::STANDARD as B64};
use serde_json::{Value,json};
use std::{path::PathBuf,sync::{Arc,Mutex,atomic::{AtomicBool,Ordering}},time::Duration};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

#[cfg(feature="messprobe")]
pub const BROWSER_ARGS:&str="--disable-features=msWebOOUI,msPdfOOUI --remote-debugging-port=9223 --remote-debugging-address=127.0.0.1";
#[cfg(not(feature="messprobe"))]
pub const BROWSER_ARGS:&str="--disable-features=msWebOOUI,msPdfOOUI";

pub struct Host {
    pub app:tauri::AppHandle,pub data:PathBuf,pub engine:Mutex<Option<Arc<Engine>>>,
    pub session:String,pub closing:AtomicBool,
}
impl Host {
    pub fn new(app:tauri::AppHandle)->Result<Arc<Self>,String>{
        let data=app.path().app_local_data_dir().map_err(|_|"STORAGE_UNAVAILABLE")?.join("engine");
        win::no_links(&data)?;std::fs::create_dir_all(&data).map_err(|_|"STORAGE_UNAVAILABLE")?;
        let mut token=[0u8;32];getrandom::fill(&mut token).map_err(|_|"APP_RUNTIME_UNAVAILABLE")?;
        Ok(Arc::new(Self{app,data,engine:Mutex::new(None),session:B64.encode(token),closing:AtomicBool::new(false)}))
    }
    pub fn start(self:&Arc<Self>)->Result<(),String>{
        let runtime=self.app.path().resource_dir().map_err(|_|"APP_RUNTIME_UNAVAILABLE")?.join("runtime");
        let engine=Engine::start(&runtime,&self.data,self)?;*self.engine.lock().unwrap()=Some(engine.clone());
        if let Err(error)=engine.call("DesktopInternal","info",json!({})){engine.stop();return Err(error);}Ok(())
    }
    pub fn authorized(&self,request:&tauri::ipc::Request<'_>)->bool {
        let value=request.headers().get("x-wc-session").and_then(|v|v.to_str().ok()).unwrap_or("");
        if value.len()!=self.session.len(){return false;}
        let difference=value.bytes().zip(self.session.bytes()).fold(0u8,|d,(a,b)|d|(a^b));
        difference==0&&request.headers().get("origin").is_none_or(|origin|origin.as_bytes()==b"https://tauri.localhost")
    }
    /// Aufruf aus der Seite (schon gegen contracts.json geprüft).
    pub fn call(&self,plugin:&str,method:&str,options:Value)->Result<Value,String>{
        // Eine Sicherung mit Bildern kann groß sein (Speichern unter); sonst bleiben Aufrufe klein.
        let limit=if plugin=="WcDateien"&&method=="speichern"{90*1024*1024}else{2*1024*1024};
        if serde_json::to_vec(&options).map_err(|_|"INVALID_INPUT")?.len()>limit{return Err("INVALID_INPUT".into());}
        let engine=self.engine.lock().unwrap().clone().ok_or("APP_RUNTIME_UNAVAILABLE".to_owned())?;
        engine.call(plugin,method,options)
    }
    /// Rückfragen der Engine. Nie von der Seite erreichbar.
    pub fn private_call(&self,method:&str,o:Value)->Result<Value,String>{
        let text=|key:&str|o.get(key).and_then(Value::as_str).unwrap_or("").to_owned();
        match method {
            "saveLocation"=>{
                let name=text("name");if name.is_empty()||name.len()>512||name.contains(['/','\\',':']){return Err("INVALID_INPUT".into());}
                #[cfg(feature="messprobe")]
                if let Ok(folder)=std::env::var("WC_WINDOWS_TEST_SAVE_FOLDER"){
                    let path=PathBuf::from(folder).join(&name);win::no_links(&path)?;
                    return Ok(json!({"path":path.to_str().ok_or("WC_SPEICHERN_FEHLER")?}));
                }
                match self.app.dialog().file().set_file_name(&name).blocking_save_file(){
                    None=>Ok(json!({"cancelled":true})),
                    Some(file)=>{let path=file.into_path().map_err(|_|"WC_SPEICHERN_FEHLER")?;win::no_links(&path)?;Ok(json!({"path":path.to_str().ok_or("WC_SPEICHERN_FEHLER")?}))}
                }
            }
            "installer"=>{
                // Nur das geprüfte Setup aus dem eigenen Update-Ordner (SHA-256 und Unterschrift prüft die Engine).
                let path=PathBuf::from(text("path"));let ordner=self.data.join("cache").join("update");
                let name=path.file_name().and_then(|n|n.to_str()).unwrap_or("");
                if !path.starts_with(&ordner)||!name.starts_with("Workflow-Calculate-Pro-Windows-")||!name.ends_with("-x64-setup.exe")||!path.is_file(){return Err("NOT_ALLOWED".into());}
                win::no_links(&path)?;
                #[cfg(feature="messprobe")]
                if std::env::var("WC_WINDOWS_TEST_SAVE_FOLDER").is_ok(){let _=std::fs::write(self.data.join("probe-installer.txt"),name.as_bytes());return Ok(json!({}));}
                win::open(path.to_str().ok_or("NOT_ALLOWED")?).map_err(|_|"UPDATE_START_FEHLER".to_string())?;
                // Die App geht zu, damit das Setup sie ersetzen kann.
                self.closing.store(true,Ordering::SeqCst);let app=self.app.clone();
                std::thread::spawn(move||{std::thread::sleep(Duration::from_millis(1500));app.exit(0);});
                Ok(json!({}))
            }
            _=>Err("NOT_ALLOWED".into()),
        }
    }
    pub fn event(&self,name:&str,data:Value){
        let app=self.app.clone();let detail=json!({"name":name,"data":data});
        let _=self.app.run_on_main_thread(move||{if let Some(window)=app.get_webview_window("main"){
            let _=window.eval(format!("window.dispatchEvent(new CustomEvent('wc-native',{{detail:{}}}));",detail));
        }});
    }
    pub fn shutdown(&self){if let Some(engine)=self.engine.lock().unwrap().as_ref(){engine.stop();}}
}
