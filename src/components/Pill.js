import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TYPE_COLORS = {
  credentials: ['rgba(59,130,246,0.14)', '#3b82f6'],
  api:         ['rgba(168,85,247,0.14)', '#a855f7'],
  testData:    ['rgba(34,197,94,0.14)',  '#22c55e'],
  url:         ['rgba(249,115,22,0.14)', '#f97316'],
  note:        ['rgba(113,113,130,0.14)','#717182'],
};

export default function Pill({ type = 'note', label }) {
  const [bg, color] = TYPE_COLORS[type] || TYPE_COLORS.note;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{(label || type).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
