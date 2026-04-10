import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getProducts, getScenarios, getContexts, deleteProduct, deleteScenario } from '../services/storage';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

const TABS = [
  { key: 'products',  label: 'Products',  icon: 'box' },
  { key: 'scenarios', label: 'Scenarios', icon: 'git-branch' },
];

export default function HomeScreen({ navigation }) {
  const [dark]      = useState(true);
  const theme       = getTheme(dark);

  const [tab,       setTab]       = useState('products');
  const [products,  setProducts]  = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [contexts,  setContexts]  = useState([]);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  async function load() {
    const [p, s, c] = await Promise.all([getProducts(), getScenarios(), getContexts()]);
    setProducts(p);
    setScenarios(s);
    setContexts(c);
  }

  // ── Products ─────────────────────────────────────────────────────────────

  function onDeleteProduct(p) {
    Alert.alert(
      'Delete Product',
      `Delete "${p.name}" and unlink all its contexts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProduct(p.id); load(); } },
      ]
    );
  }

  function renderProduct({ item }) {
    const ctxCount = contexts.filter(c => c.productId === item.id).length;
    const scnCount = scenarios.filter(s => s.productId === item.id).length;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('GroupContexts', { type: 'product', id: item.id, name: item.name })}
        activeOpacity={0.75}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.primary + '25' }]}>
          <Feather name="box" size={18} color={theme.primary} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: theme.muted }]} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            <View style={styles.metaChip}>
              <Feather name="git-branch" size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{scnCount} scenario{scnCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="database" size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{ctxCount} context{ctxCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('GroupDetail', { type: 'product', id: item.id })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={15} color={theme.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDeleteProduct(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={15} color={theme.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Scenarios ─────────────────────────────────────────────────────────────

  function onDeleteScenario(s) {
    Alert.alert(
      'Delete Scenario',
      `Delete "${s.name}" and unlink its contexts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteScenario(s.id); load(); } },
      ]
    );
  }

  function renderScenario({ item }) {
    const ctxCount = contexts.filter(c => c.scenarioId === item.id).length;
    const product  = item.productId ? products.find(p => p.id === item.productId) : null;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('GroupContexts', { type: 'scenario', id: item.id, name: item.name })}
        activeOpacity={0.75}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.purple + '25' }]}>
          <Feather name="git-branch" size={18} color={theme.purple} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          {product ? (
            <View style={[styles.productTag, { backgroundColor: theme.primary + '18' }]}>
              <Feather name="box" size={9} color={theme.primary} />
              <Text style={[styles.productTagText, { color: theme.primary }]}>{product.name}</Text>
            </View>
          ) : item.description ? (
            <Text style={[styles.cardDesc, { color: theme.muted }]} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            <View style={styles.metaChip}>
              <Feather name="database" size={10} color={theme.muted} />
              <Text style={[styles.metaText, { color: theme.muted }]}>{ctxCount} context{ctxCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('GroupDetail', { type: 'scenario', id: item.id })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={15} color={theme.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDeleteScenario(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={15} color={theme.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isProducts  = tab === 'products';
  const listData    = isProducts ? products : scenarios;
  const renderItem  = isProducts ? renderProduct : renderScenario;
  const emptyIcon   = isProducts ? 'box' : 'git-branch';
  const emptyTitle  = isProducts ? 'No products yet' : 'No scenarios yet';
  const emptySub    = isProducts
    ? 'Create a product to organise contexts\nby feature or page'
    : 'Create a scenario to organise contexts\nby a specific test flow';
  const newType     = isProducts ? 'product' : 'scenario';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border2 }]}>
        <View style={styles.headerBrand}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Feather name="check-circle" size={18} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI Tester</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Connect')}
            style={[styles.iconBtn, { borderColor: theme.border2 }]}
            title="Connect to extension"
          >
            <Feather name="wifi" size={17} color={theme.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[styles.iconBtn, { borderColor: theme.border2 }]}
          >
            <Feather name="settings" size={17} color={theme.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border2, backgroundColor: theme.bg }]}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Feather name={t.icon} size={14} color={active ? theme.primary : theme.muted} />
              <Text style={[styles.tabText, { color: active ? theme.primary : theme.muted }]}>
                {t.label}
              </Text>
              {active && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {listData.length === 0 ? (
        <View style={styles.empty}>
          <Feather name={emptyIcon} size={48} color={theme.border2} />
          <Text style={[styles.emptyTitle, { color: theme.muted }]}>{emptyTitle}</Text>
          <Text style={[styles.emptySub, { color: theme.dimmed }]}>{emptySub}</Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('GroupDetail', { type: newType })}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>New {isProducts ? 'Product' : 'Scenario'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — always "new product/scenario" at top level */}
      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={[styles.fabSecondary, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => navigation.navigate('GroupDetail', { type: newType })}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Record', {})}
          activeOpacity={0.85}
        >
          <Feather name="mic" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBrand:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo:          { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, position: 'relative',
  },
  tabActive: {},
  tabText:   { fontSize: 13, fontWeight: '600' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1,
  },

  list: { padding: 16, paddingBottom: 120 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardBody:    { flex: 1, minWidth: 0 },
  cardName:    { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  cardDesc:    { fontSize: 12, lineHeight: 16, marginBottom: 5 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaChip:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:    { fontSize: 11, fontWeight: '600' },
  cardActions: { gap: 10, flexShrink: 0 },

  productTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    alignSelf: 'flex-start', marginBottom: 5,
  },
  productTagText: { fontSize: 10, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  fabGroup: {
    position: 'absolute', bottom: 30, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  fabSecondary: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  fab: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
