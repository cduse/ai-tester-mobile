/**
 * GroupDetailScreen — create or edit a Product or Scenario.
 *
 * Route params:
 *   type        'product' | 'scenario'
 *   id?         existing item id (edit mode)
 *   productId?  pre-link scenario to a product (for new scenarios created from a product)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import {
  getProducts, getScenarios,
  upsertProduct, upsertScenario,
  deleteProduct, deleteScenario,
} from '../services/storage';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function GroupDetailScreen({ navigation, route }) {
  const { type, id, productId: initProductId } = route.params || {};
  const isProduct  = type === 'product';
  const isNew      = !id;

  const [dark]        = useState(true);
  const theme         = getTheme(dark);

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [productId,   setProductId]   = useState(initProductId || null);
  const [products,    setProducts]    = useState([]);
  const [showPicker,  setShowPicker]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!isProduct) {
      getProducts().then(setProducts);
    }
    if (!isNew) {
      const getter = isProduct ? getProducts : getScenarios;
      getter().then(list => {
        const item = list.find(x => x.id === id);
        if (item) {
          setName(item.name || '');
          setDescription(item.description || '');
          if (!isProduct && item.productId) setProductId(item.productId);
        }
      });
    }
  }, []);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Name required', 'Please enter a name.'); return; }
    setSaving(true);
    try {
      const payload = { name: trimmed, description: description.trim() };
      if (id) payload.id = id;
      if (!isProduct && productId) payload.productId = productId;

      if (isProduct) {
        await upsertProduct(payload);
      } else {
        await upsertScenario(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
      setSaving(false);
    }
  }

  async function onDelete() {
    const label = isProduct ? 'product and all its scenarios' : 'scenario';
    Alert.alert(
      `Delete ${isProduct ? 'Product' : 'Scenario'}`,
      `Delete this ${label}? Linked contexts will be unlinked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (isProduct) await deleteProduct(id);
            else           await deleteScenario(id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  const pickerProduct = products.find(p => p.id === productId);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>
          {isNew ? `New ${isProduct ? 'Product' : 'Scenario'}` : `Edit ${isProduct ? 'Product' : 'Scenario'}`}
        </Text>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, { color: theme.primary }]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.muted }]}>NAME</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border2, backgroundColor: theme.surface }]}
            value={name}
            onChangeText={setName}
            placeholder={isProduct ? 'e.g. Checkout Page' : 'e.g. Guest checkout flow'}
            placeholderTextColor={theme.muted}
          />
          <Text style={[styles.label, { color: theme.muted, marginTop: 14 }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.textarea, { color: theme.text, borderColor: theme.border2, backgroundColor: theme.surface }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description…"
            placeholderTextColor={theme.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Scenario only — product picker */}
          {!isProduct && (
            <>
              <Text style={[styles.label, { color: theme.muted, marginTop: 14 }]}>PRODUCT (optional)</Text>
              <TouchableOpacity
                style={[styles.picker, { borderColor: theme.border2, backgroundColor: theme.surface }]}
                onPress={() => setShowPicker(v => !v)}
              >
                <Text style={[styles.pickerText, { color: pickerProduct ? theme.text : theme.muted }]}>
                  {pickerProduct ? pickerProduct.name : 'None — standalone scenario'}
                </Text>
                <Feather name={showPicker ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
              </TouchableOpacity>
              {showPicker && (
                <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.dropItem}
                    onPress={() => { setProductId(null); setShowPicker(false); }}
                  >
                    <Text style={[styles.dropItemText, { color: theme.muted }]}>None</Text>
                    {!productId && <Feather name="check" size={14} color={theme.primary} />}
                  </TouchableOpacity>
                  {products.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.dropItem}
                      onPress={() => { setProductId(p.id); setShowPicker(false); }}
                    >
                      <Text style={[styles.dropItemText, { color: theme.text }]}>{p.name}</Text>
                      {productId === p.id && <Feather name="check" size={14} color={theme.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {!isNew && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: theme.error }]}
            onPress={onDelete}
          >
            <Feather name="trash-2" size={16} color={theme.error} />
            <Text style={[styles.deleteBtnText, { color: theme.error }]}>
              Delete {isProduct ? 'Product' : 'Scenario'}
            </Text>
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
  iconBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle:  { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  saveBtn:   { paddingHorizontal: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700' },

  scroll: { padding: 16 },

  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },

  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, marginBottom: 8, textTransform: 'uppercase' },

  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 90,
  },

  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  pickerText: { fontSize: 14, flex: 1 },

  dropdown: {
    borderWidth: 1, borderRadius: 8, marginTop: 4,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropItemText: { fontSize: 14 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },
});
