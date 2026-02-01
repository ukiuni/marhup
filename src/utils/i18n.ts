import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect system language
const detectLanguage = (): string => {
  const lang = process.env.LANG || process.env.LANGUAGE || 'en';
  // Extract language code (e.g., 'en_US.UTF-8' -> 'en')
  const languageCode = lang.split('_')[0].split('-')[0];
  // Support only 'en' and 'ja', fallback to 'en'
  return ['en', 'ja'].includes(languageCode) ? languageCode : 'en';
};

// Initialize i18next
export const initI18n = async (language?: string) => {
  const detectedLang = language || detectLanguage();
  await i18next
    .use(Backend)
    .init({
      lng: detectedLang,
      fallbackLng: 'en',
      ns: ['translation'],
      defaultNS: 'translation',
      backend: {
        loadPath: path.join(__dirname, '../../locales/{{lng}}.json'),
      },
      interpolation: {
        escapeValue: false, // Not needed for console output
      },
    });
};

// Get translation function
export const t = (key: string, options?: any): string => i18next.t(key, options) as string;

// Change language
export const changeLanguage = async (language: string) => {
  await i18next.changeLanguage(language);
};

// Get current language
export const getCurrentLanguage = () => i18next.language;