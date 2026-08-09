import { VideoSample } from '../types';

export const SAMPLE_VIDEOS: VideoSample[] = [
  {
    id: 'sample-tech-pitch',
    title: 'Startup Pitch & AI Secret',
    duration: 12.5,
    aspectRatio: '9:16',
    category: 'Business & Tech',
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Energetic founder explaining the secret to building high-converting video content in under 60 seconds.',
    defaultCaptions: [
      {
        id: 'seg-1',
        start: 0.2,
        end: 2.1,
        text: 'The secret to viral short videos',
        words: [
          { id: 'w-1', word: 'The', start: 0.2, end: 0.4 },
          { id: 'w-2', word: 'secret', start: 0.4, end: 0.8, isHighlight: true, highlightColor: '#FFE600', emoji: '🔑' },
          { id: 'w-3', word: 'to', start: 0.8, end: 1.0 },
          { id: 'w-4', word: 'viral', start: 1.0, end: 1.4, isHighlight: true, highlightColor: '#EF4444', emoji: '🔥' },
          { id: 'w-5', word: 'short', start: 1.4, end: 1.7 },
          { id: 'w-6', word: 'videos', start: 1.7, end: 2.1, emoji: '📹' }
        ]
      },
      {
        id: 'seg-2',
        start: 2.2,
        end: 4.5,
        text: 'is capturing attention in the first 2 seconds!',
        words: [
          { id: 'w-7', word: 'is', start: 2.2, end: 2.4 },
          { id: 'w-8', word: 'capturing', start: 2.4, end: 2.9, isHighlight: true, highlightColor: '#FFE600', emoji: '🎯' },
          { id: 'w-9', word: 'attention', start: 2.9, end: 3.4, isHighlight: true, highlightColor: '#FFE600' },
          { id: 'w-10', word: 'in', start: 3.4, end: 3.6 },
          { id: 'w-11', word: 'the', start: 3.6, end: 3.8 },
          { id: 'w-12', word: 'first', start: 3.8, end: 4.0 },
          { id: 'w-13', word: '2', start: 4.0, end: 4.2, isHighlight: true, highlightColor: '#10B981', emoji: '⚡' },
          { id: 'w-14', word: 'seconds!', start: 4.2, end: 4.5 }
        ]
      },
      {
        id: 'seg-3',
        start: 4.6,
        end: 7.2,
        text: 'Dynamic animated captions keep 85% of viewers watching until the end.',
        words: [
          { id: 'w-15', word: 'Dynamic', start: 4.6, end: 5.0, isHighlight: true, highlightColor: '#FFE600' },
          { id: 'w-16', word: 'animated', start: 5.0, end: 5.4, emoji: '✨' },
          { id: 'w-17', word: 'captions', start: 5.4, end: 5.8 },
          { id: 'w-18', word: 'keep', start: 5.8, end: 6.1 },
          { id: 'w-19', word: '85%', start: 6.1, end: 6.5, isHighlight: true, highlightColor: '#10B981', emoji: '📈' },
          { id: 'w-20', word: 'of', start: 6.5, end: 6.6 },
          { id: 'w-21', word: 'viewers', start: 6.6, end: 6.9 },
          { id: 'w-22', word: 'watching', start: 6.9, end: 7.2 }
        ]
      },
      {
        id: 'seg-4',
        start: 7.3,
        end: 10.0,
        text: 'Stop wasting hours on manual editing. Let AI generate it in seconds!',
        words: [
          { id: 'w-23', word: 'Stop', start: 7.3, end: 7.6, isHighlight: true, highlightColor: '#EF4444', emoji: '🛑' },
          { id: 'w-24', word: 'wasting', start: 7.6, end: 8.0 },
          { id: 'w-25', word: 'hours', start: 8.0, end: 8.3 },
          { id: 'w-26', word: 'on', start: 8.3, end: 8.5 },
          { id: 'w-27', word: 'manual', start: 8.5, end: 8.9 },
          { id: 'w-28', word: 'editing.', start: 8.9, end: 9.2 },
          { id: 'w-29', word: 'Let', start: 9.3, end: 9.5 },
          { id: 'w-30', word: 'AI', start: 9.5, end: 9.7, isHighlight: true, highlightColor: '#06B6D4', emoji: '🤖' },
          { id: 'w-31', word: 'generate', start: 9.7, end: 10.0, isHighlight: true, highlightColor: '#FFE600', emoji: '🚀' }
        ]
      }
    ]
  },
  {
    id: 'sample-fitness-tip',
    title: 'Daily Productivity & Focus Routine',
    duration: 10.0,
    aspectRatio: '9:16',
    category: 'Lifestyle & Habits',
    thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: '3 quick habit hacks to double your daily output without burnout.',
    defaultCaptions: [
      {
        id: 'seg-101',
        start: 0.3,
        end: 2.8,
        text: 'Three habits that changed my morning routine forever.',
        words: [
          { id: 'w-101', word: 'Three', start: 0.3, end: 0.6, isHighlight: true, highlightColor: '#10B981', emoji: '3️⃣' },
          { id: 'w-102', word: 'habits', start: 0.6, end: 1.0, isHighlight: true, highlightColor: '#FFE600' },
          { id: 'w-103', word: 'that', start: 1.0, end: 1.2 },
          { id: 'w-104', word: 'changed', start: 1.2, end: 1.6 },
          { id: 'w-105', word: 'my', start: 1.6, end: 1.8 },
          { id: 'w-106', word: 'morning', start: 1.8, end: 2.2, emoji: '🌅' },
          { id: 'w-107', word: 'routine', start: 2.2, end: 2.5 },
          { id: 'w-108', word: 'forever.', start: 2.5, end: 2.8 }
        ]
      },
      {
        id: 'seg-102',
        start: 2.9,
        end: 5.5,
        text: 'First, hydrate before touching your smartphone.',
        words: [
          { id: 'w-109', word: 'First,', start: 2.9, end: 3.3, isHighlight: true, highlightColor: '#FFE600', emoji: '1️⃣' },
          { id: 'w-110', word: 'hydrate', start: 3.3, end: 3.8, isHighlight: true, highlightColor: '#06B6D4', emoji: '💧' },
          { id: 'w-111', word: 'before', start: 3.8, end: 4.1 },
          { id: 'w-112', word: 'touching', start: 4.1, end: 4.6 },
          { id: 'w-113', word: 'your', start: 4.6, end: 4.8 },
          { id: 'w-114', word: 'smartphone.', start: 4.8, end: 5.5, emoji: '📱' }
        ]
      },
      {
        id: 'seg-103',
        start: 5.6,
        end: 8.8,
        text: 'Second, tackle your hardest task before 10 AM.',
        words: [
          { id: 'w-115', word: 'Second,', start: 5.6, end: 6.0, isHighlight: true, highlightColor: '#FFE600', emoji: '2️⃣' },
          { id: 'w-116', word: 'tackle', start: 6.0, end: 6.5, isHighlight: true, highlightColor: '#EF4444', emoji: '🎯' },
          { id: 'w-117', word: 'your', start: 6.5, end: 6.7 },
          { id: 'w-118', word: 'hardest', start: 6.7, end: 7.2, isHighlight: true, highlightColor: '#FFE600' },
          { id: 'w-119', word: 'task', start: 7.2, end: 7.6 },
          { id: 'w-120', word: 'before', start: 7.6, end: 8.0 },
          { id: 'w-121', word: '10', start: 8.0, end: 8.4, isHighlight: true, highlightColor: '#10B981', emoji: '⏰' },
          { id: 'w-122', word: 'AM.', start: 8.4, end: 8.8 }
        ]
      }
    ]
  },
  {
    id: 'sample-tenglish-reel',
    title: 'Telugu & Tenglish Creator Hook',
    duration: 9.5,
    aspectRatio: '9:16',
    category: 'Regional Content & Shorts',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    description: 'Viral Tenglish (Telugu in English script) caption template for Instagram Reels & YouTube Shorts.',
    defaultCaptions: [
      {
        id: 'seg-t1',
        start: 0.2,
        end: 2.5,
        text: 'Namaste friends! Eeroju viral reel secret',
        words: [
          { id: 'wt-1', word: 'Namaste', start: 0.2, end: 0.6, isHighlight: true, highlightColor: '#FFE600', emoji: '🙏' },
          { id: 'wt-2', word: 'friends!', start: 0.6, end: 1.0, emoji: '👋' },
          { id: 'wt-3', word: 'Eeroju', start: 1.0, end: 1.4 },
          { id: 'wt-4', word: 'viral', start: 1.4, end: 1.8, isHighlight: true, highlightColor: '#EF4444', emoji: '🔥' },
          { id: 'wt-5', word: 'reel', start: 1.8, end: 2.1, emoji: '📹' },
          { id: 'wt-6', word: 'secret', start: 2.1, end: 2.5, isHighlight: true, highlightColor: '#FFE600', emoji: '🔑' }
        ]
      },
      {
        id: 'seg-t2',
        start: 2.6,
        end: 5.2,
        text: 'AI auto captions tho mee video fast ga trend avthundhi!',
        words: [
          { id: 'wt-7', word: 'AI', start: 2.6, end: 2.9, isHighlight: true, highlightColor: '#06B6D4', emoji: '🤖' },
          { id: 'wt-8', word: 'auto', start: 2.9, end: 3.2 },
          { id: 'wt-9', word: 'captions', start: 3.2, end: 3.6, isHighlight: true, highlightColor: '#FFE600', emoji: '💬' },
          { id: 'wt-10', word: 'tho', start: 3.6, end: 3.8 },
          { id: 'wt-11', word: 'mee', start: 3.8, end: 4.1 },
          { id: 'wt-12', word: 'video', start: 4.1, end: 4.4 },
          { id: 'wt-13', word: 'fast', start: 4.4, end: 4.7, isHighlight: true, highlightColor: '#10B981', emoji: '⚡' },
          { id: 'wt-14', word: 'ga', start: 4.7, end: 4.9 },
          { id: 'wt-15', word: 'trend', start: 4.9, end: 5.2, isHighlight: true, highlightColor: '#EF4444', emoji: '🚀' }
        ]
      },
      {
        id: 'seg-t3',
        start: 5.3,
        end: 8.5,
        text: 'Telugu mariyu Tenglish captions okke click lo ready!',
        words: [
          { id: 'wt-16', word: 'Telugu', start: 5.3, end: 5.7, isHighlight: true, highlightColor: '#10B981', emoji: '✨' },
          { id: 'wt-17', word: 'mariyu', start: 5.7, end: 6.1 },
          { id: 'wt-18', word: 'Tenglish', start: 6.1, end: 6.6, isHighlight: true, highlightColor: '#FFE600' },
          { id: 'wt-19', word: 'captions', start: 6.6, end: 7.0 },
          { id: 'wt-20', word: 'okke', start: 7.0, end: 7.3 },
          { id: 'wt-21', word: 'click', start: 7.3, end: 7.7, isHighlight: true, highlightColor: '#06B6D4', emoji: '👆' },
          { id: 'wt-22', word: 'lo', start: 7.7, end: 8.0 },
          { id: 'wt-23', word: 'ready!', start: 8.0, end: 8.5, emoji: '🎉' }
        ]
      }
    ]
  }
];
