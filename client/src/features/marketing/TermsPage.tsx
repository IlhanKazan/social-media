import { useTranslation } from 'react-i18next';
import { LegalTitle, LegalSection, LegalList, DemoDisclaimer } from './LegalProse';

export function TermsPage() {
  const { t } = useTranslation();

  return (
    <article>
      <LegalTitle title={t('legal.terms.title')} updated={t('legal.terms.updated')} />

      <DemoDisclaimer />

      <LegalSection title={t('legal.terms.natureOfService.title')}>
        <p>{t('legal.terms.natureOfService.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.accountEligibility.title')}>
        <p>{t('legal.terms.accountEligibility.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.acceptableUse.title')}>
        <p>{t('legal.terms.acceptableUse.intro')}</p>
        <LegalList items={t('legal.terms.acceptableUse.items', { returnObjects: true }) as string[]} />
        <p>{t('legal.terms.acceptableUse.moderationNote')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.yourContent.title')}>
        <p>{t('legal.terms.yourContent.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.terms.liability.title')}>
        <p>{t('legal.terms.liability.body')}</p>
      </LegalSection>
    </article>
  );
}
