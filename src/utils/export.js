/**
 * Export utilities — converts mobile contexts to the extension's JSON format
 * so they can be imported via the extension's "Import Contexts" panel.
 */

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/**
 * Convert one or more mobile contexts to the extension's storage format.
 * Preserves productId from mobile if provided; otherwise uses the sentinel.
 */
export function buildExportPayload(contexts, defaultProductId = '__mobile__') {
  return contexts.map(ctx => ({
    id: ctx.id || genId(),
    productId: ctx.productId || defaultProductId,
    scenarioId: ctx.scenarioId || undefined,
    name: ctx.name || 'Unnamed Context',
    description: ctx.description || '',
    strategy: ctx.strategy || '',
    procedures: ctx.procedures || '',
    scenarios: ctx.scenarios || '',
    instruction: ctx.instruction || '',
    resources: (ctx.resources || []).map(r => ({
      id: r.id || genId(),
      type: r.type || 'note',
      label: r.label || '',
      value: r.value || '',
    })),
    dependsOn: [],
    generatedSteps: null,
    createdAt: ctx.createdAt || new Date().toISOString(),
    importedFrom: { source: 'mobile', originalId: ctx.id },
  }));
}

/**
 * Build the full extension storage JSON (wraps contexts in the format
 * chrome.storage.local uses so the user can paste / import directly).
 */
export function buildExtensionJSON(contexts) {
  return JSON.stringify({ contexts: buildExportPayload(contexts) }, null, 2);
}

/**
 * Build a shareable plain-text summary of a single context.
 * Useful for sharing via Messages, WhatsApp, etc.
 */
export function buildTextSummary(ctx) {
  const lines = [`📋 ${ctx.name || 'Context'}`];
  if (ctx.description)  lines.push(`\nDescription:\n${ctx.description}`);
  if (ctx.strategy)     lines.push(`\nStrategy:\n${ctx.strategy}`);
  if (ctx.procedures)   lines.push(`\nProcedures:\n${ctx.procedures}`);
  if (ctx.scenarios)    lines.push(`\nScenarios:\n${ctx.scenarios}`);
  if (ctx.instruction)  lines.push(`\nAutomation Instruction:\n${ctx.instruction}`);
  if (ctx.resources?.length) {
    lines.push('\nResources:');
    ctx.resources.forEach(r => lines.push(`  [${r.type}] ${r.label}: ${r.value}`));
  }
  return lines.join('\n');
}
