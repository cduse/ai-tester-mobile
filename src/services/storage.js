/**
 * AsyncStorage helpers — persists contexts, products, scenarios and settings on the device
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  contexts:  'ait_contexts',
  products:  'ait_products',
  scenarios: 'ait_scenarios',
  settings:  'ait_settings',
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── GENERIC CRUD ───────────────────────────────────────────────────────────

async function getList(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function saveList(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

async function upsertItem(key, item) {
  const list = await getList(key);
  if (item.id) {
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await saveList(key, list);
    return item;
  } else {
    const newItem = {
      ...item,
      id: genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newItem);
    await saveList(key, list);
    return newItem;
  }
}

async function deleteItem(key, id) {
  const list = await getList(key);
  await saveList(key, list.filter(x => x.id !== id));
}

// ── CONTEXTS ───────────────────────────────────────────────────────────────

export async function getContexts()          { return getList(KEYS.contexts); }
export async function saveContexts(contexts) { return saveList(KEYS.contexts, contexts); }
export async function upsertContext(ctx)     { return upsertItem(KEYS.contexts, ctx); }
export async function deleteContext(id)      { return deleteItem(KEYS.contexts, id); }

// ── PRODUCTS ───────────────────────────────────────────────────────────────

export async function getProducts()          { return getList(KEYS.products); }
export async function saveProducts(products) { return saveList(KEYS.products, products); }
export async function upsertProduct(p)       { return upsertItem(KEYS.products, p); }

export async function deleteProduct(id) {
  await deleteItem(KEYS.products, id);
  // Remove linked scenarios and unlink contexts
  const scenarios = await getScenarios();
  const linkedScenarioIds = scenarios.filter(s => s.productId === id).map(s => s.id);
  await saveList(KEYS.scenarios, scenarios.filter(s => s.productId !== id));
  // Unlink contexts that belonged to this product or its scenarios
  const contexts = await getContexts();
  await saveContexts(contexts.map(c => {
    if (c.productId === id || linkedScenarioIds.includes(c.scenarioId)) {
      const updated = { ...c };
      if (updated.productId === id) delete updated.productId;
      if (linkedScenarioIds.includes(updated.scenarioId)) delete updated.scenarioId;
      return updated;
    }
    return c;
  }));
}

// ── SCENARIOS ──────────────────────────────────────────────────────────────

export async function getScenarios()           { return getList(KEYS.scenarios); }
export async function saveScenarios(scenarios) { return saveList(KEYS.scenarios, scenarios); }
export async function upsertScenario(s)        { return upsertItem(KEYS.scenarios, s); }

export async function deleteScenario(id) {
  await deleteItem(KEYS.scenarios, id);
  // Unlink contexts that belonged to this scenario
  const contexts = await getContexts();
  await saveContexts(contexts.map(c =>
    c.scenarioId === id ? { ...c, scenarioId: undefined } : c
  ));
}

// ── SETTINGS ───────────────────────────────────────────────────────────────

export async function getSettings() {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw
    ? JSON.parse(raw)
    : { openaiKey: '', openaiModel: 'gpt-4o', darkMode: true };
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
