import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Animated, Easing, ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { getSettings, upsertContext, getContexts } from '../services/storage';
import { transcribeAudio, extractContext, refineContext } from '../services/openai';
import { getTheme } from '../utils/theme';
import { Feather } from '@expo/vector-icons';
import SectionCard from '../components/SectionCard';
import Pill from '../components/Pill';

const PHASE = {
  IDLE:         'idle',
  RECORDING:    'recording',
  TRANSCRIBING: 'transcribing',
  EXTRACTING:   'extracting',
  REVIEW:       'review',
  SAVING:       'saving',
};

export default function RecordScreen({ navigation, route }) {
  const existingContextId = route.params?.contextId || null;

  const [dark]      = useState(true);
  const theme       = getTheme(dark);

  const [phase,       setPhase]       = useState(PHASE.IDLE);
  const [transcript,  setTranscript]  = useState('');
  const [extracted,   setExtracted]   = useState(null);   // the AI-parsed context
  const [statusText,  setStatusText]  = useState('');
  const [recordSecs,  setRecordSecs]  = useState(0);

  const recordingRef  = useRef(null);
  const timerRef      = useRef(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const pulseLoop     = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
      pulseLoop.current?.stop();
    };
  }, []);

  // ── PULSE ANIMATION ──
  function startPulse() {
    pulseAnim.setValue(1);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }
  function stopPulse() {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  // ── TIMER ──
  function startTimer() {
    setRecordSecs(0);
    timerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
  }
  function stopTimer() {
    clearInterval(timerRef.current);
  }

  // ── RECORDING ──
  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Microphone permission is needed to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;

      setPhase(PHASE.RECORDING);
      startPulse();
      startTimer();
    } catch (err) {
      Alert.alert('Recording error', err.message);
    }
  }

  async function stopRecording() {
    stopPulse();
    stopTimer();

    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await processAudio(uri);
    } catch (err) {
      Alert.alert('Error', err.message);
      setPhase(PHASE.IDLE);
    }
  }

  // ── AI PROCESSING ──
  async function processAudio(uri) {
    const settings = await getSettings();
    if (!settings.openaiKey) {
      Alert.alert('API Key missing', 'Add your OpenAI API key in Settings before recording.', [
        { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
        { text: 'Cancel', style: 'cancel', onPress: () => setPhase(PHASE.IDLE) },
      ]);
      return;
    }

    // Step 1 — transcribe
    setPhase(PHASE.TRANSCRIBING);
    setStatusText('Transcribing audio…');
    let text;
    try {
      text = await transcribeAudio(uri, settings.openaiKey);
      setTranscript(text);
    } catch (err) {
      Alert.alert('Transcription failed', err.message);
      setPhase(PHASE.IDLE);
      return;
    }

    // Step 2 — extract / refine
    setPhase(PHASE.EXTRACTING);
    setStatusText('Extracting test context with AI…');
    try {
      let result;
      if (existingContextId) {
        // Refine an existing context with the new voice note
        const contexts = await getContexts();
        const existing = contexts.find(c => c.id === existingContextId);
        if (existing) {
          result = await refineContext(existing, text, settings.openaiKey, settings.openaiModel);
          result.id = existingContextId;
        } else {
          result = await extractContext(text, settings.openaiKey, settings.openaiModel);
        }
      } else {
        result = await extractContext(text, settings.openaiKey, settings.openaiModel);
      }
      setExtracted(result);
      setPhase(PHASE.REVIEW);
    } catch (err) {
      Alert.alert('Extraction failed', err.message);
      setPhase(PHASE.IDLE);
    }
  }

  // ── SAVE ──
  async function saveContext() {
    if (!extracted) return;
    setPhase(PHASE.SAVING);
    try {
      const saved = await upsertContext(extracted);
      navigation.replace('ContextDetail', { contextId: saved?.id || extracted.id });
    } catch (err) {
      Alert.alert('Save failed', err.message);
      setPhase(PHASE.REVIEW);
    }
  }

  // ── RENDER ──
  function renderIdle() {
    return (
      <View style={styles.centered}>
        <Text style={[styles.hint, { color: theme.muted }]}>
          {existingContextId
            ? 'Add another voice note to refine this context'
            : 'Record a voice note describing your test\ncontext, data, strategy and procedures'}
        </Text>
        <TouchableOpacity
          style={[styles.recordBtn, { backgroundColor: theme.primary }]}
          onPress={startRecording}
          activeOpacity={0.8}
        >
          <Feather name="mic" size={40} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.tapLabel, { color: theme.dimmed }]}>Tap to record</Text>
      </View>
    );
  }

  function renderRecording() {
    const mins = String(Math.floor(recordSecs / 60)).padStart(2, '0');
    const secs = String(recordSecs % 60).padStart(2, '0');
    return (
      <View style={styles.centered}>
        <View style={styles.timerRow}>
          <View style={[styles.recDot, { backgroundColor: theme.error }]} />
          <Text style={[styles.timer, { color: theme.text }]}>{mins}:{secs}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.recordBtn, styles.recordBtnActive, { backgroundColor: theme.error }]}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.tapLabel, { color: theme.dimmed }]}>Tap to stop</Text>
        <Text style={[styles.hint, { color: theme.muted, marginTop: 20 }]}>
          Speak clearly — mention context name,{'\n'}strategy, test data, URLs, and credentials
        </Text>
      </View>
    );
  }

  function renderProcessing() {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.purple} />
        <Text style={[styles.processingText, { color: theme.purple }]}>{statusText}</Text>
        {transcript ? (
          <SectionCard title="Transcript" theme={theme} style={{ marginTop: 24, width: '100%' }}>
            <Text style={[styles.transcriptText, { color: theme.textSub }]}>{transcript}</Text>
          </SectionCard>
        ) : null}
      </View>
    );
  }

  function renderReview() {
    if (!extracted) return null;
    const { name, description, strategy, procedures, scenarios, instruction, resources = [] } = extracted;

    return (
      <ScrollView contentContainerStyle={styles.reviewScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.reviewTitle, { color: theme.text }]}>Review Extracted Context</Text>
        <Text style={[styles.reviewSub, { color: theme.muted }]}>
          AI extracted the following from your voice note. Review before saving.
        </Text>

        {name && (
          <SectionCard title="Context Name" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{name}</Text>
          </SectionCard>
        )}
        {description && (
          <SectionCard title="Description" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{description}</Text>
          </SectionCard>
        )}
        {strategy && (
          <SectionCard title="Testing Strategy" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{strategy}</Text>
          </SectionCard>
        )}
        {procedures && (
          <SectionCard title="Procedures" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{procedures}</Text>
          </SectionCard>
        )}
        {scenarios && (
          <SectionCard title="Scenarios" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{scenarios}</Text>
          </SectionCard>
        )}
        {instruction && (
          <SectionCard title="Automation Instruction" theme={theme}>
            <Text style={[styles.fieldValue, { color: theme.primary }]}>{instruction}</Text>
          </SectionCard>
        )}
        {resources.length > 0 && (
          <SectionCard title={`Resources (${resources.length})`} theme={theme}>
            {resources.map((r, i) => (
              <View key={r.id || i} style={[styles.resourceRow, i > 0 && { marginTop: 10 }]}>
                <Pill type={r.type} label={r.type} />
                <View style={styles.resourceTexts}>
                  <Text style={[styles.resourceLabel, { color: theme.text }]}>{r.label}</Text>
                  <Text style={[styles.resourceValue, { color: theme.muted }]}>{r.value}</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Transcript */}
        {transcript ? (
          <SectionCard title="Original Transcript" theme={theme}>
            <Text style={[styles.transcriptText, { color: theme.muted }]}>{transcript}</Text>
          </SectionCard>
        ) : null}

        {/* Actions */}
        <TouchableOpacity
          style={[styles.btnSave, { backgroundColor: theme.success }]}
          onPress={saveContext}
          activeOpacity={0.85}
        >
          <Feather name="save" size={18} color="#fff" />
          <Text style={styles.btnSaveText}>
            {existingContextId ? 'Update Context' : 'Save Context'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnRetry, { borderColor: theme.border2 }]}
          onPress={() => { setPhase(PHASE.IDLE); setExtracted(null); setTranscript(''); }}
          activeOpacity={0.75}
        >
          <Feather name="refresh-cw" size={15} color={theme.muted} />
          <Text style={[styles.btnRetryText, { color: theme.muted }]}>Record Again</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  const isProcessing = phase === PHASE.TRANSCRIBING || phase === PHASE.EXTRACTING || phase === PHASE.SAVING;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Nav header */}
      <View style={[styles.navBar, { borderBottomColor: theme.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>
          {existingContextId ? 'Refine Context' : 'New Voice Note'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {phase === PHASE.IDLE         && renderIdle()}
        {phase === PHASE.RECORDING    && renderRecording()}
        {isProcessing                  && renderProcessing()}
        {phase === PHASE.REVIEW       && renderReview()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 16, fontWeight: '700' },

  body: { flex: 1, padding: 20 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },

  hint: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  recordBtn: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  recordBtnActive: {
    shadowColor: '#ef4444',
  },
  stopSquare: { width: 28, height: 28, borderRadius: 5, backgroundColor: '#fff' },
  tapLabel: { fontSize: 13, fontWeight: '600' },

  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  timer:  { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },

  processingText: { fontSize: 15, fontWeight: '600', marginTop: 16, textAlign: 'center' },

  reviewScroll: { paddingBottom: 20 },
  reviewTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  reviewSub:    { fontSize: 13, lineHeight: 19, marginBottom: 18 },

  fieldValue: { fontSize: 14, lineHeight: 21 },

  resourceRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resourceTexts: { flex: 1 },
  resourceLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  resourceValue: { fontSize: 12, lineHeight: 18 },

  transcriptText: { fontSize: 12, lineHeight: 19, fontStyle: 'italic' },

  btnSave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  btnRetry: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  btnRetryText: { fontSize: 14, fontWeight: '600' },
});
