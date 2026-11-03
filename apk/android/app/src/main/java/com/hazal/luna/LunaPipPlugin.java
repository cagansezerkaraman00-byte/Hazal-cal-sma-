package com.hazal.luna;

import android.app.Activity;
import android.app.PendingIntent;
import android.app.PictureInPictureParams;
import android.app.RemoteAction;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.util.Rational;
import androidx.annotation.RequiresApi;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;

/**
 * Luna'nın mini penceresi: Android'in kendi "resim içinde resim" penceresi.
 * Luna köşeye küçülür; penceredeki tek tuş sayacı durdurur ya da başlatır ve simgesi sayacın gerçek durumunu gösterir.
 * Tuşa basılınca Luna'ya "toggle" haberi gider; pencere açılıp kapanınca "pip" haberi gider.
 */
@CapacitorPlugin(name = "LunaPip")
public class LunaPipPlugin extends Plugin {

    static final String ACTION_TOGGLE = "com.hazal.luna.MINI_TOGGLE";
    private boolean running = false;
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                running = !running; // simge hemen değişsin; Luna kesin durumu ardından setState ile bildirir
                applyParams();
                notifyListeners("toggle", new JSObject());
            }
        };
        ContextCompat.registerReceiver(getContext(), receiver, new IntentFilter(ACTION_TOGGLE), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(receiver);
        } catch (Exception e) {
            // zaten kaldırılmış
        }
    }

    static boolean supported(Activity activity) {
        return (
            activity != null &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
        );
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", supported(getActivity()));
        call.resolve(result);
    }

    @PluginMethod
    public void setState(PluginCall call) {
        running = Boolean.TRUE.equals(call.getBoolean("running", false));
        getActivity().runOnUiThread(this::applyParams);
        call.resolve();
    }

    @PluginMethod
    public void enter(PluginCall call) {
        Activity activity = getActivity();
        if (!supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("unsupported");
            return;
        }
        running = Boolean.TRUE.equals(call.getBoolean("running", running));
        activity.runOnUiThread(() -> {
            try {
                JSObject result = new JSObject();
                result.put("ok", activity.enterPictureInPictureMode(params()));
                call.resolve(result);
            } catch (Exception e) {
                // ör. kullanıcı Ayarlar'da "Resim içinde resim" iznini kapatmış
                call.reject("disabled");
            }
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    private PictureInPictureParams params() {
        Context context = getContext();
        Intent intent = new Intent(ACTION_TOGGLE).setPackage(context.getPackageName());
        PendingIntent pending = PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Icon icon = Icon.createWithResource(context, running ? R.drawable.luna_mini_pause : R.drawable.luna_mini_play);
        String title = running ? "Duraklat" : "Başlat";
        RemoteAction action = new RemoteAction(icon, title, title, pending);
        return new PictureInPictureParams.Builder()
            .setAspectRatio(new Rational(640, 268)) // Chrome'daki mini pencereyle aynı oran
            .setActions(Collections.singletonList(action))
            .build();
    }

    private void applyParams() {
        Activity activity = getActivity();
        if (!supported(activity) || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            activity.setPictureInPictureParams(params());
        } catch (Exception e) {
            // pencere izni kapalıysa sessizce geç
        }
    }

    void onPipChanged(boolean inPip) {
        JSObject data = new JSObject();
        data.put("inPip", inPip);
        notifyListeners("pip", data, true);
    }
}
