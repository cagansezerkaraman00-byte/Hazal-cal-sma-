package com.hazal.luna;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Luna'nın kendi kendini güncellemesi: yeni APK'yı indirir ve Android'in "Güncelle" penceresini açar.
 * Yeni APK aynı anahtarla imzalı olduğu için eskisinin üstüne kurulur; veriler kalır.
 * Android, Luna'ya bir kez "Bu kaynaktan yüklemeye izin ver" izni verilmesini ister; izin yoksa o ayar ekranı açılır.
 */
@CapacitorPlugin(name = "LunaGuncelle")
public class LunaGuncellePlugin extends Plugin {

    private volatile boolean busy = false;

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), "guncelleme");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return new File(dir, "luna.apk");
    }

    @PluginMethod
    public void indirVeKur(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("adres");
            return;
        }
        if (busy) {
            call.reject("mesgul");
            return;
        }
        busy = true;
        new Thread(() -> {
            File apk = apkFile();
            try {
                // github.com → objects.githubusercontent.com yönlendirmesi kendiliğinden izlenir (ikisi de https)
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                int code = conn.getResponseCode();
                if (code != 200) throw new Exception("HTTP " + code);
                long total = conn.getContentLengthLong(), done = 0;
                int last = -1;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != last) {
                            last = pct;
                            JSObject p = new JSObject();
                            p.put("yuzde", pct);
                            notifyListeners("ilerleme", p);
                        }
                    }
                }
                if (total > 0 && done != total) throw new Exception("dosya eksik indi");
                getActivity().runOnUiThread(() -> install(call, apk));
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                apk.delete();
                call.reject("indirilemedi: " + e.getMessage());
            } finally {
                busy = false;
            }
        }).start();
    }

    /** İzin verildikten sonra: daha önce indirilen dosyayı kur (yeniden indirmeden). */
    @PluginMethod
    public void kur(PluginCall call) {
        File apk = apkFile();
        if (!apk.exists() || apk.length() == 0) {
            call.reject("dosya yok");
            return;
        }
        getActivity().runOnUiThread(() -> install(call, apk));
    }

    private void install(PluginCall call, File apk) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + context.getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(settings);
            JSObject result = new JSObject();
            result.put("izin", false);
            call.resolve(result);
            return;
        }
        Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        JSObject result = new JSObject();
        result.put("izin", true);
        call.resolve(result);
    }
}
