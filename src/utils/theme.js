/**
 * Design tokens — matches the extension's palette and type system
 */

export const palette = {
  // Primary brand
  primary:   '#3b82f6',
  primaryDk: '#2563eb',

  // Semantic
  success: '#22c55e',
  error:   '#ef4444',
  warn:    '#f59e0b',
  purple:  '#a855f7',

  // Neutrals
  black:   '#030213',
  white:   '#fafafa',

  // Dark theme surfaces
  dark: {
    bg:       '#1a1a1a',
    surface:  '#252525',
    card:     '#1e1e1e',
    border:   '#3a3a3a',
    border2:  '#454545',
    muted:    '#717182',
    dimmed:   '#9ca3af',
    text:     '#fafafa',
    textSub:  '#b5b5b5',
  },

  // Light theme surfaces
  light: {
    bg:       '#ffffff',
    surface:  '#f8f8f8',
    card:     '#f3f3f5',
    border:   'rgba(0,0,0,0.08)',
    border2:  'rgba(0,0,0,0.12)',
    muted:    '#717182',
    dimmed:   '#9ca3af',
    text:     '#030213',
    textSub:  '#717182',
  },
};

export function getTheme(dark = true) {
  const t = dark ? palette.dark : palette.light;
  return {
    dark,
    bg:       t.bg,
    surface:  t.surface,
    card:     t.card,
    border:   t.border,
    border2:  t.border2,
    muted:    t.muted,
    dimmed:   t.dimmed,
    text:     t.text,
    textSub:  t.textSub,
    primary:  palette.primary,
    success:  palette.success,
    error:    palette.error,
    warn:     palette.warn,
    purple:   palette.purple,
    accent:   dark ? palette.white : palette.black,
    accentFg: dark ? palette.black : palette.white,
  };
}
