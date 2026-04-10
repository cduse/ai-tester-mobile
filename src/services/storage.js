/**
 * AsyncStorage helpers — persists contexts and settings locally on the device
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  contexts: 'ait_contexts',
  settings: 'ait_settings',
};

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── CONTEXTS ──────────────────────────────────────────────────────────────

export async function getContexts() {
  const raw = await AsyncStorage.getItem(KEYS.contexts);
  return raw ? JSON.parse(raw) : [];
}

export async function saveContexts(contexts) {
  await AsyncStorage.setItem(KEYS.contexts, JSON.stringify(contexts));
}

export async function upsertContext(ctx) {
  const contexts = await getContexts();
  if (ctx.id) {
    const idx = contexts.findIndex(c => c.id === ctx.id);
    if (idx !== -1) {
      contexts[idx] = { ...contexts[idx], ...ctx, updatedAt: new Date().toISOString() };
    } else {
      contexts.unshift({ ...ctx, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  } else {
    const newCtx = {
      ...ctx,
      id: genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contexts.unshift(newCtx);
    return newCtx;
  }
  await saveContexts(contexts);
  return ctx;
}

export async function deleteContext(id) {
  const contexts = await getContexts();
  await saveContexts(contexts.filter(c => c.id !== id));
}

// ── SETTINGS ──────────────────────────────────────────────────────────────

export async function getSettings() {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? JSON.parse(raw) : { openaiKey: '', openaiModel: 'gpt-4o', darkMode: true };
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}
