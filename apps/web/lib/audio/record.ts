/**
 * Recording a short spoken phrase, as WAV.
 *
 * MediaRecorder hands back webm/opus in Chrome, which Gemini does not reliably
 * accept, so the clip is decoded with an AudioContext and re-encoded as
 * 16-bit PCM WAV — the one audio format the API definitely takes. Downmixed to
 * mono at whatever rate the device gave us; speech does not need stereo and
 * halving the bytes halves the upload.
 */

/** Longest clip we will send. A search phrase is a few seconds at most. */
export const MAX_RECORDING_MS = 8000;

function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    // Clamped before scaling: a value outside [-1,1] wraps to the opposite
    // extreme once truncated to 16 bits, which is heard as a loud click.
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunked: spreading a whole clip into String.fromCharCode blows the
  // argument limit on anything longer than a second or so.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export type Recorder = {
  /** Resolves with base64 WAV, or null if nothing usable was captured. */
  stop: () => Promise<string | null>;
};

/**
 * Starts recording and hands back a stop() that returns the clip.
 *
 * Throws if the microphone is unavailable — the caller turns that into a
 * message, since a refused permission is the one failure worth explaining.
 */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<string | null>((resolve) => {
        recorder.onstop = async () => {
          // Release the microphone before any decoding, so the browser's
          // recording indicator goes out the moment the person stops talking.
          stream.getTracks().forEach((t) => t.stop());
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            if (blob.size === 0) return resolve(null);
            const context = new AudioContext();
            const audio = await context.decodeAudioData(await blob.arrayBuffer());
            const mono = audio.getChannelData(0);
            const wav = encodeWav(mono, audio.sampleRate);
            await context.close();
            resolve(toBase64(wav));
          } catch {
            resolve(null);
          }
        };
        if (recorder.state !== "inactive") recorder.stop();
        else resolve(null);
      }),
  };
}
