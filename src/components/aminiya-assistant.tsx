"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/components/language-provider";
import { notify } from "@/components/notifications/notify";
import { useCloseWatcher } from "@/hooks/use-close-watcher";
import { prefersReducedMotion, springs } from "@/lib/motion";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Only user messages can fail; `failedReason` is shown under the bubble. */
  status?: "failed";
  failedReason?: string;
};

type VoicePhase = "idle" | "listening" | "transcribing";
type SpeakingState = { id: string; phase: "loading" | "playing" } | null;

/** Voice questions are capped so uploads stay small and cheap. */
const MAX_RECORDING_SECONDS = 60;

const copy = {
  en: {
    title: "Aminiya Assistant",
    subtitle: "Here to help you navigate Aminiya",
    badge: "Aminiya AI",
    welcome: "Hello! I'm the Aminiya Assistant.",
    intro: "I can help you understand elections, learn about your civic rights, report community concerns and explore the Promise Tracker.",
    suggestions: [
      "What can I do on Aminiya Tracker?",
      "How do I report a community issue?",
      "How can I check a reported issue?",
      "What is the Promise Tracker?",
    ],
    placeholder: "Ask Aminiya a question...",
    send: "Send message",
    close: "Close chat",
    open: "Open Aminiya Assistant",
    typing: "Aminiya is thinking",
    error: "I couldn't send that message. Please try again.",
    rateLimited: "You've asked a lot of questions in a short time. Please try again later.",
    offline: "No connection. Check your internet and retry.",
    notSent: "Not sent",
    retry: "Retry",
    newChat: "New chat",
    chatCleared: "Chat cleared",
    undo: "Undo",
    disclaimer: "Aminiya Assistant can make mistakes. Check important information.",
    startVoice: "Ask by voice",
    stopVoice: "Stop recording",
    listening: "Listening",
    transcribing: "Transcribing your question…",
    done: "Done",
    cancel: "Cancel",
    recordingCapped: "Recording stopped at 1 minute.",
    readResponse: "Read aloud",
    preparingAudio: "Preparing audio…",
    stopReading: "Stop",
    voiceUnavailable: "Microphone recording is not supported in this browser. Try a modern browser.",
    voicePermission: "Microphone access was denied. Allow microphone access in your browser settings.",
    voiceError: "I couldn't recognise your speech. Please try again.",
  },
  ha: {
    title: "Mataimakin Aminiya",
    subtitle: "Ina nan don taimaka maka amfani da Aminiya",
    badge: "Aminiya AI",
    welcome: "Sannu! Ni ne Mataimakin Aminiya.",
    intro: "Zan iya taimaka maka fahimtar zaɓe, sanin haƙƙoƙin ɗan ƙasa, bayar da rahoton matsalolin al'umma da fahimtar Promise Tracker.",
    suggestions: [
      "Me zan iya yi a Aminiya Tracker?",
      "Ta yaya zan bayar da rahoton matsalar al'umma?",
      "Ta yaya zan duba rahoton matsala?",
      "Menene Promise Tracker?",
    ],
    placeholder: "Tambayi Aminiya...",
    send: "Aika saƙo",
    close: "Rufe tattaunawa",
    open: "Buɗe Mataimakin Aminiya",
    typing: "Aminiya na tunani",
    error: "An kasa aika saƙon. Da fatan za a sake gwadawa.",
    rateLimited: "Ka yi tambayoyi da yawa cikin ɗan lokaci. Da fatan za a sake gwadawa daga baya.",
    offline: "Babu haɗin intanet. Duba intanet ɗinka sannan ka sake gwadawa.",
    notSent: "Ba a aika ba",
    retry: "Sake gwadawa",
    newChat: "Sabuwar hira",
    chatCleared: "An share hira",
    undo: "Maido",
    disclaimer: "Mataimakin Aminiya na iya yin kuskure. Tabbatar da muhimman bayanai.",
    startVoice: "Yi tambaya da murya",
    stopVoice: "Dakatar da nadar",
    listening: "Ina saurare",
    transcribing: "Ana rubuta tambayarka…",
    done: "Gama",
    cancel: "Soke",
    recordingCapped: "An tsaida nadar a minti ɗaya.",
    readResponse: "Saurari amsar",
    preparingAudio: "Ana shirya sauti…",
    stopReading: "Dakata",
    voiceUnavailable: "Wannan burauzar ba ta goyon bayan nadar murya. Gwada wata sabuwar burauza.",
    voicePermission: "Ba a ba da izinin amfani da makirufo ba. Duba saitunan burauzarka.",
    voiceError: "Ban gane abin da ka faɗa ba. Da fatan za a sake gwadawa.",
  },
} as const;

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function splitSpeechText(value: string, maxLength = 300): string[] {
  const sentences = value.match(/[^.!?؟۔]+[.!?؟۔]*/g) ?? [value];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      let part = "";
      for (const word of trimmed.split(/\s+/)) {
        if (part && `${part} ${word}`.length > maxLength) {
          chunks.push(part);
          part = word;
        } else {
          part = part ? `${part} ${word}` : word;
        }
      }
      if (part) chunks.push(part);
      continue;
    }

    if (current && `${current} ${trimmed}`.length > maxLength) {
      chunks.push(current);
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function toSpokenText(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AminiyaAssistant() {
  const { language } = useLanguage();
  const text = copy[language];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voicePhase, setVoicePhase] = useState<VoicePhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState<SpeakingState>(null);

  // Live microphone loudness (0–1), written every frame while recording.
  const micLevel = useMotionValue(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcribeAbortRef = useRef<AbortController | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assistantContainerRef = useRef<HTMLDivElement>(null);

  const busyWithVoice = voicePhase !== "idle";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ── Recording ────────────────────────────────────────────────────────────

  /** Release the mic, meter and timer. Safe to call more than once. */
  const releaseMicrophone = useCallback(() => {
    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    micLevel.set(0);
  }, [micLevel]);

  /** Stop recording. `discard` throws the audio away instead of transcribing. */
  const stopRecording = useCallback(
    (discard: boolean) => {
      discardRecordingRef.current = discard;
      const recorder = recorderRef.current;

      if (!recorder) {
        releaseMicrophone();
        setVoicePhase((phase) => (phase === "listening" ? "idle" : phase));
      } else if (recorder.state !== "inactive") {
        recorder.stop(); // onstop releases the mic and (maybe) transcribes
      }
      // An inactive recorder is already stopping; its onstop reads the
      // latest discard flag, so closing mid-stop still discards.
    },
    [releaseMicrophone]
  );

  const cancelTranscription = useCallback(() => {
    transcribeAbortRef.current?.abort();
    transcribeAbortRef.current = null;
    setVoicePhase((phase) => (phase === "transcribing" ? "idle" : phase));
  }, []);

  const stopSpeaking = useCallback(() => {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }

    setSpeaking(null);
  }, []);

  /** Every way of closing goes through here, so the mic and audio never outlive the panel. */
  const closeAssistant = useCallback(() => {
    stopRecording(true);
    cancelTranscription();
    stopSpeaking();
    setIsOpen(false);
  }, [cancelTranscription, stopRecording, stopSpeaking]);

  useCloseWatcher(isOpen, closeAssistant);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const container = assistantContainerRef.current;
      const target = event.target;
      if (!container || !(target instanceof Element)) return;
      // Toasts (e.g. "Chat cleared · Undo") live outside the panel.
      if (target.closest("[data-sonner-toaster]")) return;
      if (!container.contains(target)) closeAssistant();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeAssistant();
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeAssistant]);

  useEffect(() => {
    function openAssistant() {
      setIsOpen(true);
    }
    window.addEventListener("aminiya:open-assistant", openAssistant);
    return () => window.removeEventListener("aminiya:open-assistant", openAssistant);
  }, []);

  // Never leave the microphone or audio running after unmount.
  useEffect(() => {
    return () => {
      discardRecordingRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      releaseMicrophone();
      transcribeAbortRef.current?.abort();
      speechAbortRef.current?.abort();
      audioRef.current?.pause();
    };
  }, [releaseMicrophone]);

  function startLevelMeter(stream: MediaStream) {
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;

      const samples = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centred = (sample - 128) / 128;
          sum += centred * centred;
        }
        // RMS of speech sits around 0.02–0.2; stretch it to fill the meter.
        micLevel.set(Math.min(1, Math.sqrt(sum / samples.length) * 6));
        levelFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // The meter is decoration; recording works without it.
    }
  }

  async function transcribe(recording: Blob) {
    const controller = new AbortController();
    transcribeAbortRef.current = controller;
    setVoicePhase("transcribing");

    try {
      const extension = recording.type.includes("mp4")
        ? "m4a"
        : recording.type.includes("ogg")
          ? "ogg"
          : "webm";

      const formData = new FormData();
      formData.append(
        "file",
        new File([recording], `aminiya-recording.${extension}`, { type: recording.type })
      );
      formData.append("language", language === "ha" ? "ha" : "en");

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as {
        text?: unknown;
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? text.rateLimited
            : typeof data.error === "string"
              ? data.error
              : text.voiceError
        );
      }

      if (typeof data.text !== "string" || !data.text.trim()) {
        throw new Error(text.voiceError);
      }

      const transcript = data.text.trim();
      setInput((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript));

      // Let the words arrive visibly, then hand the cursor back.
      requestAnimationFrame(() => {
        const field = inputRef.current;
        if (!field) return;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
        if (!prefersReducedMotion()) {
          animate(
            field,
            { opacity: [0.2, 1], filter: ["blur(4px)", "blur(0px)"] },
            { duration: 0.35, ease: "easeOut" }
          );
        }
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setVoiceNotice(error instanceof Error ? error.message : text.voiceError);
      }
    } finally {
      if (transcribeAbortRef.current === controller) {
        transcribeAbortRef.current = null;
        setVoicePhase("idle");
      }
    }
  }

  async function toggleRecording() {
    if (voicePhase === "listening") {
      stopRecording(false);
      return;
    }
    if (voicePhase === "transcribing") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceNotice(text.voiceUnavailable);
      return;
    }

    stopSpeaking();
    setVoiceNotice("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      discardRecordingRef.current = false;

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        releaseMicrophone();
        setVoicePhase("idle");
        setVoiceNotice(text.voiceError);
      };

      recorder.onstop = () => {
        const recording = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        releaseMicrophone();

        if (discardRecordingRef.current) {
          setVoicePhase("idle");
          return;
        }

        if (!recording.size) {
          setVoicePhase("idle");
          setVoiceNotice(text.voiceError);
          return;
        }

        void transcribe(recording);
      };

      recorderRef.current = recorder;
      recorder.start();
      setVoicePhase("listening");
      setElapsed(0);
      startLevelMeter(stream);

      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setVoiceNotice(text.recordingCapped);
          stopRecording(false);
        }
      }, 250);
    } catch (error) {
      releaseMicrophone();
      setVoicePhase("idle");

      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError")
      ) {
        setVoiceNotice(text.voicePermission);
      } else {
        setVoiceNotice(text.voiceError);
      }
    }
  }

  // ── Read aloud ───────────────────────────────────────────────────────────

  async function speakResponse(message: ChatMessage) {
    if (speaking?.id === message.id) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const spokenText = toSpokenText(message.content);
    if (!spokenText) return;

    const controller = new AbortController();
    speechAbortRef.current = controller;
    setVoiceNotice("");
    setSpeaking({ id: message.id, phase: "loading" });

    try {
      for (const chunk of splitSpeechText(spokenText)) {
        if (controller.signal.aborted) break;

        const response = await fetch("/api/voice/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk, language: language === "ha" ? "ha" : "en" }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: unknown };
          throw new Error(
            response.status === 429
              ? text.rateLimited
              : typeof data.error === "string"
                ? data.error
                : text.voiceError
          );
        }

        const audioBlob = await response.blob();
        if (controller.signal.aborted) break;

        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        try {
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error(text.voiceError));
            audio
              .play()
              .then(() => setSpeaking({ id: message.id, phase: "playing" }))
              .catch(reject);
          });
        } finally {
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) audioRef.current = null;
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setVoiceNotice(error instanceof Error ? error.message : text.voiceError);
      }
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null;
        setSpeaking(null);
      }
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  async function sendMessage(value: string, retryOf?: string) {
    const content = value.trim();
    if (!content || isLoading || content.length > 4000) return;

    const userMessage: ChatMessage = { id: newId(), role: "user", content };

    // A retried message moves to the end as a fresh send; failed messages
    // never go to the server as history.
    const base = messages.filter((message) => message.id !== retryOf);
    const nextMessages = [...base, userMessage];
    const history = nextMessages
      .filter((message) => message.status !== "failed")
      .map(({ role, content: body }) => ({ role, content: body }));

    setMessages(nextMessages);
    if (!retryOf) setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, language }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? text.rateLimited
            : typeof data.error === "string"
              ? data.error
              : text.error
        );
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error(text.error);
      }

      setMessages((current) => [
        ...current,
        { id: newId(), role: "assistant", content: data.reply as string },
      ]);
    } catch (error) {
      const reason =
        typeof navigator !== "undefined" && navigator.onLine === false
          ? text.offline
          : error instanceof Error && error.message && error.message !== "Failed to fetch"
            ? error.message
            : text.error;

      setMessages((current) =>
        current.map((message) =>
          message.id === userMessage.id
            ? { ...message, status: "failed", failedReason: reason }
            : message
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function startNewConversation() {
    const snapshot = messages;
    stopSpeaking();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();

    notify.undoable({
      message: text.chatCleared,
      undoLabel: text.undo,
      onUndo: () => setMessages((current) => (current.length ? current : snapshot)),
    });
  }

  return (
    <div
      ref={assistantContainerRef}
      className="fixed right-4 bottom-4 z-[70] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="assistant-panel"
            aria-label={text.title}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springs.sheetCalm }}
            exit={{ opacity: 0, scale: 0.94, y: 10, transition: springs.exit }}
            style={{ transformOrigin: "bottom right" }}
            className="flex h-[min(640px,calc(100dvh-112px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper-raised shadow-2xl shadow-ink/20"
          >
            <header className="flex items-center justify-between gap-3 bg-ink px-4 py-4 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-raised text-signal">
                  <Bot size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{text.title}</h2>
                  <p className="truncate text-xs text-on-ink-muted">{text.subtitle}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <AnimatePresence initial={false}>
                  {messages.length > 0 && (
                    <motion.button
                      key="new-chat"
                      type="button"
                      onClick={startNewConversation}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: springs.exit }}
                      whileTap={{ scale: 0.95 }}
                      transition={springs.snappy}
                      className="rounded-lg px-2 py-2 text-xs font-medium text-white/90 hover:bg-paper-raised/10"
                    >
                      {text.newChat}
                    </motion.button>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={closeAssistant}
                  className="rounded-full p-2 hover:bg-paper-raised/10"
                  aria-label={text.close}
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-paper px-4 py-4"
              aria-live="polite"
              aria-relevant="additions"
            >
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col justify-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ ...springs.sheet, delay: 0.08 }}
                    className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-signal/15 text-ink"
                  >
                    <Bot size={26} aria-hidden="true" />
                  </motion.div>

                  <h3 className="text-lg font-semibold text-ink">{text.welcome}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{text.intro}</p>

                  <div className="mt-6 space-y-2">
                    {text.suggestions.map((suggestion, index) => (
                      <motion.button
                        key={suggestion}
                        type="button"
                        onClick={() => void sendMessage(suggestion)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springs.default, delay: 0.12 + index * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                        className="block w-full rounded-xl border border-line-soft bg-paper-raised px-3 py-3 text-left text-sm text-ink-muted transition-colors hover:border-signal/50 hover:bg-tint"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: springs.exit }}
                      transition={springs.default}
                      style={{ transformOrigin: message.role === "user" ? "bottom right" : "bottom left" }}
                      className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        // pre-wrap only for the user's own text: on rendered markdown it
                        // turns the newlines between <li>s into blank lines.
                        className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-6 break-words transition-colors ${
                          message.role === "user" ? "whitespace-pre-wrap" : ""
                        } ${
                          message.role === "user"
                            ? message.status === "failed"
                              ? "rounded-br-md border border-red-200 bg-red-50 text-red-900"
                              : "rounded-br-md bg-signal text-ink"
                            : "rounded-bl-md border border-line-soft bg-paper-raised text-ink"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <>
                            {/* Compact chat prose: blocks separated by 0.5rem, list items by 2px. */}
                            <div className="text-sm leading-[1.45rem] [&>*+*]:mt-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-[15px] [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:pl-0.5 [&_li+li]:mt-0.5 [&_li>p]:m-0 [&_li>ol]:mt-0.5 [&_li>ul]:mt-0.5 [&_li::marker]:text-signal-deep [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ children }) => (
                                    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-line-soft">
                                      <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border-b border-line-soft bg-tint px-2 py-2 font-semibold">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border-b border-line-soft px-2 py-2 align-top">
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            <ReadAloudButton
                              state={speaking?.id === message.id ? speaking.phase : "idle"}
                              labels={text}
                              onClick={() => void speakResponse(message)}
                            />
                          </>
                        ) : (
                          message.content
                        )}
                      </div>

                      {message.status === "failed" ? (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={springs.snappy}
                          role="alert"
                          className="mt-1.5 flex max-w-[88%] flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-red-700"
                        >
                          <span>
                            <span className="font-semibold">{text.notSent}</span>
                            {message.failedReason ? ` · ${message.failedReason}` : ""}
                          </span>
                          <motion.button
                            type="button"
                            onClick={() => void sendMessage(message.content, message.id)}
                            disabled={isLoading}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-paper-raised px-2 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <RotateCcw size={12} aria-hidden="true" />
                            {text.retry}
                          </motion.button>
                        </motion.div>
                      ) : null}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: springs.exit }}
                    transition={springs.default}
                    className="flex justify-start"
                  >
                    <div
                      className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line-soft bg-paper-raised px-4 py-3.5"
                      role="status"
                      aria-label={text.typing}
                    >
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="size-1.5 rounded-full bg-signal/70"
                          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: dot * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {voiceNotice && (
                  <motion.div
                    key="voice-notice"
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: springs.exit }}
                    transition={springs.snappy}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      <span>{voiceNotice}</span>
                      <button
                        type="button"
                        onClick={() => setVoiceNotice("")}
                        aria-label={text.close}
                        className="-mr-1 shrink-0 rounded p-0.5 hover:bg-amber-100"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-line-soft bg-paper-raised p-3">
              <AnimatePresence initial={false}>
                {busyWithVoice && (
                  <motion.div
                    key="voice-status"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, transition: springs.exit }}
                    transition={springs.snappy}
                    className="overflow-hidden"
                  >
                    <div
                      role="status"
                      className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${
                        voicePhase === "listening"
                          ? "bg-red-50 text-red-800"
                          : "bg-tint text-ink"
                      }`}
                    >
                      {voicePhase === "listening" ? (
                        <>
                          <span className="relative flex size-2.5 shrink-0">
                            <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
                            <span className="relative size-2.5 rounded-full bg-red-600" />
                          </span>
                          <span className="font-semibold">
                            {text.listening}… <span className="tabular-nums">{formatElapsed(elapsed)}</span>
                          </span>
                          <LevelMeter level={micLevel} />
                          <span className="flex-1" />
                          <button
                            type="button"
                            onClick={() => stopRecording(true)}
                            className="rounded-md px-2 py-1 font-semibold hover:bg-red-100"
                          >
                            {text.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={() => stopRecording(false)}
                            className="rounded-md bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700"
                          >
                            {text.done}
                          </button>
                        </>
                      ) : (
                        <>
                          <LoaderCircle size={14} className="shrink-0 animate-spin" aria-hidden="true" />
                          <span className="font-semibold">{text.transcribing}</span>
                          <span className="flex-1" />
                          <button
                            type="button"
                            onClick={cancelTranscription}
                            className="rounded-md px-2 py-1 font-semibold hover:bg-signal/15"
                          >
                            {text.cancel}
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 rounded-xl border border-line-soft bg-tint p-1.5 focus-within:border-signal focus-within:ring-2 focus-within:ring-signal/10">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={voicePhase === "transcribing" ? text.transcribing : text.placeholder}
                  maxLength={4000}
                  disabled={isLoading || busyWithVoice}
                  aria-label={text.placeholder}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60"
                />

                <motion.button
                  type="button"
                  onClick={() => void toggleRecording()}
                  disabled={isLoading || voicePhase === "transcribing"}
                  aria-label={voicePhase === "listening" ? text.stopVoice : text.startVoice}
                  aria-pressed={voicePhase === "listening"}
                  title={voicePhase === "listening" ? text.stopVoice : text.startVoice}
                  whileTap={{ scale: 0.9 }}
                  transition={springs.snappy}
                  className={`relative flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    voicePhase === "listening"
                      ? "bg-red-600 text-white"
                      : "text-ink-subtle hover:bg-tint hover:text-ink"
                  }`}
                >
                  {voicePhase === "listening" && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-lg border-2 border-red-500"
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={voicePhase === "listening" ? "stop" : "mic"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0, transition: springs.exit }}
                      transition={springs.snappy}
                      className="relative block"
                    >
                      {voicePhase === "listening" ? (
                        <Square size={15} fill="currentColor" />
                      ) : (
                        <Mic size={18} />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>

                <motion.button
                  type="submit"
                  disabled={!input.trim() || isLoading || busyWithVoice}
                  aria-label={text.send}
                  whileTap={{ scale: 0.9 }}
                  transition={springs.snappy}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-signal text-ink transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={17} />
                </motion.button>
              </div>

              <p className="mt-2 text-center text-[10px] text-ink-subtle">{text.disclaimer}</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2.5">
        <AnimatePresence initial={false}>
          {!isOpen && (
            <motion.span
              key="badge"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8, transition: springs.exit }}
              transition={springs.default}
              className="rounded-full border border-signal/15 bg-paper-raised px-3 py-2 text-xs font-semibold text-ink shadow-md shadow-ink/5"
            >
              {text.badge}
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => (isOpen ? closeAssistant() : setIsOpen(true))}
          aria-label={isOpen ? text.close : text.open}
          aria-expanded={isOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          className="flex size-14 items-center justify-center rounded-full bg-signal text-ink shadow-lg shadow-orange-900/25 hover:bg-signal-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isOpen ? "close" : "open"}
              initial={{ rotate: isOpen ? -90 : 90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: isOpen ? 90 : -90, scale: 0.5, opacity: 0, transition: springs.exit }}
              transition={springs.snappy}
              className="block"
            >
              {isOpen ? <X size={23} /> : <MessageCircle size={25} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

/** Five bars that follow the microphone's loudness while recording. */
function LevelMeter({ level }: { level: MotionValue<number> }) {
  return (
    <span className="flex h-4 items-center gap-0.5" aria-hidden="true">
      {[0.55, 0.85, 1, 0.8, 0.5].map((weight, index) => (
        <LevelBar key={index} level={level} weight={weight} />
      ))}
    </span>
  );
}

function LevelBar({ level, weight }: { level: MotionValue<number>; weight: number }) {
  const scaleY = useTransform(level, (value) => 0.2 + Math.min(1, value * weight) * 0.8);
  return (
    <motion.span
      style={{ scaleY }}
      className="block h-4 w-[3px] origin-center rounded-full bg-red-500"
    />
  );
}

/** Read-aloud control with distinct loading and playing states. */
function ReadAloudButton({
  state,
  labels,
  onClick,
}: {
  state: "idle" | "loading" | "playing";
  labels: { readResponse: string; preparingAudio: string; stopReading: string };
  onClick: () => void;
}) {
  const label =
    state === "loading" ? labels.preparingAudio : state === "playing" ? labels.stopReading : labels.readResponse;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      aria-label={state === "idle" ? labels.readResponse : labels.stopReading}
      className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors ${
        state === "idle"
          ? "text-ink-subtle hover:bg-tint hover:text-ink"
          : "bg-tint text-ink"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6, transition: springs.exit }}
          transition={springs.snappy}
          className="flex size-[15px] items-center justify-center"
        >
          {state === "loading" ? (
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
          ) : state === "playing" ? (
            <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
              {[0, 1, 2].map((bar) => (
                <motion.span
                  key={bar}
                  className="block h-3 w-[3px] origin-bottom rounded-full bg-current"
                  animate={{ scaleY: [0.3, 1, 0.45, 0.85, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: bar * 0.18 }}
                />
              ))}
            </span>
          ) : (
            <Volume2 size={15} aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
      <span>{label}</span>
    </motion.button>
  );
}
