import React, { useState } from 'react';
import { X, Download, FileText, Video, Sparkles, CheckCircle2, Play, RefreshCw, Wand2, Film, Zap } from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types';
import { generateSrt, generateVtt, generatePlainTranscript, downloadFile, findCurrentActiveCaption } from '../utils/captionUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: CaptionSegment[];
  currentStyle: CaptionStyle;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
}

// Helper to ensure video is locally loaded so Canvas is never tainted by CORS
async function prepareLocalVideoBlob(url: string): Promise<string> {
  if (!url) return url;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  try {
    // 1. Try direct fetch first
    const directResponse = await fetch(url);
    if (directResponse.ok) {
      const blob = await directResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('Direct video fetch blocked or failed, attempting server proxy...', e);
  }

  try {
    // 2. Use server proxy to guarantee CORS-safe blob creation
    const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(url)}`;
    const proxyResponse = await fetch(proxyUrl);
    if (proxyResponse.ok) {
      const blob = await proxyResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error('Server video proxy fetch error:', err);
  }

  return url;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  currentStyle,
  videoRef,
  videoUrl,
}) => {
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState('captioned_video.mp4');
  const [renderStatus, setRenderStatus] = useState('');
  const [exportQuality, setExportQuality] = useState<'original' | '1080p' | '720p'>('original');
  const [exportSpeed, setExportSpeed] = useState<number>(2.0);

  if (!isOpen) return null;

  // Handle burning captions onto video canvas and recording
  const handleStartRenderVideo = async () => {
    setIsRenderingVideo(true);
    setRenderProgress(0);
    setDownloadReadyUrl(null);
    setRenderStatus('Preparing original video source for HD export...');

    let tempBlobUrl: string | null = null;
    let renderVideo: HTMLVideoElement | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      // 1. Prepare CORS-safe video source (direct or server proxy)
      const safeVideoSrc = await prepareLocalVideoBlob(videoUrl);
      if (safeVideoSrc !== videoUrl && safeVideoSrc.startsWith('blob:')) {
        tempBlobUrl = safeVideoSrc;
      }

      // 2. Create offscreen render video element attached to DOM for active playback
      renderVideo = document.createElement('video');
      renderVideo.style.position = 'fixed';
      renderVideo.style.top = '-9999px';
      renderVideo.style.left = '-9999px';
      renderVideo.style.width = '1px';
      renderVideo.style.height = '1px';
      renderVideo.style.opacity = '0';
      renderVideo.style.pointerEvents = 'none';
      renderVideo.src = safeVideoSrc;
      renderVideo.crossOrigin = 'anonymous';
      renderVideo.playsInline = true;
      renderVideo.muted = false;
      renderVideo.volume = 1.0;
      renderVideo.preload = 'auto';

      document.body.appendChild(renderVideo);

      setRenderStatus('Loading original video dimensions & metadata...');
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const handleReady = () => {
          if (!resolved && renderVideo && renderVideo.videoWidth > 0) {
            resolved = true;
            resolve();
          }
        };

        renderVideo.onloadedmetadata = handleReady;
        renderVideo.onloadeddata = handleReady;
        renderVideo.oncanplay = handleReady;
        renderVideo.onerror = () => {
          if (!resolved) {
            resolved = true;
            reject(new Error('Failed to load video file for export.'));
          }
        };

        // Polling fallback check
        const interval = setInterval(() => {
          if (renderVideo && renderVideo.videoWidth > 0 && !resolved) {
            resolved = true;
            clearInterval(interval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 4000);
      });

      // Original video dimensions
      let nativeWidth = renderVideo.videoWidth || videoRef.current?.videoWidth || 1080;
      let nativeHeight = renderVideo.videoHeight || videoRef.current?.videoHeight || 1920;

      let width = nativeWidth;
      let height = nativeHeight;

      if (exportQuality === '1080p') {
        const ratio = Math.min(1080 / Math.min(nativeWidth, nativeHeight), 1.0);
        width = Math.round(nativeWidth * ratio);
        height = Math.round(nativeHeight * ratio);
      } else if (exportQuality === '720p') {
        const ratio = Math.min(720 / Math.min(nativeWidth, nativeHeight), 1.0);
        width = Math.round(nativeWidth * ratio);
        height = Math.round(nativeHeight * ratio);
      }

      // Ensure even dimensions for video codecs
      width = width % 2 === 0 ? width : width + 1;
      height = height % 2 === 0 ? height : height + 1;

      // 3. Setup Canvas for crisp HD rendering
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) throw new Error('Canvas 2D context is unavailable on this device.');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 4. Smooth FPS stream capture
      const fps = exportQuality === '720p' ? 30 : 60;
      const canvasStream = canvas.captureStream(fps);

      // 5. Route audio from video element via AudioContext
      let audioDestination: MediaStreamAudioDestinationNode | null = null;
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        const source = audioCtx.createMediaElementSource(renderVideo);
        audioDestination = audioCtx.createMediaStreamDestination();
        source.connect(audioDestination);
        source.connect(audioCtx.destination);
      } catch (audioErr) {
        console.warn('AudioContext stream routing notice:', audioErr);
      }

      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
        combinedTracks.push(...audioDestination.stream.getAudioTracks());
      }

      const recordStream = new MediaStream(combinedTracks);

      // 6. Select supported MediaRecorder MIME type & Bitrate
      const candidateTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];

      const selectedMime = candidateTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const isMp4 = selectedMime.includes('mp4');
      const filename = `captioned_video_${width}x${height}_${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`;
      setExportFilename(filename);

      const numPixels = width * height;
      const targetBitrate = Math.min(32_000_000, Math.max(16_000_000, Math.round(numPixels * 10)));

      const recorder = new MediaRecorder(recordStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: targetBitrate,
        audioBitsPerSecond: 256000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const cleanup = () => {
        if (renderVideo && document.body.contains(renderVideo)) {
          document.body.removeChild(renderVideo);
        }
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
        if (tempBlobUrl) {
          URL.revokeObjectURL(tempBlobUrl);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        setDownloadReadyUrl(url);
        setIsRenderingVideo(false);
        setRenderProgress(100);
        setRenderStatus('Export complete! Click "Save Video" to download.');
        cleanup();
      };

      recorder.onerror = (e) => {
        console.error('Recorder error during export:', e);
        setIsRenderingVideo(false);
        cleanup();
        alert('Video recording interrupted. Please try again.');
      };

      // 7. Start recording in 100ms chunks & play video at accelerated export speed
      recorder.start(100);
      renderVideo.currentTime = 0;
      renderVideo.playbackRate = exportSpeed;

      try {
        await renderVideo.play();
      } catch (pErr) {
        console.warn('Unmuted playback start blocked, falling back to muted render:', pErr);
        renderVideo.muted = true;
        await renderVideo.play();
      }

      const duration = renderVideo.duration || videoRef.current?.duration || 10;

      const renderLoop = () => {
        if (!renderVideo) return;

        if (renderVideo.ended || renderVideo.paused || renderVideo.currentTime >= duration - 0.05) {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        const currentTime = renderVideo.currentTime;
        const progress = Math.min(99, Math.round((currentTime / duration) * 100));
        const remSec = Math.max(0, Math.ceil((duration - currentTime) / exportSpeed));
        setRenderProgress(progress);
        setRenderStatus(`Exporting ${width}x${height} (${exportSpeed}x Speed) — ${progress}% (${remSec}s left)...`);

        // Draw video frame
        ctx.drawImage(renderVideo, 0, 0, width, height);

        // Draw active caption overlay
        const { segment: activeSeg, activeWordIndex } = findCurrentActiveCaption(segments, currentTime);
        if (activeSeg) {
          drawCaptionOnCanvas(ctx, activeSeg, activeWordIndex, currentStyle, width, height);
        }

        requestAnimationFrame(renderLoop);
      };

      requestAnimationFrame(renderLoop);

    } catch (err: any) {
      console.error('Video Render Error:', err);
      setIsRenderingVideo(false);
      if (renderVideo && document.body.contains(renderVideo)) {
        document.body.removeChild(renderVideo);
      }
      if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl);
      alert('Video export error: ' + (err.message || 'Rendering failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Export Subtitles & Video</h2>
              <p className="text-xs text-slate-400">Download video with burned captions or subtitle files</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isRenderingVideo} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Burned-in Video Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-400" />
                  Hardcoded Captioned Video
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Burns viral animated captions permanently onto your video.
                </p>
              </div>

              {downloadReadyUrl ? (
                <a
                  href={downloadReadyUrl}
                  download={exportFilename}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Save Video
                </a>
              ) : (
                <button
                  onClick={handleStartRenderVideo}
                  disabled={isRenderingVideo}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isRenderingVideo ? (
                    <>
                      <Wand2 className="w-4 h-4 animate-spin text-amber-300" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4 fill-white" />
                      Start Export
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Quality & Render Speed Options */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Render Quality:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setExportQuality('original')}
                    disabled={isRenderingVideo}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      exportQuality === 'original'
                        ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Preserve original source resolution with maximum clarity"
                  >
                    Original HD/4K
                  </button>
                  <button
                    onClick={() => setExportQuality('1080p')}
                    disabled={isRenderingVideo}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      exportQuality === '1080p'
                        ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    1080p Full HD
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Export Speed Mode:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setExportSpeed(2.5)}
                    disabled={isRenderingVideo}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      exportSpeed === 2.5
                        ? 'bg-amber-500 text-black shadow-md border border-amber-300 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Render 2.5x faster than real-time video length"
                  >
                    2.5x Fast Render
                  </button>
                  <button
                    onClick={() => setExportSpeed(2.0)}
                    disabled={isRenderingVideo}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      exportSpeed === 2.0
                        ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Render 2.0x faster than real-time video length"
                  >
                    2.0x Fast
                  </button>
                  <button
                    onClick={() => setExportSpeed(1.0)}
                    disabled={isRenderingVideo}
                    className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                      exportSpeed === 1.0
                        ? 'bg-slate-700 text-white shadow-md border border-slate-500'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                    title="Render at 1.0x normal real-time speed"
                  >
                    1.0x Normal
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {isRenderingVideo && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-medium text-indigo-200">
                  <span>{renderStatus}</span>
                  <span className="font-mono font-bold">{renderProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    style={{ width: `${renderProgress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {downloadReadyUrl && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Video export complete! Click "Save Video" to download {exportFilename}.</span>
              </div>
            )}
          </div>

          {/* Subtitle File Exports */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Subtitle Standard Formats
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => downloadFile('captions.srt', generateSrt(segments), 'text/plain')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all cursor-pointer group"
              >
                <span className="font-bold text-xs text-white group-hover:text-indigo-300 block">SubRip (.SRT)</span>
                <span className="text-[10px] text-slate-400">YouTube, Premiere Pro, DaVinci</span>
              </button>

              <button
                onClick={() => downloadFile('captions.vtt', generateVtt(segments), 'text/vtt')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all cursor-pointer group"
              >
                <span className="font-bold text-xs text-white group-hover:text-indigo-300 block">WebVTT (.VTT)</span>
                <span className="text-[10px] text-slate-400">HTML5 Video & Web Players</span>
              </button>

              <button
                onClick={() => downloadFile('captions.json', JSON.stringify(segments, null, 2), 'application/json')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all cursor-pointer group"
              >
                <span className="font-bold text-xs text-white group-hover:text-indigo-300 block">Raw JSON Data</span>
                <span className="text-[10px] text-slate-400">Exact Word Timestamps & Colors</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatePlainTranscript(segments));
                  alert('Transcript copied to clipboard!');
                }}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all cursor-pointer group"
              >
                <span className="font-bold text-xs text-white group-hover:text-indigo-300 block">Copy Transcript</span>
                <span className="text-[10px] text-slate-400">Paste in video description</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas drawing helper for hardcoded video export
function drawCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  segment: CaptionSegment,
  activeWordIdx: number,
  style: CaptionStyle,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!segment || !segment.words || segment.words.length === 0) return;

  const {
    fontFamily,
    fontSize,
    fontWeight,
    textTransform,
    textColor,
    highlightColor,
    strokeColor,
    strokeWidth,
    backgroundColor,
    backgroundPadding = 12,
    borderRadius = 10,
    position,
    verticalOffset,
    animation,
    showEmojis = true,
    activeWordBgColor,
  } = style;

  // Scale font size relative to 400px base width
  const scale = canvasWidth / 400;
  const baseFontSize = Math.round((fontSize || 30) * scale * 0.82);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Determine Y position on canvas
  const offsetValue = verticalOffset !== undefined ? verticalOffset : (position === 'top' ? 12 : position === 'center' ? 50 : 18);
  const vOffsetPct = offsetValue / 100;
  let posY = canvasHeight * (1 - vOffsetPct);
  if (position === 'top') {
    posY = canvasHeight * vOffsetPct;
  } else if (position === 'center') {
    posY = canvasHeight * vOffsetPct;
  }

  // Build words array
  const wordsToDraw = segment.words.map((w, idx) => {
    let rawText = w.word + (showEmojis && w.emoji ? ` ${w.emoji}` : '');
    if (textTransform === 'uppercase') rawText = rawText.toUpperCase();
    else if (textTransform === 'lowercase') rawText = rawText.toLowerCase();

    const isActive = activeWordIdx === idx;
    let color = textColor || '#FFFFFF';
    if (isActive) {
      color = highlightColor || '#FFE600';
    } else if (w.isHighlight) {
      color = w.highlightColor || highlightColor || '#FFE600';
    }

    const isPopOrBounce = isActive && (animation === 'pop' || animation === 'bounce');
    const wordFontSize = isPopOrBounce ? Math.round(baseFontSize * 1.18) : baseFontSize;

    return {
      text: rawText,
      color,
      isActive,
      isHighlight: w.isHighlight,
      fontSize: wordFontSize,
      originalWord: w,
    };
  });

  // Calculate widths
  let totalWidth = 0;
  const wordWidths: number[] = [];
  const fontWeightCss = fontWeight === 'black' ? '900' : fontWeight === 'bold' ? '700' : '600';
  ctx.font = `${fontWeightCss} ${baseFontSize}px ${fontFamily || 'sans-serif'}`;
  const spaceWidth = ctx.measureText(' ').width * 1.35;

  wordsToDraw.forEach((w) => {
    ctx.font = `${fontWeightCss} ${w.fontSize}px ${fontFamily || 'sans-serif'}`;
    const wWidth = ctx.measureText(w.text).width;
    wordWidths.push(wWidth);
    totalWidth += wWidth;
  });

  if (wordsToDraw.length > 1) {
    totalWidth += (wordsToDraw.length - 1) * spaceWidth;
  }

  // Scale down if total width exceeds canvas margins (auto-fitting long sentences)
  const maxAllowableWidth = canvasWidth * 0.88;
  let fontScaleFactor = 1.0;
  if (totalWidth > maxAllowableWidth) {
    fontScaleFactor = maxAllowableWidth / totalWidth;
    totalWidth = maxAllowableWidth;
  }

  const startX = (canvasWidth - totalWidth) / 2;

  // Background container box if specified
  if (backgroundColor && backgroundColor !== 'transparent') {
    const padX = (backgroundPadding || 12) * scale;
    const padY = (backgroundPadding || 8) * scale * 0.7;
    const boxWidth = totalWidth + padX * 2;
    const boxHeight = baseFontSize * fontScaleFactor * 1.55 + padY * 2;
    const boxX = startX - padX;
    const boxY = posY - boxHeight / 2;

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(boxX, boxY, boxWidth, boxHeight, (borderRadius || 10) * scale);
    } else {
      ctx.rect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fill();
  }

  // Draw each word
  let currentX = startX;
  wordsToDraw.forEach((w, idx) => {
    const effectiveFontSize = Math.round(w.fontSize * fontScaleFactor);
    ctx.font = `${fontWeightCss} ${effectiveFontSize}px ${fontFamily || 'sans-serif'}`;
    const wWidth = wordWidths[idx] * fontScaleFactor;

    // Active word highlight box animation
    if (w.isActive && animation === 'highlight') {
      const hPadX = 6 * scale;
      const hPadY = 4 * scale;
      const hX = currentX - hPadX;
      const hY = posY - effectiveFontSize / 2 - hPadY;
      const hW = wWidth + hPadX * 2;
      const hH = effectiveFontSize + hPadY * 2;

      ctx.fillStyle = activeWordBgColor || highlightColor || '#FFE600';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(hX, hY, hW, hH, 6 * scale);
      } else {
        ctx.rect(hX, hY, hW, hH);
      }
      ctx.fill();
    }

    // Stroke / Outline
    if (strokeWidth && strokeWidth > 0 && !(w.isActive && animation === 'highlight')) {
      ctx.strokeStyle = strokeColor || '#000000';
      ctx.lineWidth = strokeWidth * scale * fontScaleFactor;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(w.text, currentX, posY);
    }

    // Shadow
    if (style.shadowBlur && style.shadowBlur > 0 && !(w.isActive && animation === 'highlight')) {
      ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = style.shadowBlur * scale * fontScaleFactor;
      ctx.shadowOffsetY = 2 * scale;
    } else {
      ctx.shadowColor = 'transparent';
    }

    // Fill Text
    if (w.isActive && animation === 'highlight') {
      ctx.fillStyle = activeWordBgColor || highlightColor ? '#000000' : '#FFFFFF';
    } else {
      ctx.fillStyle = w.color;
    }
    ctx.fillText(w.text, currentX, posY);

    currentX += wWidth + spaceWidth * fontScaleFactor;
  });

  ctx.restore();
}

