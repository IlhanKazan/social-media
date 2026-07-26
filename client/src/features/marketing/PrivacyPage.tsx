import { useTranslation } from 'react-i18next';
import { LegalTitle, LegalSection, LegalList, DemoDisclaimer } from './LegalProse';

const CONTACT_EMAIL = 'ilhan.kazan3664@gmail.com';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <article>
      <LegalTitle title={t('legal.privacy.title')} updated={t('legal.privacy.updated')} />

      <DemoDisclaimer />

      <LegalSection title={t('legal.privacy.dataController.title')}>
        <p>
          {t('legal.privacy.dataController.body')}{' '}
          <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.dataProcessed.title')}>
        <LegalList items={t('legal.privacy.dataProcessed.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.privacy.purposes.title')}>
        <p>{t('legal.privacy.purposes.body')}</p>
        <LegalList items={t('legal.privacy.purposes.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.privacy.providers.title')}>
        <p>{t('legal.privacy.providers.body')}</p>
        <LegalList items={t('legal.privacy.providers.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.privacy.retention.title')}>
        <p>{t('legal.privacy.retention.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.rights.title')}>
        <p>{t('legal.privacy.rights.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.cookies.title')}>
        <p>{t('legal.privacy.cookies.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.privacy.ageLimit.title')}>
        <p>{t('legal.privacy.ageLimit.body')}</p>
      </LegalSection>
    </article>
  );
}
