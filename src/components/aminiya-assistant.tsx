"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, LoaderCircle, MessageCircle, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/components/language-provider";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};


const copy = {
  en: {
    title: "Aminiya Assistant",
    subtitle: "Here to help you navigate Aminiya",
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
    typing: "Aminiya is thinking...",
    error: "I couldn't send that message. Please try again.",
    newChat: "New chat",
    disclaimer: "Aminiya Assistant can make mistakes. Check important information.",
    startVoice: "Ask by voice",
    stopVoice: "Stop listening",
    readResponse: "Read response aloud",
    stopReading: "Stop reading",
    voiceUnavailable: "Microphone recording is not supported in this browser. Try a modern browser.",
    voicePermission: "Microphone access was denied. Allow microphone access in your browser settings.",
    voiceError: "I couldn't recognise your speech. Please try again.",
  },
  ha: {
    title: "Mataimakin Aminiya",
    subtitle: "Ina nan don taimaka maka amfani da Aminiya",
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
    typing: "Aminiya na tunani...",
    error: "An kasa aika saƙon. Da fatan za a sake gwadawa.",
    newChat: "Sabuwar hira",
    disclaimer: "Mataimakin Aminiya na iya yin kuskure. Tabbatar da muhimman bayanai.",
    startVoice: "Yi tambaya da murya",
    stopVoice: "Dakatar da sauraro",
    readResponse: "Saurari amsar",
    stopReading: "Dakatar da karantawa",
    voiceUnavailable: "Wannan burauzar ba ta goyon bayan nadar murya. Gwada wata sabuwar burauza.",
    voicePermission: "Ba a ba da izinin amfani da makirufo ba. Duba saitunan burauzarka.",
    voiceError: "Ban gane abin da ka faɗa ba. Da fatan za a sake gwadawa.",
  },
} as const;

