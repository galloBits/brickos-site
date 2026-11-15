"use client";

import { useRef, useState } from "react";

// Browser voice agent for BrickOS, backed by the xAI Realtime (speech-to-speech)
// API. The flow:
//   1. POST /api/voice/token -> get a short-lived client secret (key stays server-side)
//   2. open wss://api.x.ai/v1/realtime with that token in the subprotocol
//   3. session.update to set the persona + server-side voice-activity detection
//   4. stream mic audio up (24kHz PCM16) and play the model's audio back
// No XAI_API_KEY ever reaches this file — only the ephemeral token does.

const SAMPLE_RATE = 24000; // xAI default: 24kHz, 16-bit, little-endian PCM

// Your xAI console agent. When set, the browser connects with ?agent_id=... and
// the agent's own persona/voice/knowledge (configured in the xAI console) drive
// the conversation — nothing persona-related needs to live in this file.
//
// Caveat: xAI documents agent_id for server-side (raw-key) connections, not for
// the browser + ephemeral-token path we use here. It MAY still work (it's just a
// query param). If testing shows xAI rejects it, set AGENT_ID = "" to fall back
// to grok-voice-latest with the inline INSTRUCTIONS below.
const AGENT_ID = "agent_8nGzRgyVkatLV5Vq";

const XAI_REALTIME_URL = AGENT_ID
  ? `wss://api.x.ai/v1/realtime?agent_id=${AGENT_ID}`
  : "wss://api.x.ai/v1/realtime?model=grok-voice-latest";

// Fallback persona, used only when AGENT_ID is empty. Tune freely.
const INSTRUCTIONS = `You are the BrickOS voice assistant. BrickOS is an "operator OS" for
real estate investors and property managers: a suite of AI agents that handle the busywork at every
stage of a deal, from off-market sourcing to underwriting, operations, investor relations, and exit.
Be warm, concise, and genuinely helpful. Answer questions about what BrickOS does, how pricing works
(agents are $39/mo each, or $695/mo for the full suite), and how data stays private (cloud-hosted on
US infrastructure, each customer's data isolated, and nothing entered is used to train any AI model).
If someone wants to buy or book a demo, point them to the Get Started button. Keep answers short since
this is a spoken conversation. If you don't know something specific, say so and offer to connect them
with the team.`;

type Status = "idle" | "connecting" | "live" | "error";

