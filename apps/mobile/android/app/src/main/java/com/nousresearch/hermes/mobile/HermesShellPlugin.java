package com.nousresearch.hermes.mobile;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The three things the shell cannot do from JavaScript.
 *
 * A WebView page can neither hold a window flag nor clear another origin's
 * cookie jar, and the package version is native metadata — so those live here.
 * Deliberately absent: anything that reads or writes credentials. Sign-in is the
 * Hermes server's own page, and its session cookies stay in the WebView jar.
 */
@CapacitorPlugin(name = "HermesShell")
public class HermesShellPlugin extends Plugin {

    /** Hold FLAG_KEEP_SCREEN_ON so a long agent turn does not end with the phone asleep. */
    @PluginMethod
    public void setKeepAwake(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));

        getActivity()
            .runOnUiThread(() -> {
                int flag = WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
                if (enabled) {
                    getActivity().getWindow().addFlags(flag);
                } else {
                    getActivity().getWindow().clearFlags(flag);
                }
            });

        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }

    /**
     * Sign out of one server: drop its session cookies (HttpOnly, so unreachable
     * from JS) and its origin's web storage. Called per saved server, never
     * globally — "sign out of everything" is the shell looping over its list.
     */
    @PluginMethod
    public void clearSiteData(PluginCall call) {
        String origin = call.getString("origin", "");
        if (origin == null || origin.isEmpty()) {
            call.reject("origin required");
            return;
        }

        getActivity()
            .runOnUiThread(() ->
                CookieManager.getInstance()
                    .removeCookie(
                        origin,
                        removed -> {
                            WebStorage.getInstance().deleteOrigin(origin, value -> {});

                            JSObject result = new JSObject();
                            result.put("cleared", Boolean.TRUE.equals(removed));
                            call.resolve(result);
                        }
                    )
            );
    }

    /** Version/build for the About row. */
    @PluginMethod
    public void appInfo(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("version", info.versionName == null ? "0.0.0" : info.versionName);
            result.put("build", String.valueOf(PackageInfoCompat.getLongVersionCode(info)));
            result.put("platform", "android");
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException ex) {
            call.reject("package info unavailable");
        }
    }
}
