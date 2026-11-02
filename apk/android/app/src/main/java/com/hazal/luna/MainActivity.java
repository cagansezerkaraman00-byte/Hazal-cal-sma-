package com.hazal.luna;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LunaPipPlugin.class);
        super.onCreate(savedInstanceState);
        // Spotify oynatıcısı kendi çerçevesinde (sdk.scdn.co) çalışır; çerezleri reddedilmesin
        if (bridge != null && bridge.getWebView() != null) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(bridge.getWebView(), true);
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        PluginHandle handle = bridge != null ? bridge.getPlugin("LunaPip") : null;
        if (handle != null) ((LunaPipPlugin) handle.getInstance()).onPipChanged(inPip);
    }
}
