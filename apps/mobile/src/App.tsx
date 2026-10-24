import { App as CapApp } from '@capacitor/app';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useServerProbes } from './app/hooks/use-server-probes';
import { AddServerScreen } from './app/screens/AddServerScreen';
import { ServersScreen } from './app/screens/ServersScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { isNative, openDashboard } from './lib/connect';
import { HermesShell } from './lib/native';
import { parseServerUrl, ServerUrlError } from './lib/server-url';
import {
  type HermesServer,
  parseServerList,
  removeServer,
  type ServerList,
  sortServers,
  toServer,
  touchServer,
  upsertServer
} from './lib/servers';
import { loadSettings, type MobileSettings, saveSettings } from './lib/settings';
import { localKeyValueStorage, readJSON, SERVERS_KEY, writeJSON } from './lib/storage';

type ScreenName = 'servers' | 'add' | 'settings';

/**
 * The shell. Three screens around one job: pick a Hermes server and hand the
 * WebView to it.
 *
 * The saved list and the two preferences live in this app's own localStorage
 * (see lib/storage.ts); everything the server owns — sessions, sign-in, secrets
 * — stays on the server's origin.
 */
export default function App() {
  const [screen, setScreen] = useState<ScreenName>('servers');
  const [editing, setEditing] = useState<HermesServer | null>(null);

  const [servers, setServers] = useState<ServerList>(() =>
    sortServers(readJSON(localKeyValueStorage, SERVERS_KEY, parseServerList, []))
  );

  const [settings, setSettings] = useState<MobileSettings>(() => loadSettings(localKeyValueStorage));
  const [toast, setToast] = useState<string | null>(null);
  const { probeState, refreshAll, refreshOne, refreshing } = useServerProbes(servers);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);

    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }

    toastTimer.current = window.setTimeout(() => setToast(null), 3_500);
  }, []);

  useEffect(() => writeJSON(localKeyValueStorage, SERVERS_KEY, servers), [servers]);
  useEffect(() => saveSettings(localKeyValueStorage, settings), [settings]);

  // The keep-awake flag is a native window flag, so it has to be re-applied
  // whenever the preference changes (and once at boot — see lib/bootstrap.ts).
  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void HermesShell.setKeepAwake({ enabled: settings.keepAwake }).catch(() => undefined);
  }, [settings.keepAwake]);

  // Android's back button while the shell is on screen. (Once the WebView has
  // navigated to a Hermes server the bridge is gone; MainActivity.kt owns that
  // half — back walks the server's history, then returns here.)
  useEffect(() => {
    if (!isNative()) {
      return;
    }

    let subscription: { remove: () => void } | undefined;

    void CapApp.addListener('backButton', () => {
      setScreen((current) => {
        if (current === 'servers') {
          void CapApp.exitApp();

          return current;
        }

        setEditing(null);

        return 'servers';
      });
    })
      .then((listener) => {
        subscription = listener;
      })
      .catch(() => undefined);

    return () => subscription?.remove();
  }, []);

  const openServer = useCallback(
    (server: HermesServer) => {
      setServers((current) => sortServers(touchServer(current, server.href, Date.now())));
      openDashboard(server.href);
    },
    []
  );

  const saveServer = useCallback(
    ({ href, label }: { href: string; label: string }) => {
      try {
        const parts = parseServerUrl(href);
        const server = toServer(parts, { label });

        setServers((current) => sortServers(upsertServer(current, server)));
        setEditing(null);
        setScreen('servers');
        notify(`${label || parts.defaultLabel} saved`);
      } catch (error) {
        notify(error instanceof ServerUrlError ? error.message : 'Could not save that address.');
      }
    },
    [notify]
  );

  const signOut = useCallback(
    async (server: HermesServer) => {
      if (!isNative()) {
        notify('Sign-out needs the Android app (browser dev has no cookie jar to clear).');

        return;
      }

      try {
        await HermesShell.clearSiteData({ origin: server.origin });
        notify(`Signed out of ${server.label}`);
      } catch {
        notify('Could not clear that server’s session.');
      }
    },
    [notify]
  );

  const signOutEverywhere = useCallback(async () => {
    if (!isNative()) {
      notify('Sign-out needs the Android app.');

      return;
    }

    const results = await Promise.allSettled(servers.map((server) => HermesShell.clearSiteData({ origin: server.origin })));
    const cleared = results.filter((result) => result.status === 'fulfilled').length;

    notify(cleared ? `Signed out of ${cleared} server${cleared === 1 ? '' : 's'}` : 'Nothing was signed out.');
  }, [notify, servers]);

  if (screen === 'add') {
    return (
      <>
        <AddServerScreen
          editing={editing}
          onCancel={() => {
            setEditing(null);
            setScreen('servers');
          }}
          onSave={saveServer}
        />
        <Toast message={toast} />
      </>
    );
  }

  if (screen === 'settings') {
    return (
      <>
        <SettingsScreen
          onBack={() => setScreen('servers')}
          onClearAll={() => void signOutEverywhere()}
          onSettingsChange={setSettings}
          serverCount={servers.length}
          settings={settings}
        />
        <Toast message={toast} />
      </>
    );
  }

  return (
    <>
      <ServersScreen
        onAdd={() => {
          setEditing(null);
          setScreen('add');
        }}
        onEdit={(server) => {
          setEditing(server);
          setScreen('add');
        }}
        onOpen={openServer}
        onRemove={(server) => {
          setServers((current) => sortServers(removeServer(current, server.href)));
          notify(`Removed ${server.label}`);
        }}
        onReprobe={(server) => void refreshOne(server.href)}
        onSettings={() => setScreen('settings')}
        onSignOut={(server) => void signOut(server)}
        probeState={probeState}
        refreshAll={() => void refreshAll()}
        refreshing={refreshing}
        servers={servers}
      />
      <Toast message={toast} />
    </>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-6">
      <p className="mx-auto max-w-sm rounded-xl border border-line bg-panel-raised px-4 py-3 text-center text-xs leading-5 text-text-primary shadow-lg">
        {message}
      </p>
    </div>
  );
}
