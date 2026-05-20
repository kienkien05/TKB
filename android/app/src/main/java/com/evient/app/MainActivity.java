package com.evient.app;

import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        config = new CapConfig.Builder(this)
            .setAndroidScheme("http")
            .setAllowMixedContent(true)
            .create();

        super.load();

        if (bridge != null) {
            bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
