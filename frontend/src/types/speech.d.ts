// Minimal ambient types for the Web Speech API's SpeechRecognition — not
// part of the standard TS DOM lib, and only Chrome/Edge ship it (as the
// prefixed webkitSpeechRecognition), so this is a small hand-written surface
// covering only what useVoiceCommand.ts actually uses.
interface SpeechRecognitionResultEvent extends Event {
  results: { 0: { 0: { transcript: string } } };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
