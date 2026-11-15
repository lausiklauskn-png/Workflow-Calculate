//! Windows-Adapter der Hülle. Auf anderen Systemen (Prüflauf unter Linux) melden sie „nicht verfügbar“.
use std::path::Path;

#[cfg(windows)]
pub fn startup_error(){
    use windows::{core::HSTRING,Win32::UI::WindowsAndMessaging::{MessageBoxW,MB_OK,MB_ICONERROR}};
    unsafe{MessageBoxW(None,&HSTRING::from("Workflow Calculate Pro konnte nicht starten. Deine Sortierung und deine Ordner wurden nicht verändert. Bitte Installation und freien Speicher prüfen.\n\nWorkflow Calculate Pro could not start. Nothing was changed.\n\nAPP_START_FAILED"),&HSTRING::from("Workflow Calculate Pro"),MB_OK|MB_ICONERROR);}
}
#[cfg(not(windows))]
pub fn startup_error(){}

/// Kein Verweis (Symlink, Junction) auf dem ganzen Weg.
pub fn no_links(path:&Path)->Result<(),String> {
    let mut current=std::path::PathBuf::new();
    for part in path.components() {
        current.push(part);
        match std::fs::symlink_metadata(&current) {
            Ok(meta)=>{
                if meta.file_type().is_symlink() {return Err("ORDNER_VERWEIS".into());}
                #[cfg(windows)] {use std::os::windows::fs::MetadataExt;if meta.file_attributes()&0x400!=0{return Err("ORDNER_VERWEIS".into());}}
            }
            Err(error) if error.kind()==std::io::ErrorKind::NotFound=>{},
            Err(_)=>return Err("ORDNER_VERWEIS".into()),
        }
    } Ok(())
}

/// Öffnet Adresse, Ordner oder Programm mit dem, was Windows dafür vorsieht (Browser, Explorer, das Programm selbst).
#[cfg(windows)]
pub fn open(target:&str)->Result<(),String>{
    use windows::{core::{HSTRING,PCWSTR},Win32::UI::{Shell::ShellExecuteW,WindowsAndMessaging::SW_SHOWNORMAL}};
    let result=unsafe{ShellExecuteW(None,&HSTRING::from("open"),&HSTRING::from(target),PCWSTR::null(),PCWSTR::null(),SW_SHOWNORMAL)};
    if result.0 as isize>32{Ok(())}else{Err("FILE_UNAVAILABLE".into())}
}
#[cfg(not(windows))]
pub fn open(_:&str)->Result<(),String>{Err("FILE_UNAVAILABLE".into())}

/// Schließen oder Absturz der App beendet auch die Java-Engine.
pub struct Job(usize);
#[cfg(windows)]
impl Job {
    pub fn attach(child:&std::process::Child)->Result<Self,String>{
        use std::os::windows::io::AsRawHandle;
        use windows::{core::PCWSTR,Win32::{Foundation::{HANDLE,CloseHandle},System::JobObjects::*}};
        unsafe{
            let handle=CreateJobObjectW(None,PCWSTR::null()).map_err(|_|"APP_RUNTIME_UNAVAILABLE")?;
            let mut information=JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();information.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let result=SetInformationJobObject(handle,JobObjectExtendedLimitInformation,&information as *const _ as *const core::ffi::c_void,std::mem::size_of_val(&information) as u32)
                .and_then(|_|AssignProcessToJobObject(handle,HANDLE(child.as_raw_handle())));
            if result.is_err(){let _=CloseHandle(handle);return Err("APP_RUNTIME_UNAVAILABLE".into());}
            Ok(Self(handle.0 as usize))
        }
    }
}
#[cfg(windows)]
impl Drop for Job {fn drop(&mut self){unsafe{let _=windows::Win32::Foundation::CloseHandle(windows::Win32::Foundation::HANDLE(self.0 as *mut core::ffi::c_void));}}}
#[cfg(not(windows))]
impl Job {pub fn attach(_:&std::process::Child)->Result<Self,String>{Ok(Self(0))}}
