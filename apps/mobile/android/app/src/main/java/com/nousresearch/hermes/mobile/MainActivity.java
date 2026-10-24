package com.nousresearch.hermes.mobile;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

/**
 * Hermes Mobile's single activity.
 *
 * The bundled web assets are only the shell (saved servers, sign-in, settings).
 * Opening a server navigates this same WebView to the user's own
 * {@code hermes dashboard} origin, which then serves the dashboard SPA, its
 * {@code /api/ws} chat socket and its session cookies exactly as a browser would.
 * That is deliberate: the dashboard stays same-origin with its own API, so there
 * is no CORS surface to open and no credential to hand to the shell.
 *
 * What that costs is the Capacitor bridge — it is only injected into pages the
 * local server serves, so a remote dashboard page has no JS bridge. Everything
 * the user still needs while connected (back navigation, downloads, cookie
 * persistence) is therefore handled here natively.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Capacitor builds the bridge inside super.onCreate(), so a plugin must be
        // registered before that call rather than after it.
        registerPlugin(HermesShellPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        // A dashboard download (an exported session, a generated file) has no
        // viewer inside a WebView; hand it to the system instead of dropping it.
        webView.setDownloadListener(
            (url, userAgent, contentDisposition, mimeType, contentLength) -> openExternally(url)
        );

        // Back while a Hermes server is on screen. No JS listener can run there
        // (no bridge on a remote origin), so the walk back through the server's
        // history — and then back to this shell — has to be native. Back only
        // leaves the app once the shell itself has nowhere left to go.
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView view = bridge.getWebView();
                        if (view != null && view.canGoBack()) {
                            view.goBack();
                            return;
                        }

                        String shellUrl = bridge.getLocalUrl();
                        String current = view == null ? null : view.getUrl();
                        if (view != null && shellUrl != null && current != null && !current.startsWith(shellUrl)) {
                            view.loadUrl(shellUrl);
                            return;
                        }

                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    }
                }
            );
    }

    @Override
    protected void onPause() {
        super.onPause();
        // The dashboard's session cookie is written by the WebView. Flushing here is
        // what keeps a user signed in after Android reclaims the process — without
        // it, a phone that slept overnight asks for the password again.
        CookieManager.getInstance().flush();
    }

    private void openExternally(String url) {
        if (url == null || url.isEmpty()) {
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException ex) {
            Logger.warn("Hermes Mobile: nothing on this phone can open " + url);
        }
    }
}
