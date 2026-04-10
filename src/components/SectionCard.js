import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SectionCard({ title, children, theme, style }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {title ? (
        <Text style={[styles.label, { color: theme.muted }]}>{title.toUpperCase()}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
