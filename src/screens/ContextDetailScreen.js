import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Clipboard from 'expo-clipboard';
import { getContexts, upsertContext, deleteContext } from '../services/storage';
import { buildExtensionJSON, buildTextSummary } from '../utils/export';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';
import SectionCard from '../components/SectionCard';
import Pill from '../components/Pill';

export default function ContextDetailScreen({ navigation, route }) {
  const { contextId } = route.params;
  const [dark]    = useState(true);
  const theme     = getTheme(dark);

  const [ctx,       setCtx]       = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [draft,     setDraft]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [exported,  setExported]  = useState(false);

  useFocusEffect(
    useCallback(() => { load(); }, [contextId])
  );

  async function load() {
    const all = await getContexts();
    const found = all.find(c => c.id === contextId);
    if (found) { setCtx(found); setDraft(JSON.parse(JSON.stringify(found))); }
    else navigation.goBack();
  }

  // ── EDIT ──
  function startEdit() { setDraft(JSON.parse(JSON.stringify(ctx))); setEditing(true); }
  function cancelEdit() { setDraft(JSON.parse(JSON.stringify(ctx))); setEditing(false); }

  async function saveEdit() {
    setSaving(true);
    await upsertContext(draft);
    setCtx(draft);
    setEditing(false);
    setSaving(false);
  }

  function updateField(field, value) {
    setDraft(d => ({ ...d, [field]: value }));
  }

  function updateResource(idx, field, value) {
    const resources = [...(draft.resources || [])];
    resources[idx] = { ...resources[idx], [field]: value };
    setDraft(d => ({ ...d, resources }));
  }

  function removeResource(idx) {
    const resources = (draft.resources || []).filter((_, i) => i !== idx);
    setDraft(d => ({ ...d, resources }));
  }

  function addResource() {
    const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const resources = [...(draft.resources || []), { id: genId(), type: 'note', label: '', value: '' }];
    setDraft(d => ({ ...d, resources }));
  }

  // ── EXPORT ──
  async function copyJSON() {
    const json = buildExtensionJSON([editing ? draft : ctx]);
    await Clipboard.setStringAsync(json);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }

  async function shareContext() {
    const text = buildTextSummary(editing ? draft : ctx);
    await Share.share({ message: text, title: ctx?.name });
  }

  // ── DELETE ──
  function onDelete() {
    Alert.alert('Delete Context', `Delete "${ctx?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteContext(contextId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!ctx) return null;

  const data = editing ? draft : ctx;
  const { name, description, strategy, procedures, scenarios, instruction, resources = [] } = data;

  function Field({ label, field, multiline = true, rows = 3 }) {
    if (!editing && !data[field]) return null;
    return (
      <SectionCard title={label} theme={theme}>
        {editing ? (
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border2 }]}
            value={data[field] || ''}
            onChangeText={v => updateField(field, v)}
            multiline={multiline}
            numberOfLines={rows}
            placeholderTextColor={theme.muted}
            placeholder={`Enter ${label.toLowerCase()}…`}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: field === 'instruction' ? theme.primary : theme.text }]}>
            {data[field]}
          </Text>
        )}
      </SectionCard>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Nav */}
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
          {editing ? 'Edit Context' : (ctx.name || 'Context')}
        </Text>
        <View style={styles.navActions}>
          {!editing && (
            <TouchableOpacity style={styles.iconBtn} onPress={startEdit}>
              <Feather name="edit-2" size={18} color={theme.muted} />
            </TouchableOpacity>
          )}
          {!editing && (
            <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
              <Feather name="trash-2" size={18} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Name */}
        {editing ? (
          <SectionCard title="Context Name" theme={theme}>
            <TextInput
              style={[styles.input, styles.inputBig, { color: theme.text, borderColor: theme.border2 }]}
              value={draft.name || ''}
              onChangeText={v => updateField('name', v)}
              placeholder="Context name…"
              placeholderTextColor={theme.muted}
            />
          </SectionCard>
        ) : (
          <View style={[styles.nameCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.nameIcon, { backgroundColor: theme.accent }]}>
              <Text style={[styles.nameIconText, { color: theme.accentFg }]}>
                {(name || 'C').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nameText, { color: theme.text }]}>{name || 'Unnamed'}</Text>
              {ctx.updatedAt && (
                <Text style={[styles.nameSub, { color: theme.dimmed }]}>
                  Updated {new Date(ctx.updatedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}

        <Field label="Description"           field="description"  rows={3} />
        <Field label="Testing Strategy"      field="strategy"     rows={3} />
        <Field label="Procedures"            field="procedures"   rows={3} />
        <Field label="Scenarios"             field="scenarios"    rows={3} />
        <Field label="Automation Instruction" field="instruction" rows={4} />

        {/* Resources */}
        {(editing || resources.length > 0) && (
          <SectionCard
            title={`Resources${resources.length ? ` (${resources.length})` : ''}`}
            theme={theme}
          >
            {(editing ? draft.resources : resources).map((r, i) => (
              <View key={r.id || i} style={[styles.resourceItem, i > 0 && { marginTop: 12 }]}>
                {editing ? (
                  <>
                    <View style={styles.resourceEditRow}>
                      {/* Type selector — simple text buttons */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        {['credentials', 'api', 'testData', 'url', 'note'].map(t => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.typeBtn, r.type === t && { backgroundColor: theme.primary }]}
                            onPress={() => updateResource(i, 'type', t)}
                          >
                            <Text style={[styles.typeBtnText, r.type === t && { color: '#fff' }]}>
                              {t.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity onPress={() => removeResource(i)} style={styles.removeBtn}>
                        <Feather name="x" size={16} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.border2, marginBottom: 6 }]}
                      value={r.label}
                      onChangeText={v => updateResource(i, 'label', v)}
                      placeholder="Label (e.g. Username)"
                      placeholderTextColor={theme.muted}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.border2 }]}
                      value={r.value}
                      onChangeText={v => updateResource(i, 'value', v)}
                      placeholder="Value"
                      placeholderTextColor={theme.muted}
                      multiline
                    />
                  </>
                ) : (
                  <View style={styles.resourceViewRow}>
                    <Pill type={r.type} label={r.type} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resourceLabel, { color: theme.text }]}>{r.label}</Text>
                      <Text style={[styles.resourceValue, { color: theme.muted }]}>{r.value}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
            {editing && (
              <TouchableOpacity
                style={[styles.addResourceBtn, { borderColor: theme.border2 }]}
                onPress={addResource}
              >
                <Feather name="plus" size={14} color={theme.primary} />
                <Text style={[styles.addResourceText, { color: theme.primary }]}>Add Resource</Text>
              </TouchableOpacity>
            )}
          </SectionCard>
        )}

        {/* Edit actions */}
        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.btnSave, { backgroundColor: theme.success, opacity: saving ? 0.6 : 1 }]}
              onPress={saveEdit}
              disabled={saving}
            >
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: theme.border2 }]}
              onPress={cancelEdit}
            >
              <Text style={[styles.btnCancelText, { color: theme.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Export section */}
        {!editing && (
          <SectionCard title="Export to Extension" theme={theme}>
            <Text style={[styles.exportHint, { color: theme.muted }]}>
              Copy the JSON and paste it into the extension's Import panel, or share this context as text.
            </Text>
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={[styles.btnExport, { backgroundColor: exported ? theme.success : theme.primary }]}
                onPress={copyJSON}
              >
                <Feather name={exported ? 'check' : 'copy'} size={16} color="#fff" />
                <Text style={styles.btnExportText}>{exported ? 'Copied!' : 'Copy JSON'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnShare, { borderColor: theme.border2 }]}
                onPress={shareContext}
              >
                <Feather name="share-2" size={16} color={theme.muted} />
                <Text style={[styles.btnShareText, { color: theme.muted }]}>Share Text</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}

        {/* Add voice note to refine */}
        {!editing && (
          <TouchableOpacity
            style={[styles.btnRefine, { backgroundColor: theme.purple }]}
            onPress={() => navigation.navigate('Record', { contextId })}
            activeOpacity={0.85}
          >
            <Feather name="mic" size={18} color="#fff" />
            <Text style={styles.btnRefineText}>Add Voice Note to Refine</Text>
          </TouchableOpacity>
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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 4 },
  navActions: { flexDirection: 'row', gap: 4 },

  scroll: { padding: 16 },

  nameCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  nameIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nameIconText: { fontSize: 16, fontWeight: '800' },
  nameText:     { fontSize: 18, fontWeight: '700' },
  nameSub:      { fontSize: 12, marginTop: 2 },

  fieldValue: { fontSize: 14, lineHeight: 22 },

  input: {
    borderWidth: 1, borderRadius: 8,
    padding: 10, fontSize: 14, lineHeight: 21,
    textAlignVertical: 'top', fontFamily: 'System',
  },
  inputBig: { fontSize: 16, fontWeight: '600' },

  resourceItem:     { },
  resourceEditRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  typeBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    marginRight: 5, backgroundColor: 'rgba(113,113,130,0.12)',
  },
  typeBtnText: { fontSize: 9, fontWeight: '700', color: '#717182' },
  removeBtn:   { padding: 4 },

  resourceViewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resourceLabel:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  resourceValue:   { fontSize: 12, lineHeight: 18 },

  addResourceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed',
    marginTop: 10,
  },
  addResourceText: { fontSize: 13, fontWeight: '600' },

  editActions: { gap: 10, marginBottom: 12 },
  btnSave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 12,
  },
  btnSaveText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnCancel: {
    alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1,
  },
  btnCancelText: { fontSize: 14, fontWeight: '600' },

  exportHint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  exportButtons: { flexDirection: 'row', gap: 10 },
  btnExport: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 10,
  },
  btnExportText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnShare: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 10, borderWidth: 1,
  },
  btnShareText: { fontSize: 13, fontWeight: '600' },

  btnRefine: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnRefineText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
