/**
 * ConnectScreen — runs the local HTTP server and shows the URL for the extension to connect to.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Clipboard, Alert,
} from 'react-native';
import * as Network from 'expo-network';
import { startServer, stopServer, isServerRunning, SERVER_PORT } from '../services/httpServer';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function ConnectScreen({ navigation }) {
  const [dark]    = useState(true);
  const theme     = getTheme(dark);

  const [running,  setRunning]  = useState(false);
  const [ip,       setIp]       = useState('');
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setRunning(isServerRunning());
    Network.getIpAddressAsync().then(addr => setIp(addr || '')).catch(() => {});
  }, []);

  function toggle() {
    if (running) {
      stopServer();
      setRunning(false);
      setError('');
    } else {
      setError('');
      startServer((event) => {
        if (event.type === 'started') setRunning(true);
        if (event.type === 'error')   { setRunning(false); setError(event.error || 'Failed to start server'); }
        if (event.type === 'stopped') setRunning(false);
      });
      // Refresh IP in case network changed
      Network.getIpAddressAsync().then(addr => setIp(addr || '')).catch(() => {});
    }
  }

  const url = ip ? `http://${ip}:${SERVER_PORT}` : '';

  function copyUrl() {
    if (!url) return;
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Connect to Extension</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: running ? theme.success : theme.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: running ? theme.success : theme.border2 }]} />
            <Text style={[styles.statusText, { color: running ? theme.success : theme.muted }]}>
              {running ? 'Server running' : 'Server stopped'}
            </Text>
          </View>

          {running && url ? (
            <View style={[styles.urlBox, { backgroundColor: theme.surface, borderColor: theme.border2 }]}>
              <Text style={[styles.urlText, { color: theme.text }]} selectable>{url}</Text>
              <TouchableOpacity onPress={copyUrl} style={styles.copyBtn}>
                <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? theme.success : theme.muted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: running ? theme.error + '22' : theme.primary }]}
            onPress={toggle}
            activeOpacity={0.8}
          >
            <Feather
              name={running ? 'wifi-off' : 'wifi'}
              size={18}
              color={running ? theme.error : '#fff'}
            />
            <Text style={[styles.toggleBtnText, { color: running ? theme.error : '#fff' }]}>
              {running ? 'Stop Server' : 'Start Server'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>HOW TO CONNECT</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { icon: 'wifi', text: 'Make sure your phone and computer are on the same Wi-Fi network.' },
            { icon: 'play-circle', text: 'Tap "Start Server" above to begin hosting.' },
            { icon: 'copy', text: 'Copy the URL shown and paste it into the extension\'s Settings → Mobile App URL.' },
            { icon: 'download-cloud', text: 'In the extension, click "Sync from Mobile" to pull your contexts.' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.stepNumText, { color: theme.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.muted }]}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Available endpoints (for info) */}
        {running && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>AVAILABLE ENDPOINTS</Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {['/status', '/products', '/scenarios', '/contexts', '/all'].map(ep => (
                <View key={ep} style={styles.endpointRow}>
                  <View style={[styles.methodBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.methodText, { color: theme.primary }]}>GET</Text>
                  </View>
                  <Text style={[styles.endpointText, { color: theme.text }]} selectable>
                    {url}{ep}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },

  scroll: { padding: 16 },

  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  statusText:  { fontSize: 14, fontWeight: '700' },

  urlBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
    gap: 8,
  },
  urlText:  { flex: 1, fontSize: 14, fontFamily: 'monospace' },
  copyBtn:  { padding: 4 },
  errorText: { fontSize: 13, marginBottom: 12 },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 10,
  },
  toggleBtnText: { fontSize: 15, fontWeight: '700' },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 8, textTransform: 'uppercase',
  },

  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 12, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19 },

  endpointRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  methodBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  methodText:  { fontSize: 10, fontWeight: '800' },
  endpointText: { flex: 1, fontSize: 12, fontFamily: 'monospace' },
});
