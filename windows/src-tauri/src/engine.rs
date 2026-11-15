//! Java-Engine als privater Kindprozess (Muster BookLedgerPro Windows): Zeilen-JSON über stdin/stdout,
//! kein Netz-Port. Rückfragen der Engine ({host}) beantwortet die Hülle; Ereignisse ({event}) gehen an die Seite.
use serde_json::{json, Value};
use std::{collections::HashMap, io::{BufRead, BufReader, Write, Read}, path::Path,
    process::{Child, ChildStdin, Command, Stdio}, sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}, mpsc}, time::Duration};
use crate::host::Host;

type Reply = Result<Value, String>;
pub struct Engine {
    child: Mutex<Child>, input: Mutex<ChildStdin>,
    pending: Mutex<HashMap<String, mpsc::Sender<Reply>>>, next: AtomicU64,
    job: Mutex<Option<crate::win::Job>>,
}
impl Engine {
    pub fn start(runtime: &Path, data: &Path, host: &Arc<Host>) -> Result<Arc<Self>, String> {
        let java = runtime.join(if cfg!(windows) { "jre/bin/java.exe" } else { "jre/bin/java" });
        let mut command = Command::new(java);
        command.current_dir(runtime);
        let classpath=if cfg!(windows){"engine/classes;engine/lib/*"}else{"engine/classes:engine/lib/*"};
        command.env_remove("JAVA_TOOL_OPTIONS").env_remove("_JAVA_OPTIONS").env_remove("JDK_JAVA_OPTIONS");
        command.args(["-Xmx512m", "-Dfile.encoding=UTF-8", "-Dsun.jnu.encoding=UTF-8", "-cp"]).arg(classpath)
            .arg("de.familyprojekt.workflowcalculate.desktop.EngineMain").arg(data)
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
        #[cfg(windows)] { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
        let mut child = command.spawn().map_err(|_| "APP_RUNTIME_UNAVAILABLE")?;
        let job=match crate::win::Job::attach(&child){Ok(job)=>job,Err(error)=>{let _=child.kill();return Err(error);}};
        let input = child.stdin.take().ok_or("APP_RUNTIME_UNAVAILABLE")?;
        let output = child.stdout.take().ok_or("APP_RUNTIME_UNAVAILABLE")?;
        let engine = Arc::new(Self { child: Mutex::new(child), input: Mutex::new(input), pending: Mutex::new(HashMap::new()), next: AtomicU64::new(1), job: Mutex::new(Some(job)) });
        let reader_engine = engine.clone(); let weak_host = Arc::downgrade(host);
        std::thread::spawn(move || {
            let mut reader = BufReader::new(output);
            loop {
                let mut bytes = Vec::new();
                match Read::by_ref(&mut reader).take(64*1024*1024+1).read_until(b'\n', &mut bytes) {
                    Ok(0) | Err(_) => break,
                    Ok(_) if bytes.len()>64*1024*1024 || bytes.last()!=Some(&b'\n') => break,
                    _ => {}
                }
                let Ok(message)=serde_json::from_slice::<Value>(&bytes) else { break };
                if let Some(id) = message.get("id").and_then(Value::as_str) {
                    if let Some(reply) = reader_engine.pending.lock().unwrap().remove(id) {
                        let result = match message.get("error").and_then(Value::as_str) {
                            Some(code) => Err(code.to_owned()), None => Ok(message.get("result").cloned().unwrap_or(Value::Null)),
                        }; let _=reply.send(result);
                    }
                } else if let Some(id) = message.get("host").and_then(Value::as_str).map(str::to_owned) {
                    let engine=reader_engine.clone(); let weak=weak_host.clone();
                    std::thread::spawn(move || {
                        let result=weak.upgrade().ok_or_else(|| "APP_CLOSED".to_string()).and_then(|host| host.private_call(
                            message.get("method").and_then(Value::as_str).unwrap_or(""),message.get("options").cloned().unwrap_or(Value::Null)));
                        let envelope=match result { Ok(value)=>json!({"replyTo":id,"result":value}), Err(code)=>json!({"replyTo":id,"error":code}) };
                        let _=engine.write(&envelope);
                    });
                } else if let Some(event)=message.get("event").and_then(Value::as_str) {
                    if let Some(host)=weak_host.upgrade() { host.event(event,message.get("data").cloned().unwrap_or(Value::Null)); }
                }
            }
            for (_, reply) in reader_engine.pending.lock().unwrap().drain() { let _=reply.send(Err("APP_RUNTIME_UNAVAILABLE".into())); }
        });
        Ok(engine)
    }
    fn write(&self,message:&Value)->Result<(),String> {
        let mut input=self.input.lock().map_err(|_|"APP_RUNTIME_UNAVAILABLE")?;
        serde_json::to_writer(&mut *input,message).map_err(|_|"APP_RUNTIME_UNAVAILABLE")?;
        input.write_all(b"\n").and_then(|_|input.flush()).map_err(|_|"APP_RUNTIME_UNAVAILABLE".into())
    }
    pub fn call(&self,plugin:&str,method:&str,options:Value)->Reply {
        let id=self.next.fetch_add(1,Ordering::Relaxed).to_string();let (send,receive)=mpsc::channel();
        self.pending.lock().unwrap().insert(id.clone(),send);
        if let Err(error)=self.write(&json!({"id":id,"plugin":plugin,"method":method,"options":options})) {
            self.pending.lock().unwrap().remove(&id);return Err(error);
        }
        let result=receive.recv_timeout(Duration::from_secs(1200)).unwrap_or_else(|_|Err("APP_OPERATION_TIMEOUT".into()));
        self.pending.lock().unwrap().remove(&id);result
    }
    pub fn stop(&self) { if let Ok(mut child)=self.child.lock() { let _=child.kill();let _=child.wait(); }self.job.lock().unwrap().take(); }
}
