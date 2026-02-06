
export enum FontFamily {
  SANS = 'Inter',
  SERIF = 'Lora',
  MONO = 'JetBrains Mono'
}

export interface NoteLine {
  id: string;
  original: string;
  translation: string;
  isTranslating: boolean;
}

export interface EditorSettings {
  fontFamily: FontFamily;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  sourceLang: string;
  targetLang: string;
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' }
];
