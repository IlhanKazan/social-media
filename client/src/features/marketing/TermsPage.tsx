import { LegalTitle, LegalSection, LegalList, DemoDisclaimer } from './LegalProse';

export function TermsPage() {
  return (
    <article>
      <LegalTitle title="Kullanım Şartları · Terms of Service" updated="21 Haziran 2026" />

      <DemoDisclaimer />

      <LegalSection title="Hizmetin niteliği">
        <p>
          SocialHan bir portfolyo / demo projesidir. Hizmet "olduğu gibi" sunulur; kesintisiz çalışma,
          veri kalıcılığı veya belirli bir performans garantisi verilmez. Veriler önceden bildirim
          yapılmaksızın sıfırlanabilir.
        </p>
      </LegalSection>

      <LegalSection title="Hesap ve uygunluk">
        <p>
          Kayıt olmak için en az 13 yaşında olmalısınız. Hesap güvenliğinizden ve hesabınız altında
          gerçekleşen etkinliklerden siz sorumlusunuz. Kayıt sırasında bu şartları ve Gizlilik
          Politikası'nı kabul etmeniz gerekir.
        </p>
      </LegalSection>

      <LegalSection title="Kabul edilebilir kullanım">
        <p>Aşağıdaki içerik ve davranışlar yasaktır:</p>
        <LegalList
          items={[
            'Yasa dışı, nefret söylemi içeren, taciz edici, şiddet içeren veya cinsel istismara yönelik içerik.',
            'Spam, otomatik kötüye kullanım veya hizmete yönelik teknik saldırılar.',
            'Başkalarının haklarını ihlal eden veya başkasının kimliğine bürünen içerik.',
          ]}
        />
        <p>
          İçerikler otomatik moderasyondan geçebilir; kuralları ihlal eden içerik veya hesaplar
          kaldırılabilir ya da askıya alınabilir.
        </p>
      </LegalSection>

      <LegalSection title="İçeriğiniz">
        <p>
          Paylaştığınız içeriğin haklarına siz sahipsiniz. İçeriği yayınlayarak, hizmetin işletilmesi
          için onu saklamamıza ve göstermemize izin vermiş olursunuz. Hesabınızı sildiğinizde içeriğiniz
          Gizlilik Politikası'nda açıklandığı şekilde kaldırılır.
        </p>
      </LegalSection>

      <LegalSection title="Sorumluluğun sınırlandırılması">
        <p>
          Bu bir demo proje olduğundan, hizmetin kullanımından doğabilecek veri kaybı veya kesintiler
          dahil dolaylı zararlardan sorumluluk kabul edilmez.
        </p>
      </LegalSection>

      <LegalSection title="In English (summary)">
        <p>
          SocialHan is a portfolio/demo project provided "as is" with no uptime or data-persistence
          guarantee; data may be reset without notice. You must be at least 13 to register and you
          accept these Terms and the Privacy Policy at sign-up. Illegal, hateful, harassing, violent or
          sexually abusive content, spam and technical abuse are prohibited and may lead to content or
          account removal. You retain rights to your content and grant us permission to store and
          display it to operate the service. As a demo, liability for indirect damages including data
          loss is excluded.
        </p>
      </LegalSection>
    </article>
  );
}
