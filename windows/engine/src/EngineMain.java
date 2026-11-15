package de.familyprojekt.workflowcalculate.desktop;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.*;
import org.json.JSONObject;

/** Privates Eltern/Kind-Protokoll über geerbtes stdio (Muster Private Brain Pro Windows). Kein Netz-Port, keine Seiten-API.
 *  Jede Zeile ein JSON: Aufruf {id,plugin,method,options} → {id,result|error}; Rückfrage an die Hülle {host,method,options}
 *  → {replyTo,result|error}; Ereignis {event,data}. */
public final class EngineMain {
    private static final ConcurrentHashMap<String,CompletableFuture<JSONObject>> replies=new ConcurrentHashMap<>();
    private static final ExecutorService workers=Executors.newVirtualThreadPerTaskExecutor();
    private static final PrintWriter output=new PrintWriter(new OutputStreamWriter(System.out,StandardCharsets.UTF_8),true);
    static synchronized void send(JSONObject value){output.println(value.toString());}
    static JSONObject host(String method,JSONObject options)throws Exception {
        String id=UUID.randomUUID().toString();CompletableFuture<JSONObject> response=new CompletableFuture<>();replies.put(id,response);
        try{
            send(new JSONObject().put("host",id).put("method",method).put("options",options));
            JSONObject result=response.get(15,TimeUnit.MINUTES);
            if(result.has("error"))throw new IOException(result.getString("error"));
            return result.getJSONObject("result");
        }finally{replies.remove(id);}
    }
    static void event(String name,JSONObject value){send(new JSONObject().put("event",name).put("data",value));}
    public static void main(String[] args)throws Exception {
        if(args.length!=1)throw new IllegalArgumentException("APP_CONFIGURATION_INVALID");
        CompletableFuture<DesktopService> service=new CompletableFuture<>();
        workers.submit(()->{
            try{service.complete(new DesktopService(Path.of(args[0]),EngineMain::host));}
            catch(Throwable error){
                org.json.JSONArray types=new org.json.JSONArray();
                for(int i=0;i<8&&error!=null;i++,error=error.getCause())types.put(error.getClass().getName());
                event("Desktop:startupFailure",new JSONObject().put("types",types));
                service.completeExceptionally(new IOException("APP_RUNTIME_UNAVAILABLE"));
            }
        });
        try(BufferedReader input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8))){
            String line;
            while((line=limitedLine(input))!=null){
                JSONObject message=new JSONObject(line);
                if(message.has("replyTo")){
                    CompletableFuture<JSONObject> reply=replies.get(message.getString("replyTo"));if(reply!=null)reply.complete(message);continue;
                }
                workers.submit(()->{
                    String id=message.optString("id");
                    try{send(new JSONObject().put("id",id).put("result",service.get().call(message.getString("plugin"),message.getString("method"),message.optJSONObject("options"))));}
                    catch(Throwable error){Throwable cause=error instanceof ExecutionException?error.getCause():error;send(new JSONObject().put("id",id).put("error",DesktopService.code(cause)));}
                });
            }
        }finally{workers.shutdownNow();for(var reply:replies.values())reply.completeExceptionally(new EOFException());}
    }
    private static String limitedLine(Reader reader)throws IOException {
        StringBuilder line=new StringBuilder();int c;
        while((c=reader.read())!=-1){if(c=='\n')return line.toString();if(line.length()>=64*1024*1024)throw new IOException("APP_PROTOCOL_LIMIT");if(c!='\r')line.append((char)c);}
        return line.length()==0?null:line.toString();
    }
}
