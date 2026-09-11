export const languages = [
  { code: 'en-IN', label: 'English' }, { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'mr-IN', label: 'मराठी' }, { code: 'ur-IN', label: 'اردو' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' }, { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ta-IN', label: 'தமிழ்' }, { code: 'te-IN', label: 'తెలుగు' },
] as const;
export const LANGUAGE_STORAGE_KEY = 'aarogyavaani_language';
export function selectedSpeechLanguage() { return typeof window === 'undefined' ? 'en-IN' : localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en-IN'; }