export default function AminiyaAssistant() {
  const { language } = useLanguage();
  const text = copy[language];

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingIndex, setIsSpeakingIndex] = useState<number | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assistantContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      const container = assistantContainerRef.current;

      if (
        container &&
        event.target instanceof Node &&
        !container.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    function openAssistant() {
      setIsOpen(true);
    }

    window.addEventListener("aminiya:open-assistant", openAssistant);

    return () => {
      window.removeEventListener("aminiya:open-assistant", openAssistant);
    };
  }, []);

  function stopListening() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      recorderRef.current = null;
      setIsListening(false);
    }
  }

  async function startListening() {
    if (isListening) {
      stopListening();
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoiceError(text.voiceUnavailable);
      return;
    }

    setVoiceError("");
    setRequestError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setVoiceError(text.voiceError);
        setIsListening(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
      };

      recorder.onstop = async () => {
        setIsListening(false);

        const recording = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        audioChunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;

        if (!recording.size) {
          setVoiceError(text.voiceError);
          return;
        }

        try {
          const formData = new FormData();
          const extension = recording.type.includes("mp4")
            ? "m4a"
            : recording.type.includes("ogg")
              ? "ogg"
              : "webm";

          formData.append(
            "file",
            new File([recording], `aminiya-recording.${extension}`, {
              type: recording.type,
            })
          );
          formData.append("language", language === "ha" ? "ha" : "en");

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json()) as {
            text?: unknown;
            error?: unknown;
          };

          if (!response.ok) {
            throw new Error(
              typeof data.error === "string" ? data.error : text.voiceError
            );
          }

          if (typeof data.text !== "string" || !data.text.trim()) {
            throw new Error(text.voiceError);
          }

          setInput((current) =>
            current.trim()
              ? `${current.trim()} ${data.text as string}`
              : (data.text as string)
          );
        } catch (error) {
          setVoiceError(
            error instanceof Error ? error.message : text.voiceError
          );
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (error) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      recorderRef.current = null;
      setIsListening(false);

      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError")
      ) {
        setVoiceError(text.voicePermission);
      } else {
        setVoiceError(text.voiceError);
      }
    }
  }

  function stopSpeaking() {
    speechAbortRef.current?.abort();
    speechAbortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }

    setIsSpeakingIndex(null);
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

        const words = trimmed.split(/\s+/);
        let part = "";

        for (const word of words) {
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

  async function speakResponse(content: string, index: number) {
    if (isSpeakingIndex === index) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    const spokenText = content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!spokenText) return;

    const controller = new AbortController();
    speechAbortRef.current = controller;
    setVoiceError("");
    setIsSpeakingIndex(index);

    try {
      const chunks = splitSpeechText(spokenText);

      for (const chunk of chunks) {
        if (controller.signal.aborted) break;

        const response = await fetch("/api/voice/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunk,
            language: language === "ha" ? "ha" : "en",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: unknown;
          };
          throw new Error(
            typeof data.error === "string" ? data.error : text.voiceError
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
            audio.play().catch(reject);
          });
        } finally {
          URL.revokeObjectURL(audioUrl);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setVoiceError(
          error instanceof Error ? error.message : text.voiceError
        );
      }
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null;
        setIsSpeakingIndex(null);
      }
    }
  }

  async function sendMessage(value: string) {
    const content = value.trim();

    if (!content || isLoading || content.length > 4000) return;

    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setRequestError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, language }),
      });

      const data = (await response.json()) as {
        reply?: unknown;
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : text.error
        );
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error(text.error);
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply as string },
      ]);
    } catch (error) {
      setRequestError(
        error instanceof Error && error.message ? error.message : text.error
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
    setMessages([]);
    setInput("");
    setRequestError("");
    inputRef.current?.focus();
  }

  return (
    <div
      ref={assistantContainerRef}
      className="fixed right-4 bottom-4 z-[70] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6"
    >
      {isOpen && (
        <section
          aria-label={text.title}
          className="flex h-[min(640px,calc(100dvh-112px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/20"
        >
          <header className="flex items-center justify-between gap-3 bg-[#ff6600] px-4 py-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Bot size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{text.title}</h2>
                <p className="truncate text-xs text-white/85">{text.subtitle}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={startNewConversation}
                  className="rounded-lg px-2 py-2 text-xs font-medium text-white/90 hover:bg-white/15"
                  aria-label={text.newChat}
                  title={text.newChat}
                >
                  {text.newChat}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="rounded-full p-2 hover:bg-white/15"
                aria-label={text.close}
              >
                <X size={19} />
              </button>
            </div>
          </header>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#fafafa] px-4 py-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col justify-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-orange-100 text-[#ff6600]">
                  <Bot size={26} aria-hidden="true" />
                </div>

                <h3 className="text-lg font-semibold text-gray-950">
                  {text.welcome}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {text.intro}
                </p>

                <div className="mt-6 space-y-2">
                  {text.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm text-gray-700 transition hover:border-[#ff6600]/50 hover:bg-orange-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-[#ff6600] text-white"
                        : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <>
                      <div className="space-y-1 text-sm leading-5 [&_p]:my-0 [&_p]:leading-5 [&_p+p]:mt-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_ol]:pl-5 [&_li]:my-0 [&_li]:pl-0.5 [&_li>p]:my-0 [&_li_p]:leading-5 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-1 [&_h3]:font-semibold [&_a]:text-[#ff6600] [&_a]:underline">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ children }) => (
                              <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="border-b border-gray-100 px-2 py-2 align-top">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakResponse(message.content, index)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-gray-500 transition hover:bg-orange-50 hover:text-[#e85d00]"
                        aria-label={isSpeakingIndex === index ? text.stopReading : text.readResponse}
                        title={isSpeakingIndex === index ? text.stopReading : text.readResponse}
                      >
                        {isSpeakingIndex === index ? (
                          <VolumeX size={15} />
                        ) : (
                          <Volume2 size={15} />
                        )}
                        {isSpeakingIndex === index ? text.stopReading : text.readResponse}
                      </button>
                      </>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3.5 py-3 text-xs text-gray-500">
                  <LoaderCircle className="animate-spin" size={15} />
                  {text.typing}
                </div>
              </div>
            )}

            {voiceError && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"
              >
                {voiceError}
              </div>
            )}

            {requestError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
              >
                {requestError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 bg-white p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-[#ff6600] focus-within:ring-2 focus-within:ring-[#ff6600]/10">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={text.placeholder}
                maxLength={4000}
                disabled={isLoading}
                aria-label={text.placeholder}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={startListening}
                disabled={isLoading}
                aria-label={isListening ? text.stopVoice : text.startVoice}
                title={isListening ? text.stopVoice : text.startVoice}
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isListening
                    ? "bg-red-100 text-red-600"
                    : "text-gray-500 hover:bg-orange-50 hover:text-[#e85d00]"
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label={text.send}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ff6600] text-white transition hover:bg-[#e85c00] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-gray-400">
              {text.disclaimer}
            </p>
          </form>
        </section>
      )}

      <div className="flex items-center gap-2.5">
        <span className="rounded-full border border-[#ff6600]/15 bg-white px-3 py-2 text-xs font-semibold text-[#a84300] shadow-md shadow-black/5">
          Aminiya AI
        </span>

        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              stopListening();
              stopSpeaking();
            }
            setIsOpen((open) => !open);
          }}
          aria-label={isOpen ? text.close : text.open}
          aria-expanded={isOpen}
          className="flex size-14 items-center justify-center rounded-full bg-[#ff6600] text-white shadow-lg shadow-orange-900/25 transition hover:scale-105 hover:bg-[#e85c00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff6600]"
        >
          {isOpen ? <X size={23} /> : <MessageCircle size={25} />}
        </button>
      </div>
    </div>
  );
}
