import { enUS, tr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// date-fns Locale object matching the active i18n language, for
// formatDistanceToNow/format calls that need localized month/unit names.
export function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? enUS : tr;
}
