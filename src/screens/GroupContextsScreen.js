/**
 * GroupContextsScreen — shows all contexts for a product or scenario.
 *
 * Route params:
 *   type        'product' | 'scenario'
 *   id          product/scenario id
 *   name        display name
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getContexts, deleteContext, getProducts, getScenarios } from '../services/storage';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';

export default function GroupContextsScreen({ navigation, route }) {
  const { type, id, name } = route.params || {};
  const isProduct = type === 'product';

  const [dark]     = useState(true);
  const theme      = getTheme(dark);
  const [contexts, setContexts] = useState([]);
  const [groupItem, setGroupItem] = useState(null);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  async function load() {
    const allContexts = await getContexts();
    const scoped = isProduct
      ? allContexts.filter(c => c.productId === id)
      : allContexts.filter(c => c.scenarioId === id);
    setContexts(scoped);

    const getter = isProduct ? getProducts : getScenarios;
    const list = await getter();
    setGroupItem(list.find(x => x.id === id) || null);
  }

  function onDelete(ctx) {
    Alert.alert('Delete Context', `Delete "${ctx.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteContext(ctx.id); load(); } },
    ]);
  }

  function renderItem({ item }) {
    const resCount = item.resources?.length || 0;
    const ago      = formatAgo(item.updatedAt || item.createdAt);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate('ContextDetail', { contextId: item.id })}
        activeOpacity={0.75}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.accent }]}>
          <Text style={[styles.cardIconText, { color: theme.accentFg }]}>
            {(item.name || 'C').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
            {item.name || 'Unnamed Context'}
          </Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: theme.muted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={styles.cardMeta}>
            {resCount > 0 && (
              <View style={styles.metaChip}>
                <Feather name="database" size={10} color={theme.muted} />
                <Text style={[styles.metaText, { color: theme.muted }]}>{resCount} resource{resCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {!!item.instruction && (
              <View style={styles.metaChip}>
                <Feather name="zap" size={10} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.primary }]}>auto-ready</Text>
              </View>
            )}
            <Text style={[styles.metaText, { color: theme.dimmed }]}>{ago}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="trash-2" size={16} color={theme.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  const recordParams = isProduct ? { productId: id } : { scenarioId: id };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={styles.typePill}>
            <Feather
              name={isProduct ? 'box' : 'git-branch'}
              size={11}
              color={isProduct ? theme.primary : theme.purple}
            />
            <Text style={[styles.typePillText, { color: isProduct ? theme.primary : theme.purple }]}>
              {isProduct ? 'Product' : 'Scenario'}
            </Text>
          </View>
          <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('GroupDetail', { type, id })}
          style={styles.iconBtn}
        >
          <Feather name="edit-2" size={18} color={theme.muted} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {groupItem?.description ? (
        <View style={[styles.descBar, { backgroundColor: theme.surface, borderBottomColor: theme.border2 }]}>
          <Text style={[styles.descText, { color: theme.muted }]}>{groupItem.description}</Text>
        </View>
      ) : null}

      {contexts.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="mic" size={48} color={theme.border2} />
          <Text style={[styles.emptyTitle, { color: theme.muted }]}>No contexts yet</Text>
          <Text style={[styles.emptySub, { color: theme.dimmed }]}>
            Tap the mic button to record a voice note{'\n'}and save a context here
          </Text>
        </View>
      ) : (
        <FlatList
          data={contexts}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('Record', recordParams)}
        activeOpacity={0.85}
      >
        <Feather name="mic" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function formatAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navCenter: { flex: 1, alignItems: 'center' },
  typePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  typePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  navTitle:  { fontSize: 16, fontWeight: '700', textAlign: 'center' },

  descBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  descText: { fontSize: 12, lineHeight: 17 },

  list: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIconText: { fontSize: 13, fontWeight: '800' },
  cardBody:     { flex: 1, minWidth: 0 },
  cardName:     { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardDesc:     { fontSize: 12, lineHeight: 16, marginBottom: 5 },
  cardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:     { fontSize: 11, fontWeight: '600' },
  deleteBtn:    { padding: 4, flexShrink: 0 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
