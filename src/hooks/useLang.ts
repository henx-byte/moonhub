import { useTranslation } from 'react-i18next';
import id from '@/locales/id.json';
import en from '@/locales/en.json';

// Hook biar bisa pake lang.play kayak yang lu mau Mon! lang.common.play
export const useLang = () => {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith('id') ? id : en;
  
  return {
    ...current,
    t,
    i18n,
    setLang: (lang: 'id' | 'en') => i18n.changeLanguage(lang),
    currentLang: i18n.language,
  };
};