package com.hazal.luna;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Luna'nın kendi güncellemeleri (ekranlar, yazılar, Spotify, mini pencere çizimi…) APK kurmadan gelir.
 * Yeni Luna dosyaları (web paketi) arka planda indirilir, doğrulanır ve uygulamanın kendi klasörüne açılır;
 * Luna bir sonraki açılışta ya da arkadayken yeni dosyalarla yeniden yüklenir. Adres değişmez (https://localhost),
 * bu yüzden Hazal'ın verileri olduğu gibi kalır.
 *
 * Güvenlik: yeni paket açıldıktan sonra Luna "onayla" demezse (25 sn içinde ya da bir sonraki açılışta) uygulama
 * kendiliğinden son çalışan pakete (ya da APK'nın içindekine) döner ve o paketi bir daha denemez.
 * Yeni bir APK kurulunca indirilmiş paketlerin hepsi bırakılır: APK'nın kendi dosyaları kullanılır.
 */
@CapacitorPlugin(name = "LunaWeb")
public class LunaWebPlugin extends Plugin {

    static final String PREFS = "LunaWeb";
    static final String CAP_PREFS = "CapWebViewSettings"; // Capacitor'ın yeni dosya yolunu sakladığı yer
    static final String CAP_PATH = "serverBasePath";
    static final String K_BEKLEYEN = "bekleyen"; // açılıp henüz onaylanmamış paket klasörü
    static final String K_DENEME = "deneme"; // onaysız kaç kez açıldı
    static final String K_IYI = "iyi"; // son onaylanan paket klasörü ("" = APK'nın içindeki)
    static final String K_BOZUK = "bozuk"; // açılamayan paketlerin derleme numaraları (",123,456,")
    static final String K_APK = "apk"; // paketlerin ait olduğu APK sürümü

    private volatile boolean busy = false;
    private final Handler ui = new Handler(Looper.getMainLooper());

    static File kok(Context c) {
        return new File(c.getFilesDir(), "luna-web");
    }

    /** MainActivity açılırken (Capacitor dosya yolunu okumadan önce) çağrılır. */
    static void baslangic(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String apk = "";
        try {
            apk = Long.toString(PackageInfoCompat.getLongVersionCode(c.getPackageManager().getPackageInfo(c.getPackageName(), 0)));
        } catch (Exception e) {
            // sürüm okunamazsa aşağıdaki karşılaştırma yapılmaz
        }
        if (!apk.isEmpty() && !apk.equals(p.getString(K_APK, ""))) {
            // yeni APK: eski paketler bu APK'ya ait değil (Capacitor da yolu kendisi sıfırlar)
            sil(kok(c));
            p.edit().clear().putString(K_APK, apk).apply();
            c.getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE).edit().putString(CAP_PATH, "").apply();
            return;
        }
        String bekleyen = p.getString(K_BEKLEYEN, null);
        if (bekleyen == null) return;
        int deneme = p.getInt(K_DENEME, 0) + 1;
        if (deneme >= 2) {
            // bir açılış önce de onaylanmadı: bu paket çalışmıyor, son çalışan pakete dön
            String iyi = p.getString(K_IYI, "");
            p.edit().remove(K_BEKLEYEN).remove(K_DENEME).putString(K_BOZUK, p.getString(K_BOZUK, ",") + new File(bekleyen).getName() + ",").apply();
            c.getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE).edit().putString(CAP_PATH, iyi != null && new File(iyi).exists() ? iyi : "").apply();
        } else {
            p.edit().putInt(K_DENEME, deneme).apply();
        }
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void bilgi(PluginCall call) {
        SharedPreferences p = prefs();
        JSObject r = new JSObject();
        r.put("yol", getBridge().getServerBasePath());
        r.put("bekleyen", p.getString(K_BEKLEYEN, ""));
        r.put("bozuk", p.getString(K_BOZUK, ","));
        call.resolve(r);
    }

    /** Web paketini indirir, SHA-256 ile doğrular, açar. Aynı paket zaten açılmışsa yeniden indirmez. */
    @PluginMethod
    public void indir(PluginCall call) {
        String url = call.getString("url");
        Integer kod = call.getInt("kod");
        String sha = call.getString("sha256", "");
        if (url == null || !url.startsWith("https://") || kod == null || kod <= 0) {
            call.reject("adres");
            return;
        }
        if (prefs().getString(K_BOZUK, ",").contains("," + kod + ",")) {
            call.reject("bozuk");
            return;
        }
        File hedef = new File(kok(getContext()), Integer.toString(kod));
        if (new File(hedef, "index.html").exists()) {
            JSObject r = new JSObject();
            r.put("yol", hedef.getAbsolutePath());
            call.resolve(r);
            return;
        }
        if (busy) {
            call.reject("mesgul");
            return;
        }
        busy = true;
        new Thread(() -> {
            File zip = new File(getContext().getCacheDir(), "luna-web-" + kod + ".zip");
            File gecici = new File(kok(getContext()), kod + ".yeni");
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(30000);
                int code = conn.getResponseCode();
                if (code != 200) throw new Exception("HTTP " + code);
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long total = conn.getContentLengthLong(), done = 0;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(zip)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        md.update(buf, 0, n);
                        done += n;
                    }
                }
                if (total > 0 && done != total) throw new Exception("dosya eksik indi");
                String ozet = hex(md.digest());
                if (sha != null && !sha.isEmpty() && !sha.equalsIgnoreCase(ozet)) throw new Exception("doğrulama tutmadı");
                sil(gecici);
                ac(zip, gecici);
                if (!new File(gecici, "index.html").exists()) throw new Exception("pakette index.html yok");
                sil(hedef);
                if (!gecici.renameTo(hedef)) throw new Exception("klasör taşınamadı");
                JSObject r = new JSObject();
                r.put("yol", hedef.getAbsolutePath());
                call.resolve(r);
            } catch (Exception e) {
                sil(gecici);
                call.reject("indirilemedi: " + e.getMessage());
            } finally {
                //noinspection ResultOfMethodCallIgnored
                zip.delete();
                busy = false;
            }
        }).start();
    }

    /** İndirilmiş paketle Luna'yı yeniden yükler (adres aynı kalır). 25 sn içinde onay gelmezse geri döner. */
    @PluginMethod
    public void uygula(PluginCall call) {
        Integer kod = call.getInt("kod");
        File hedef = kod == null ? null : new File(kok(getContext()), Integer.toString(kod));
        if (hedef == null || !new File(hedef, "index.html").exists()) {
            call.reject("paket yok");
            return;
        }
        String yol = hedef.getAbsolutePath();
        prefs().edit().putString(K_BEKLEYEN, yol).putInt(K_DENEME, 0).apply();
        getContext().getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE).edit().putString(CAP_PATH, yol).apply();
        call.resolve();
        ui.post(() -> getBridge().setServerBasePath(yol));
        ui.postDelayed(() -> {
            if (yol.equals(prefs().getString(K_BEKLEYEN, null))) geriDon();
        }, 25000);
    }

    /** Yeni paket sorunsuz açıldı: artık "son çalışan" o. Eski paketler silinir (yer kaplamasın). */
    @PluginMethod
    public void onayla(PluginCall call) {
        SharedPreferences p = prefs();
        String bekleyen = p.getString(K_BEKLEYEN, null);
        String simdiki = getBridge().getServerBasePath();
        if (bekleyen != null && bekleyen.equals(simdiki)) {
            p.edit().putString(K_IYI, bekleyen).remove(K_BEKLEYEN).remove(K_DENEME).apply();
            File[] hepsi = kok(getContext()).listFiles();
            if (hepsi != null) for (File f : hepsi) if (!f.getAbsolutePath().equals(bekleyen)) sil(f);
        }
        call.resolve();
    }

    private void geriDon() {
        SharedPreferences p = prefs();
        String bekleyen = p.getString(K_BEKLEYEN, null);
        if (bekleyen == null) return;
        String iyi = p.getString(K_IYI, "");
        boolean iyiVar = iyi != null && !iyi.isEmpty() && new File(iyi, "index.html").exists();
        p.edit().remove(K_BEKLEYEN).remove(K_DENEME).putString(K_BOZUK, p.getString(K_BOZUK, ",") + new File(bekleyen).getName() + ",").apply();
        getContext().getSharedPreferences(CAP_PREFS, Context.MODE_PRIVATE).edit().putString(CAP_PATH, iyiVar ? iyi : "").apply();
        if (iyiVar) getBridge().setServerBasePath(iyi);
        else getBridge().setServerAssetPath("public");
    }

    private static void ac(File zip, File hedef) throws Exception {
        String kokYol = hedef.getCanonicalPath() + File.separator;
        //noinspection ResultOfMethodCallIgnored
        hedef.mkdirs();
        try (ZipInputStream z = new ZipInputStream(new FileInputStream(zip))) {
            ZipEntry e;
            byte[] buf = new byte[65536];
            while ((e = z.getNextEntry()) != null) {
                File f = new File(hedef, e.getName());
                if (!f.getCanonicalPath().startsWith(kokYol)) throw new Exception("geçersiz dosya yolu: " + e.getName());
                if (e.isDirectory()) {
                    //noinspection ResultOfMethodCallIgnored
                    f.mkdirs();
                    continue;
                }
                //noinspection ResultOfMethodCallIgnored
                f.getParentFile().mkdirs();
                try (OutputStream out = new FileOutputStream(f)) {
                    int n;
                    while ((n = z.read(buf)) > 0) out.write(buf, 0, n);
                }
            }
        }
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x));
        return s.toString();
    }

    static void sil(File f) {
        if (f == null || !f.exists()) return;
        File[] alt = f.listFiles();
        if (alt != null) for (File a : alt) sil(a);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
