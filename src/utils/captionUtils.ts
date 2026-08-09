import { CaptionSegment, CaptionWord } from '../types';

export function formatTimestamp(seconds: number, format: 'srt' | 'vtt' | 'display' = 'display'): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');

  if (format === 'srt') {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad3(ms)}`;
  } else if (format === 'vtt') {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad3(ms)}`;
  } else {
    // display format e.g. 01:23.4
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}.${Math.floor(ms / 100)}`;
    }
    return `${pad(mins)}:${pad(secs)}.${Math.floor(ms / 100)}`;
  }
}

export function generateSrt(segments: CaptionSegment[]): string {
  return segments
    .map((seg, idx) => {
      const indexStr = idx + 1;
      const timeStr = `${formatTimestamp(seg.start, 'srt')} --> ${formatTimestamp(seg.end, 'srt')}`;
      const textStr = seg.words.map(w => w.word + (w.emoji ? ` ${w.emoji}` : '')).join(' ');
      return `${indexStr}\n${timeStr}\n${textStr}\n`;
    })
    .join('\n');
}

export function generateVtt(segments: CaptionSegment[]): string {
  let vtt = 'WEBVTT\n\n';
  vtt += segments
    .map((seg, idx) => {
      const timeStr = `${formatTimestamp(seg.start, 'vtt')} --> ${formatTimestamp(seg.end, 'vtt')}`;
      const textStr = seg.words.map(w => w.word + (w.emoji ? ` ${w.emoji}` : '')).join(' ');
      return `${idx + 1}\n${timeStr}\n${textStr}\n`;
    })
    .join('\n');
  return vtt;
}

export function generatePlainTranscript(segments: CaptionSegment[]): string {
  return segments.map(seg => seg.text).join(' ');
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function rechunkSegments(segments: CaptionSegment[], wordsPerChunk: number): CaptionSegment[] {
  if (wordsPerChunk <= 0) return segments;

  // Flatten all words
  const allWords: CaptionWord[] = [];
  segments.forEach(seg => {
    allWords.push(...seg.words);
  });

  if (allWords.length === 0) return [];

  const newSegments: CaptionSegment[] = [];
  for (let i = 0; i < allWords.length; i += wordsPerChunk) {
    const chunkWords = allWords.slice(i, i + wordsPerChunk);
    const start = chunkWords[0].start;
    const end = chunkWords[chunkWords.length - 1].end;
    const text = chunkWords.map(cw => cw.word).join(' ');

    newSegments.push({
      id: `seg-rc-${i}-${Date.now()}`,
      start,
      end,
      text,
      words: chunkWords,
    });
  }

  return newSegments;
}

export function shiftAllTimestamps(segments: CaptionSegment[], offsetSeconds: number): CaptionSegment[] {
  return segments.map(seg => {
    const newStart = Math.max(0, Number((seg.start + offsetSeconds).toFixed(2)));
    const newEnd = Math.max(0.1, Number((seg.end + offsetSeconds).toFixed(2)));
    const newWords = seg.words.map(w => ({
      ...w,
      start: Math.max(0, Number((w.start + offsetSeconds).toFixed(2))),
      end: Math.max(0.05, Number((w.end + offsetSeconds).toFixed(2))),
    }));
    return {
      ...seg,
      start: newStart,
      end: newEnd,
      words: newWords,
    };
  });
}

export function scaleAllTimestamps(segments: CaptionSegment[], speedMultiplier: number): CaptionSegment[] {
  if (!speedMultiplier || speedMultiplier <= 0 || speedMultiplier === 1) return segments;
  return segments.map(seg => {
    const newStart = Math.max(0, Number((seg.start / speedMultiplier).toFixed(2)));
    const newEnd = Math.max(newStart + 0.1, Number((seg.end / speedMultiplier).toFixed(2)));
    const newWords = seg.words.map(w => ({
      ...w,
      start: Math.max(0, Number((w.start / speedMultiplier).toFixed(2))),
      end: Math.max(0.05, Number((w.end / speedMultiplier).toFixed(2))),
    }));
    return {
      ...seg,
      start: newStart,
      end: newEnd,
      words: newWords,
    };
  });
}

export function sanitizeAndAlignTimestamps(segments: CaptionSegment[]): CaptionSegment[] {
  if (!segments || !Array.isArray(segments) || segments.length === 0) return [];

  const highlightPalette = ['#84cc16', '#fbbf24', '#f43f5e', '#38bdf8', '#a855f7'];

  return segments.map((seg, sIdx) => {
    let sanitizedWords = seg.words.map((w, wIdx) => {
      let start = typeof w.start === 'number' && !isNaN(w.start) ? Math.max(0, w.start) : sIdx * 1.5 + wIdx * 0.25;
      let end = typeof w.end === 'number' && !isNaN(w.end) ? w.end : start + 0.25;

      if (end <= start) {
        end = Number((start + 0.22).toFixed(2));
      }

      // Ensure word duration is reasonable (at least 0.08s)
      if (end - start < 0.08) {
        end = Number((start + 0.08).toFixed(2));
      }

      // Assign vibrant highlight color if marked as highlight
      let highlightColor = w.highlightColor;
      if (w.isHighlight && !highlightColor) {
        highlightColor = highlightPalette[wIdx % highlightPalette.length];
      }

      return {
        ...w,
        id: w.id || `w-${sIdx}-${wIdx}-${Date.now()}`,
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        highlightColor,
      };
    });

    // Enforce sequential word order within segment
    for (let i = 1; i < sanitizedWords.length; i++) {
      if (sanitizedWords[i].start < sanitizedWords[i - 1].start) {
        sanitizedWords[i].start = Number((sanitizedWords[i - 1].end + 0.02).toFixed(2));
        sanitizedWords[i].end = Number((sanitizedWords[i].start + 0.20).toFixed(2));
      }
    }

    const segStart = sanitizedWords.length > 0 ? sanitizedWords[0].start : Math.max(0, seg.start);
    const segEnd = sanitizedWords.length > 0 ? sanitizedWords[sanitizedWords.length - 1].end : segStart + 0.5;

    return {
      ...seg,
      id: seg.id || `seg-${sIdx}-${Date.now()}`,
      start: Number(segStart.toFixed(2)),
      end: Number(segEnd.toFixed(2)),
      text: seg.text || sanitizedWords.map(w => w.word).join(' '),
      words: sanitizedWords,
    };
  });
}

export function findCurrentActiveCaption(
  segments: CaptionSegment[],
  currentTime: number,
  syncOffset: number = 0
): { segment: CaptionSegment | null; activeWordIndex: number } {
  if (!segments || segments.length === 0) return { segment: null, activeWordIndex: -1 };

  const effectiveTime = currentTime + syncOffset;

  // 1. Direct active segment search with lookahead/lookbehind
  let seg = segments.find(s => effectiveTime >= s.start - 0.12 && effectiveTime <= s.end + 0.18);

  // 2. Continuous speech fallback between adjacent segments to prevent caption flickering
  if (!seg) {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const nextS = segments[i + 1];
      if (effectiveTime >= s.start && (!nextS || effectiveTime < nextS.start - 0.05)) {
        if (effectiveTime - s.end <= 0.40) {
          seg = s;
          break;
        }
      }
    }
  }

  if (!seg) {
    return { segment: null, activeWordIndex: -1 };
  }

  let activeWordIndex = -1;

  // Exact word time window check
  for (let i = 0; i < seg.words.length; i++) {
    const w = seg.words[i];
    if (effectiveTime >= w.start - 0.06 && effectiveTime <= w.end + 0.06) {
      activeWordIndex = i;
      break;
    }
  }

  // Fallback: Between words inside active phrase
  if (activeWordIndex === -1 && seg.words.length > 0) {
    if (effectiveTime >= seg.words[0].start - 0.06) {
      for (let i = seg.words.length - 1; i >= 0; i--) {
        if (effectiveTime >= seg.words[i].start - 0.06) {
          activeWordIndex = i;
          break;
        }
      }
    } else {
      activeWordIndex = 0;
    }
  }

  return { segment: seg, activeWordIndex };
}

/**
 * Extracts base64 audio data from a video/audio file in browser memory safely
 */
export async function extractAudioFromVideoFile(file: File): Promise<{ audioBase64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;

        // If it is already a direct audio file and under 15MB, send directly
        if (file.type.startsWith('audio/') && file.size < 15 * 1024 * 1024) {
          const base64 = arrayBufferToBase64(arrayBuffer);
          return resolve({
            audioBase64: base64,
            mimeType: file.type || 'audio/mp3',
          });
        }

        // Try extracting audio buffer via AudioContext to produce clean 16kHz mono WAV
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

          // Convert AudioBuffer to 16kHz mono WAV
          const wavArrayBuffer = audioBufferToWav(audioBuffer);
          const base64 = arrayBufferToBase64(wavArrayBuffer);

          return resolve({
            audioBase64: base64,
            mimeType: 'audio/wav',
          });
        } catch (decodeErr) {
          console.warn('AudioContext decode failed, falling back to raw video/audio base64:', decodeErr);
          const base64 = arrayBufferToBase64(arrayBuffer);
          return resolve({
            audioBase64: base64,
            mimeType: file.type || 'video/mp4',
          });
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const pcmChannel = buffer.getChannelData(0);
  const dataLength = pcmChannel.length * 2;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // WAV Header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM Samples
  let offset = 44;
  for (let i = 0; i < pcmChannel.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmChannel[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
