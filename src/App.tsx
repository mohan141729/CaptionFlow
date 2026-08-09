import React, { useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { EditorPanel } from './components/EditorPanel';
import { UploadModal } from './components/UploadModal';
import { SamplesModal } from './components/SamplesModal';
import { ExportModal } from './components/ExportModal';
import { CaptionSegment, CaptionStyle, VideoSample, TranscriptionOptions } from './types';
import { DEFAULT_STYLE_PRESETS } from './data/stylePresets';
import { SAMPLE_VIDEOS } from './data/sampleVideos';
import { extractAudioFromVideoFile, shiftAllTimestamps, scaleAllTimestamps } from './utils/captionUtils';

export default function App() {
  // Video & Caption State
  const defaultSample = SAMPLE_VIDEOS[0];
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(defaultSample.videoUrl);
  const [currentVideoName, setCurrentVideoName] = useState<string>(defaultSample.title);
  const [currentSampleId, setCurrentSampleId] = useState<string | undefined>(defaultSample.id);
  const [segments, setSegments] = useState<CaptionSegment[]>(defaultSample.defaultCaptions);
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(DEFAULT_STYLE_PRESETS[0]);

  // Video playback
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [syncOffset, setSyncOffset] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Processing & AI
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');

  // Handle uploading video file
  const handleUploadVideo = async (file: File, options: TranscriptionOptions) => {
    setIsProcessing(true);
    setProcessingMsg('Extracting audio stream from video...');

    try {
      // Create local object URL for preview
      const localVideoUrl = URL.createObjectURL(file);
      setCurrentVideoUrl(localVideoUrl);
      setCurrentVideoName(file.name);
      setCurrentSampleId(undefined);

      let audioBase64 = '';
      let mimeType = 'audio/wav';

      // 1. Attempt server-side audio extraction with ffmpeg via /extract-audio
      try {
        setProcessingMsg('Processing audio stream with server FFmpeg...');
        const formData = new FormData();
        formData.append('video', file);
        const extractRes = await fetch('/extract-audio', {
          method: 'POST',
          body: formData,
        });
        const extractData = await extractRes.json();
        if (extractData.success && extractData.audioBase64) {
          audioBase64 = extractData.audioBase64;
          mimeType = extractData.mimeType || 'audio/wav';
        }
      } catch (e) {
        console.warn('Server audio extraction failed, falling back to browser AudioContext:', e);
      }

      // 2. Fallback to browser AudioContext if server extraction returned empty
      if (!audioBase64) {
        setProcessingMsg('Decoding audio track in browser memory...');
        const extracted = await extractAudioFromVideoFile(file);
        audioBase64 = extracted.audioBase64;
        mimeType = extracted.mimeType;
      }

      setProcessingMsg('Sending audio stream to Gemini 3.6 Flash AI...');

      // Call Express server API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioBase64,
          mimeType,
          options,
        }),
      });

      const data = await response.json();

      if (data.success && data.segments) {
        setSegments(data.segments);
        setIsUploadOpen(false);
      } else {
        throw new Error(data.error || 'Failed to transcribe video');
      }
    } catch (err: any) {
      console.error('Video Upload Processing Error:', err);
      alert('AI Transcription Error: ' + (err.message || 'Check audio file and server connection'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle transcribing text script prompt
  const handleTranscribeTextScript = async (script: string, options: TranscriptionOptions) => {
    setIsProcessing(true);
    setProcessingMsg('Gemini AI generating word timestamps and captions...');

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textPrompt: script,
          options,
        }),
      });

      const data = await response.json();

      if (data.success && data.segments) {
        setSegments(data.segments);
        setIsUploadOpen(false);
      } else {
        throw new Error(data.error || 'Failed to generate captions');
      }
    } catch (err: any) {
      console.error('Text Script AI Error:', err);
      alert('AI Generation Error: ' + (err.message || 'Failed to generate captions'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle selecting a sample video
  const handleSelectSample = (sample: VideoSample) => {
    setCurrentVideoUrl(sample.videoUrl);
    setCurrentVideoName(sample.title);
    setCurrentSampleId(sample.id);
    setSegments(sample.defaultCaptions);
    setAspectRatio(sample.aspectRatio || '9:16');
    setSyncOffset(0);
    setCurrentTime(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Handle AI magic polish action
  const handleAiEnhance = async (action: string, options?: any) => {
    setIsProcessing(true);
    setProcessingMsg('Gemini AI polishing captions...');

    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          action,
          options,
        }),
      });

      const data = await response.json();

      if (data.success && data.segments) {
        setSegments(data.segments);
      } else {
        throw new Error(data.error || 'Failed to enhance captions');
      }
    } catch (err: any) {
      console.error('AI Enhance Error:', err);
      alert('AI Polish Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Seek handler from editor or scrubber
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-[#84cc16] selection:text-black relative overflow-x-hidden">
      {/* Background Accent */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#09090b] to-[#09090b] pointer-events-none z-0" />

      {/* Top Navbar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSamples={() => setIsSamplesOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        currentVideoName={currentVideoName}
        segmentCount={segments.length}
        isProcessing={isProcessing}
      />

      {/* Main Workspace Grid */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Video Stage */}
        <section className="lg:col-span-5 flex flex-col items-center">
          <VideoPlayer
            videoUrl={currentVideoUrl}
            segments={segments}
            currentStyle={currentStyle}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            videoRef={videoRef}
            onSelectStyle={setCurrentStyle}
            onUpdateStyle={(updated) => setCurrentStyle((prev) => ({ ...prev, ...updated }))}
            syncOffset={syncOffset}
            setSyncOffset={setSyncOffset}
          />
        </section>

        {/* Right Column: Comprehensive Caption & Style Editor Panel */}
        <section className="lg:col-span-7 w-full">
          <EditorPanel
            segments={segments}
            setSegments={setSegments}
            currentStyle={currentStyle}
            setCurrentStyle={setCurrentStyle}
            currentTime={currentTime}
            onSeek={handleSeek}
            onAiEnhance={handleAiEnhance}
            isAiProcessing={isProcessing}
            onOpenExport={() => setIsExportOpen(true)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 h-10 border-t border-zinc-800/80 bg-[#09090b] px-6 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] inline-block" />
            Gemini AI Core Active
          </span>
          <span className="hidden sm:inline">48kHz Audio Stream</span>
          <span className="hidden sm:inline">Word Timestamps Ready</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="text-[#84cc16]">CaptionFlow Studio</span>
          <span className="w-1 h-1 bg-zinc-700 rounded-full" />
          <span>v2.5.0</span>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadVideo={handleUploadVideo}
        onTranscribeTextScript={handleTranscribeTextScript}
        isProcessing={isProcessing}
        processingMsg={processingMsg}
      />

      <SamplesModal
        isOpen={isSamplesOpen}
        onClose={() => setIsSamplesOpen(false)}
        onSelectSample={handleSelectSample}
        currentSampleId={currentSampleId}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        segments={segments}
        currentStyle={currentStyle}
        videoRef={videoRef}
        videoUrl={currentVideoUrl}
      />
    </div>
  );
}