function floatTo16BitPCMBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64PCM16ToFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function VoiceAgent() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // "Leave a message" contact form, shown so visitors can reach the team with
  // follow-up questions after (or instead of) talking.
  const [showContact, setShowContact] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cMessage, setCMessage] = useState("");
  const [cState, setCState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cError, setCError] = useState("");

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    setCState("sending");
    setCError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName, email: cEmail, message: cMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send your message.");
      setCState("sent");
      setCName("");
      setCEmail("");
      setCMessage("");
    } catch (err) {
      setCError(err instanceof Error ? err.message : "Something went wrong.");
      setCState("error");
    }
  }

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playheadRef = useRef(0); // next scheduled playback time in the output context
  const statusRef = useRef<Status>("idle"); // latest status, readable inside ws.onclose
  statusRef.current = status;

  function cleanup() {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    inCtxRef.current?.close().catch(() => {});
    inCtxRef.current = null;
    outCtxRef.current?.close().catch(() => {});
    outCtxRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    playheadRef.current = 0;
  }

  function stop() {
    cleanup();
    setStatus("idle");
  }

  function playChunk(float32: Float32Array) {
    const ctx = outCtxRef.current;
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const now = ctx.currentTime;
    if (playheadRef.current < now) playheadRef.current = now;
    source.start(playheadRef.current);
    playheadRef.current += buffer.duration;
  }

  async function start() {
    setErrorMsg("");
    setTranscript("");
    setStatus("connecting");
    try {
      // 1. Ephemeral token from our server.
      const tokenRes = await fetch("/api/voice/token", { method: "POST" });
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't start the voice session.");
      }
      const { value: token } = (await tokenRes.json()) as { value: string };

      // 2. Microphone (prompts the visitor for permission).
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // 3. Audio contexts pinned to 24kHz so mic + playback match xAI's format.
      const inCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const outCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      await inCtx.resume();
      await outCtx.resume();
      inCtxRef.current = inCtx;
      outCtxRef.current = outCtx;

      // 4. Open the realtime socket with the token in the subprotocol.
      const ws = new WebSocket(XAI_REALTIME_URL, [`xai-client-secret.${token}`]);
      wsRef.current = ws;

      ws.onopen = () => {
        // With an agent_id, the agent's console config supplies persona + voice,
        // so we only turn on server-side voice-activity detection for the mic
        // flow. Without one, we also push the inline persona + voice.
        const session: Record<string, unknown> = { turn_detection: { type: "server_vad" } };
        if (!AGENT_ID) {
          session.instructions = INSTRUCTIONS;
          session.voice = "eve";
        }
        ws.send(JSON.stringify({ type: "session.update", session }));
        // Greet first so the visitor hears something right away.
        ws.send(JSON.stringify({ type: "response.create" }));

        // Start streaming mic audio up. ScriptProcessor is deprecated but works
        // everywhere without shipping a separate AudioWorklet file.
        const source = inCtx.createMediaStreamSource(stream);
        const processor = inCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const pcm = floatTo16BitPCMBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: pcm }));
        };
        source.connect(processor);
        processor.connect(inCtx.destination);
        setStatus("live");
      };

      ws.onmessage = (event) => {
        let msg: { type: string; delta?: string };
        try {
          msg = JSON.parse(typeof event.data === "string" ? event.data : "");
        } catch {
          return;
        }
        if (msg.type === "response.output_audio.delta" && msg.delta) {
          playChunk(base64PCM16ToFloat32(msg.delta));
        } else if (msg.type === "response.output_audio_transcript.delta" && msg.delta) {
          setTranscript((t) => (t + msg.delta).slice(-600));
        } else if (msg.type === "response.output_audio_transcript.done") {
          setTranscript((t) => t + "\n");
        }
      };

      ws.onerror = () => {
        setErrorMsg("Voice connection error. Please try again.");
        setStatus("error");
        cleanup();
      };
      ws.onclose = () => {
        if (statusRef.current === "live") setStatus("idle");
      };
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser to talk."
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      setErrorMsg(message);
      setStatus("error");
      cleanup();
    }
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Talk to BrickOS"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-5 py-3 bg-accent text-black font-mono text-xs tracking-widest font-bold shadow-lg hover:brightness-110 transition"
        >
          <span aria-hidden>🎙</span> TALK TO BRICKOS
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[320px] max-w-[calc(100vw-2.5rem)] border border-white/15 bg-[#121212] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "live" ? "bg-accent animate-pulse" : status === "connecting" ? "bg-yellow-400" : "bg-white/30"
                }`}
              />
              <span className="font-mono text-[11px] tracking-widest">
                {status === "live"
                  ? "LISTENING…"
                  : status === "connecting"
                    ? "CONNECTING…"
                    : status === "error"
                      ? "ERROR"
                      : "VOICE ASSISTANT"}
              </span>
            </div>
            <button
              onClick={() => {
                stop();
                setOpen(false);
              }}
              aria-label="Close"
              className="text-white/50 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="min-h-[72px] max-h-[160px] overflow-y-auto font-mono text-[12px] text-white/70 whitespace-pre-wrap">
              {errorMsg ? (
                <span className="text-red-400">{errorMsg}</span>
              ) : transcript ? (
                transcript
              ) : status === "live" ? (
                "Go ahead — ask me anything about BrickOS."
              ) : (
                "Tap below and speak. I can answer questions about BrickOS, pricing, and how it works."
              )}
            </div>

            <div className="mt-4">
              {status === "idle" || status === "error" ? (
                <button
                  onClick={start}
                  className="w-full px-4 py-2.5 bg-accent text-black font-mono text-xs tracking-widest font-bold hover:brightness-110 transition"
                >
                  START TALKING →
                </button>
              ) : (
                <button
                  onClick={stop}
                  disabled={status === "connecting"}
                  className="w-full px-4 py-2.5 border border-white/20 font-mono text-xs tracking-widest hover:border-red-400 hover:text-red-400 transition disabled:opacity-50"
                >
                  {status === "connecting" ? "CONNECTING…" : "STOP"}
                </button>
              )}
            </div>
            {/* Contact form: reach the team with any follow-up questions. */}
            <div className="mt-4 pt-3 border-t border-white/10">
              {cState === "sent" ? (
                <p className="font-mono text-[11px] text-accent">Thanks — we'll be in touch by email soon.</p>
              ) : !showContact ? (
                <button
                  onClick={() => setShowContact(true)}
                  className="font-mono text-[11px] text-white/55 hover:text-accent transition"
                >
                  ✉ Have more questions? Leave a message →
                </button>
              ) : (
                <form onSubmit={submitContact} className="space-y-2">
                  <input
                    type="text"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-black border border-white/15 px-3 py-2 font-mono text-[12px] focus:border-accent outline-none"
                  />
                  <input
                    type="email"
                    required
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Your email *"
                    className="w-full bg-black border border-white/15 px-3 py-2 font-mono text-[12px] focus:border-accent outline-none"
                  />
                  <textarea
                    required
                    value={cMessage}
                    onChange={(e) => setCMessage(e.target.value)}
                    placeholder="Your question *"
                    rows={3}
                    className="w-full bg-black border border-white/15 px-3 py-2 font-mono text-[12px] focus:border-accent outline-none resize-none"
                  />
                  {cState === "error" && <p className="font-mono text-[10px] text-red-400">{cError}</p>}
                  <button
                    type="submit"
                    disabled={cState === "sending"}
                    className="w-full px-4 py-2 bg-accent text-black font-mono text-xs tracking-widest font-bold hover:brightness-110 transition disabled:opacity-50"
                  >
                    {cState === "sending" ? "SENDING…" : "SEND MESSAGE →"}
                  </button>
                </form>
              )}
            </div>

            <p className="mt-3 font-mono text-[9px] text-white/30 tracking-wide">
              Powered by xAI Grok voice. Your mic audio is sent to xAI to answer you.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
