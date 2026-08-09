import React from 'react';
import { Sparkles, Upload, Download, PlayCircle } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  onOpenExport: () => void;
  currentVideoName?: string;
  segmentCount: number;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenSamples,
  onOpenExport,
  currentVideoName,
  segmentCount,
  isProcessing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800 text-white px-4 sm:px-6 h-14 flex items-center shadow-sm">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 bg-[#84cc16] rounded-lg flex items-center justify-center text-zinc-950 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 fill-zinc-950 stroke-zinc-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white hover:text-[#84cc16] transition-colors">
                CaptionFlow <span className="text-[#84cc16]">AI</span>
              </h1>
            </div>
          </div>
          {currentVideoName && (
            <span className="hidden md:inline-block text-xs text-zinc-400 pl-3 border-l border-zinc-800 truncate max-w-[220px]">
              {currentVideoName} ({segmentCount} captions)
            </span>
          )}
        </div>

        {/* Center Minimal Status */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-900 rounded-full border border-zinc-800 text-[11px] font-medium text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse" />
          <span>Caption Studio</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSamples}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all cursor-pointer"
            title="Try sample videos"
          >
            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Samples</span>
          </button>

          <button
            onClick={onOpenUpload}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#84cc16]" />
            <span>Upload</span>
          </button>

          <button
            onClick={onOpenExport}
            disabled={segmentCount === 0}
            className="px-3.5 py-1.5 bg-[#84cc16] hover:bg-[#73b610] text-zinc-950 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};


