package de.familyprojekt.workflowcalculate.desktop;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.DosFileAttributes;
import java.util.Locale;

/** Kleine Dateihelfer der Windows-Engine. Keine Verweise (Symlinks/Junctions) auf dem Weg, atomares Schreiben. */
final class DesktopFiles {
    private DesktopFiles(){}
    static void noLinks(Path path)throws IOException {
        Path current=path.getRoot();
        for(Path part:path){
            current=current==null?part:current.resolve(part);
            if(!Files.exists(current,LinkOption.NOFOLLOW_LINKS))continue;
            if(Files.isSymbolicLink(current))throw new IOException("ORDNER_VERWEIS");
            try{
                DosFileAttributes a=Files.readAttributes(current,DosFileAttributes.class,LinkOption.NOFOLLOW_LINKS);
                if(a.isOther())throw new IOException("ORDNER_VERWEIS");
            }catch(UnsupportedOperationException keinWindows){/* Linux-Prüflauf */}
        }
    }
    static void atomic(Path target,byte[] bytes)throws IOException {
        Path dir=target.toAbsolutePath().getParent();Files.createDirectories(dir);
        Path temp=Files.createTempFile(dir,".do-",".tmp");
        try{
            try(FileOutputStream out=new FileOutputStream(temp.toFile())){out.write(bytes);out.getFD().sync();}
            Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
        }finally{Files.deleteIfExists(temp);}
    }
    /** Wie NativeUtil.filename unter Android, zusätzlich ohne die unter Windows verbotenen Zeichen. */
    static String filename(String value){
        String name=value==null?"Dokument":value.replaceAll("[\\p{Cntrl}/\\\\:*?\"<>|]","_").trim();
        while(name.endsWith(".")||name.endsWith(" "))name=name.substring(0,name.length()-1);
        if(name.isEmpty()||name.equals(".")||name.equals(".."))return "Dokument";
        String stamm=name.contains(".")?name.substring(0,name.indexOf('.')):name;
        if(stamm.toUpperCase(Locale.ROOT).matches("CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9]"))name="_"+name;
        if(name.length()>180)name=name.substring(0,180);
        return name;
    }
    static String mime(String value){
        if(value==null)return "application/octet-stream";
        String m=value.split(";",2)[0].trim().toLowerCase(Locale.ROOT);
        return m.matches("[a-z0-9.+-]+/[a-z0-9.+-]+")?m:"application/octet-stream";
    }
    static long integer(Object value)throws IOException {
        if(!(value instanceof Number))throw new IOException("INVALID_NUMBER");
        double number=((Number)value).doubleValue();
        if(!Double.isFinite(number)||number<0||number!=Math.rint(number)||number>9007199254740991d)throw new IOException("INVALID_NUMBER");
        return (long)number;
    }
    static String hex(byte[] value){
        StringBuilder out=new StringBuilder(value.length*2);
        for(byte b:value)out.append(String.format(Locale.ROOT,"%02x",b&255));
        return out.toString();
    }
}
