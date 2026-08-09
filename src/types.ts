export interface CaptionWord {
  id: string;
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  isHighlight?: boolean;
  highlightColor?: string;
  emoji?: string;
}

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  words: CaptionWord[];
  speaker?: string;
}

export interface CaptionStyle {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  fontSize: number; // px
  fontWeight: string;
  textTransform: 'uppercase' | 'capitalize' | 'lowercase' | 'none';
  textColor: string;
  highlightColor: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
  backgroundPadding: number;
  borderRadius: number;
  shadowColor: string;
  shadowBlur: number;
  position: 'top' | 'center' | 'bottom';
  verticalOffset: number; // percentage from top/bottom
  wordsPerChunk: number; // 1 to 5
  animation: 'pop' | 'bounce' | 'highlight' | 'slide' | 'fade' | 'none';
  showEmojis: boolean;
  activeWordBgColor?: string;
}

export interface TranscriptionOptions {
  language: string;
  removeFillerWords: boolean;
  correctGrammar: boolean;
  autoHighlightKeywords: boolean;
  autoAddEmojis: boolean;
  wordsPerChunk: number;
}

export interface VideoSample {
  id: string;
  title: string;
  duration: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  videoUrl: string;
  thumbnail: string;
  description: string;
  category: string;
  defaultCaptions: CaptionSegment[];
}

export interface ProcessingState {
  status: 'idle' | 'extracting_audio' | 'transcribing' | 'enhancing' | 'splitting' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}
