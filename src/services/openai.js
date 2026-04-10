/**
 * OpenAI service — Whisper transcription + GPT extraction
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

/**
 * Transcribe an audio file using Whisper.
 * @param {string} fileUri  Local file URI from expo-av
 * @param {string} apiKey
 * @returns {Promise<string>} transcript text
 */
export async function transcribeAudio(fileUri, apiKey) {
  const filename = fileUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const mimeMap = { m4a: 'audio/m4a', mp4: 'audio/mp4', wav: 'audio/wav', mp3: 'audio/mpeg', caf: 'audio/x-caf' };
  const mime = mimeMap[ext] || 'audio/m4a';

  const formData = new FormData();
  formData.append('file', { uri: fileUri, type: mime, name: filename });
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'text');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper error ${res.status}`);
  }

  return (await res.text()).trim();
}

/**
 * Extract structured test context from a transcript.
 * Returns a context object matching the extension schema.
 */
export async function extractContext(transcript, apiKey, model = 'gpt-4o') {
  const systemPrompt = `You are a QA expert. Extract structured test context from a voice note transcript.
Return a JSON object with these fields (all optional except name):
{
  "name": "short context or feature name (required)",
  "description": "what the feature/flow does",
  "strategy": "how to test it — approach, priorities",
  "procedures": "prerequisites, setup steps, standard procedures",
  "scenarios": "key test scenarios and edge cases to cover",
  "instruction": "plain-English instruction for what to automate — what an AI would run",
  "resources": [
    { "type": "credentials|api|testData|url|note", "label": "name of resource", "value": "the actual value or description" }
  ]
}

Rules:
- Extract ALL information present — do not omit anything mentioned
- If credentials/passwords/usernames are mentioned, put them in resources as type "credentials"
- If URLs or endpoints are mentioned, add as type "url" or "api"
- If test data (amounts, codes, names) are mentioned, add as type "testData"
- Keep values concise but complete
- The "instruction" field should be written as a command for AI automation (e.g. "Log in with the test credentials, navigate to the dashboard, and verify the balance is shown")
- Return ONLY valid JSON, no markdown`;

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Voice note transcript:\n\n${transcript}` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `GPT error ${res.status}`);
  }

  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  // Normalise resources — ensure each has an id
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (Array.isArray(parsed.resources)) {
    parsed.resources = parsed.resources.map(r => ({ id: genId(), ...r }));
  } else {
    parsed.resources = [];
  }

  return parsed;
}

/**
 * Re-extract / refine an already-extracted context using additional voice note.
 */
export async function refineContext(existingContext, additionalTranscript, apiKey, model = 'gpt-4o') {
  const systemPrompt = `You are a QA expert. Merge additional voice note information into an existing test context.
Update and enrich the context — add missing fields, append new resources, improve existing text.
Return the complete updated context as a JSON object with the same schema.
Return ONLY valid JSON.`;

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Existing context:\n${JSON.stringify(existingContext, null, 2)}\n\nAdditional voice note:\n${additionalTranscript}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `GPT error ${res.status}`);
  }

  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (Array.isArray(parsed.resources)) {
    parsed.resources = parsed.resources.map(r => ({ id: r.id || genId(), ...r }));
  } else {
    parsed.resources = existingContext.resources || [];
  }

  return parsed;
}
