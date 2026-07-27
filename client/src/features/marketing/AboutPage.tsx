import { useTranslation } from 'react-i18next';
import { LegalTitle, LegalSection, DemoDisclaimer } from './LegalProse';

const CONTACT_EMAIL = 'ilhan.kazan3664@gmail.com';

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <article>
      <LegalTitle title={t('legal.about.title')} />

      <DemoDisclaimer />

      <LegalSection title={t('legal.about.whatIsTitle')}>
        <p>{t('legal.about.whatIsP1')}</p>
        <p>{t('legal.about.whatIsP2')}</p>
      </LegalSection>

      <LegalSection title={t('legal.about.contactTitle')}>
        <p>
          {t('legal.about.contactText')}{' '}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </LegalSection>
    </article>
  );
}
