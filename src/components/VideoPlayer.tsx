import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Smartphone, Monitor, Square, Layers, Sparkles, Clock, MoveVertical, Move } from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types';
import { CaptionOverlay } from './CaptionOverlay';
import { findCurrentActiveCaption, formatTimestamp } from '../utils/captionUtils';

import { DEFAULT_STYLE_PRESETS } from '../data/stylePresets';

interface VideoPlayerProps {
  videoUrl: string;
  segments: CaptionSegment[];
  currentStyle: CaptionStyle;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1' | '4:5') => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSelectStyle?: (style: CaptionStyle) => void;
  onUpdateStyle?: (updated: Partial<CaptionStyle>) => void;
  syncOffset?: number;
  setSyncOffset?: (offset: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  segments,
  currentStyle,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  aspectRatio,
  setAspectRatio,
  videoRef,
  onSelectStyle,
  onUpdateStyle,
  syncOffset = 0,
  setSyncOffset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Sync video play/pause with prop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, videoRef, setIsPlaying]);

  // Smooth 60 FPS time sync loop for micro-second audio-caption alignment
  useEffect(() => {
    let animId: number;
    const syncTimeLoop = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        animId = requestAnimationFrame(syncTimeLoop);
      }
    };

    if (isPlaying) {
      animId = requestAnimationFrame(syncTimeLoop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, videoRef, setCurrentTime]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, videoRef]);

  // Handle time update fallback
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Find active segment & word index for overlay with syncOffset
  const { segment: currentSegment, activeWordIndex } = findCurrentActiveCaption(segments, currentTime, syncOffset);

  // Aspect ratio container styles
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[340px] md:max-w-[380px]';
      case '16:9':
        return 'aspect-[16/9] max-w-[680px]';
      case '1:1':
        return 'aspect-square max-w-[420px]';
      case '4:5':
        return 'aspect-[4/5] max-w-[380px]';
      default:
        return 'aspect-[9/16] max-w-[360px]';
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Aspect Ratio Selector Bar */}
      <div className="flex items-center justify-between w-full mb-3 px-1 text-xs text-zinc-300">
        <span className="font-medium text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#84cc16]" />
          Aspect Ratio
        </span>
        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="TikTok / Shorts (9:16)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>

          <button
            onClick={() => setAspectRatio('16:9')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="YouTube / TV (16:9)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>

          <button
            onClick={() => setAspectRatio('1:1')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-zinc-800 text-white font-medium border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Square Post (1:1)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>
      </div>

      {/* Main Video Frame & Caption Stage */}
      <div
        ref={containerRef}
        className={`relative w-full ${getAspectRatioClasses()} bg-zinc-950 rounded-2xl overflow-hidden shadow-lg border border-zinc-800 group transition-all duration-300 flex items-center justify-center`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
          playsInline
        />

        {/* Caption Overlay with Drag support */}
        <CaptionOverlay
          currentSegment={currentSegment}
          activeWordIndex={activeWordIndex}
          style={currentStyle}
          onUpdateStyle={onUpdateStyle}
        />

        {/* Play/Pause Watermark / Overlay trigger when paused */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-all hover:bg-black/30 z-20"
          >
            <div className="w-14 h-14 rounded-full bg-[#84cc16] text-zinc-950 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-105">
              <Play className="w-7 h-7 ml-1 fill-zinc-950 stroke-zinc-950" />
            </div>
          </div>
        )}

        {/* Live Caption Indicator Badge */}
        {currentSegment && isPlaying && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-medium text-[#84cc16]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-ping" />
            Caption Sync {syncOffset !== 0 ? `(${syncOffset > 0 ? `+${syncOffset.toFixed(2)}s` : `${syncOffset.toFixed(2)}s`})` : ''}
          </div>
        )}
      </div>

      {/* Video Control Bar */}
      <div className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 mt-3 shadow-sm flex flex-col gap-2.5">
        {/* Scrubber Slider */}
        <div className="relative flex items-center group/scrub">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#84cc16] hover:bg-zinc-700 transition-all"
          />
          {/* Active caption segment markers on timeline */}
          {duration > 0 &&
            segments.map((seg) => (
              <div
                key={seg.id}
                style={{
                  left: `${(seg.start / duration) * 100}%`,
                  width: `${Math.max(0.5, ((seg.end - seg.start) / duration) * 100)}%`,
                }}
                className="absolute top-0 bottom-0 bg-[#84cc16]/50 rounded-sm pointer-events-none border-l border-r border-[#84cc16]"
              />
            ))}
        </div>

        {/* Time, Speed, Volume Controls */}
        <div className="flex items-center justify-between text-zinc-300 text-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-[#84cc16] hover:bg-[#73b610] text-zinc-950 font-bold transition-all cursor-pointer shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-zinc-950 stroke-zinc-950" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setCurrentTime(0);
              }}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Restart Video"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="font-mono text-zinc-300 font-medium text-[11px]">
              {formatTimestamp(currentTime, 'display')} / {formatTimestamp(duration, 'display')}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-zinc-900 text-zinc-200 rounded-md px-2 py-0.5 text-[11px] font-medium border border-zinc-800 focus:outline-none cursor-pointer"
            >
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-all cursor-pointer">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded appearance-none accent-[#84cc16] cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Sync Nudge & Position Control Bar */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2">
          {/* Top row: Sync Nudge */}
          {setSyncOffset && (
            <div className="flex items-center justify-between gap-2 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#84cc16]" />
                <span>Audio Sync Nudge:</span>
                <span className="font-mono text-[11px] text-[#84cc16] font-bold">
                  {syncOffset === 0 ? '0.00s (Synced)' : syncOffset > 0 ? `+${syncOffset.toFixed(2)}s Delay` : `${syncOffset.toFixed(2)}s Advance`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {[-0.5, -0.2, 0, 0.2, 0.5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSyncOffset(val === 0 ? 0 : Number((syncOffset + val).toFixed(2)))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer border ${
                      val === 0
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                        : val < 0
                        ? 'bg-amber-950/50 text-amber-300 border-amber-800/60 hover:bg-amber-900'
                        : 'bg-indigo-950/50 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900'
                    }`}
                  >
                    {val === 0 ? 'Reset' : val > 0 ? `+${val}s` : `${val}s`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Position Row */}
          {onUpdateStyle && (
            <div className="flex items-center justify-between gap-2 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800 text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 font-medium shrink-0">
                <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                <span>Position:</span>
              </div>

              <div className="flex items-center gap-1">
                {(['top', 'center', 'bottom'] as const).map((pos) => {
                  const active = currentStyle.position === pos;
                  const targetOffset = pos === 'top' ? 15 : pos === 'center' ? 50 : 80;
                  return (
                    <button
                      key={pos}
                      onClick={() => onUpdateStyle({ position: pos, verticalOffset: targetOffset })}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#84cc16] text-zinc-950 border-[#84cc16]'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 ml-auto text-[10px] text-zinc-400">
                <Move className="w-3 h-3 text-lime-400 animate-pulse" />
                <span>Tip: Drag text directly on video!</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Caption Style Template Carousel Bar */}
        {onSelectStyle && (
          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#84cc16]" />
                Preset Templates
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">{currentStyle.name}</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {DEFAULT_STYLE_PRESETS.map((preset) => {
                const isActive = currentStyle.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectStyle(preset)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: preset.highlightColor || preset.textColor }}
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
