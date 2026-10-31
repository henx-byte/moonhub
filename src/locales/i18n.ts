import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import id from './id.json';
import en from './en.json';

const resources = {
  id: { translation: id },
  en: { translation: en },
};

const deviceLang = Localization.getLocales()[0]?.languageCode?.startsWith('id') ? 'id' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;