export const languages = [
  { code: 'en-IN', label: 'English', direction: 'ltr' }, { code: 'hi-IN', label: 'हिन्दी', direction: 'ltr' },
  { code: 'mr-IN', label: 'मराठी', direction: 'ltr' }, { code: 'ur-IN', label: 'اردو', direction: 'rtl' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ', direction: 'ltr' }, { code: 'kn-IN', label: 'ಕನ್ನಡ', direction: 'ltr' },
  { code: 'ta-IN', label: 'தமிழ்', direction: 'ltr' }, { code: 'te-IN', label: 'తెలుగు', direction: 'ltr' },
] as const;
export const LANGUAGE_STORAGE_KEY = 'aarogyavaani_language';
export function selectedSpeechLanguage() { return typeof window === 'undefined' ? 'en-IN' : localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en-IN'; }
