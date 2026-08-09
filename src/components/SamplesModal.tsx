import React from 'react';
import { X, PlayCircle, Sparkles, Check } from 'lucide-react';
import { VideoSample } from '../types';
import { SAMPLE_VIDEOS } from '../data/sampleVideos';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: VideoSample) => void;
  currentSampleId?: string;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
  currentSampleId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">Choose a Sample Video</h2>
              <p className="text-xs text-slate-400">Try instant auto captions with high quality sample clips</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_VIDEOS.map((sample) => {
            const isSelected = currentSampleId === sample.id;
            return (
              <div
                key={sample.id}
                onClick={() => {
                  onSelectSample(sample);
                  onClose();
                }}
                className={`group cursor-pointer rounded-xl border overflow-hidden transition-all p-3 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-slate-950">
                  <img
                    src={sample.thumbnail}
                    alt={sample.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center group-hover:bg-slate-950/10 transition-all">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg">
                      <PlayCircle className="w-6 h-6 fill-white" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-white">
                    {sample.duration}s
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {sample.category}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white">{sample.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sample.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
