import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Switch,
} from 'react-native';
import { getSettings, saveSettings } from '../services/storage';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

const MODELS = [
  { value: 'gpt-4o',       label: 'GPT-4o (Recommended)' },
  { value: 'gpt-4o-mini',  label: 'GPT-4o Mini (Faster)' },
  { value: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
];

export default function SettingsScreen({ navigation }) {
  const [dark,     setDark]     = useState(true);
  const [key,      setKey]      = useState('');
  const [model,    setModel]    = useState('gpt-4o');
  const [showKey,  setShowKey]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  const theme = getTheme(dark);

  useEffect(() => {
    getSettings().then(s => {
      setKey(s.openaiKey || '');
      setModel(s.openaiModel || 'gpt-4o');
      setDark(s.darkMode !== false);
    });
  }, []);

  async function save() {
    await saveSettings({ openaiKey: key.trim(), openaiModel: model, darkMode: dark });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* OpenAI */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>OPENAI CONFIGURATION</Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.muted }]}>API KEY</Text>
          <View style={[styles.keyRow, { borderColor: theme.border2, backgroundColor: theme.surface }]}>
            <TextInput
              style={[styles.keyInput, { color: theme.text }]}
              value={key}
              onChangeText={setKey}
              placeholder="sk-…"
              placeholderTextColor={theme.muted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
              <Feather name={showKey ? 'eye-off' : 'eye'} size={18} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: theme.dimmed }]}>
            Stored locally on this device only. Used for Whisper transcription and GPT extraction.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.muted, marginTop: 8 }]}>MODEL</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {MODELS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.modelOption, model === m.value && { backgroundColor: theme.primary + '18' }]}
              onPress={() => setModel(m.value)}
            >
              <View style={[styles.radio, { borderColor: model === m.value ? theme.primary : theme.border2 }]}>
                {model === m.value && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
              </View>
              <Text style={[styles.modelLabel, { color: theme.text }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: theme.muted, marginTop: 8 }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.prefRow}>
            <Feather name="moon" size={18} color={theme.muted} />
            <Text style={[styles.prefLabel, { color: theme.text }]}>Dark Mode</Text>
            <Switch
              value={dark}
              onValueChange={setDark}
              trackColor={{ false: theme.border2, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.btnSave, { backgroundColor: saved ? theme.success : theme.accent }]}
          onPress={save}
          activeOpacity={0.85}
        >
          <Feather name={saved ? 'check' : 'save'} size={18} color={theme.accentFg} />
          <Text style={[styles.btnSaveText, { color: theme.accentFg }]}>
            {saved ? 'Saved!' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.dimmed }]}>
          AI Tester Mobile v1.0.0 · Powered by OpenAI
        </Text>
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

  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 8, textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },

  keyRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    marginBottom: 8,
  },
  keyInput: { flex: 1, fontSize: 14, paddingVertical: 10, fontFamily: 'monospace' },
  eyeBtn:   { padding: 6 },
  hint:     { fontSize: 11, lineHeight: 16 },

  modelOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 8, marginBottom: 4,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  modelLabel: { fontSize: 14 },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefLabel: { flex: 1, fontSize: 14, fontWeight: '600' },

  btnSave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 12, marginTop: 8, marginBottom: 16,
  },
  btnSaveText: { fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 11 },
});
