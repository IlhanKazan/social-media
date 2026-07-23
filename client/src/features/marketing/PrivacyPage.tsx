import { LegalTitle, LegalSection, LegalList, DemoDisclaimer } from './LegalProse';

export function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="Gizlilik Politikası & KVKK Aydınlatma Metni" updated="23 Temmuz 2026" />

      <DemoDisclaimer />

      <LegalSection title="Veri sorumlusu">
        <p>
          Bu metin, SocialHan'ı yürüten geliştirici tarafından 6698 sayılı KVKK ve GDPR ilkeleri
          doğrultusunda hazırlanmıştır. İletişim:{' '}
          <a className="text-primary hover:underline" href="mailto:ilhan.kazan3664@gmail.com">ilhan.kazan3664@gmail.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="İşlenen veriler">
        <LegalList
          items={[
            'Hesap bilgileri: kullanıcı adı, e-posta adresi, şifre (yalnızca BCrypt ile hash\'lenmiş olarak saklanır).',
            'Profil bilgileri: görünen ad, biyografi, profil ve kapak görselleri.',
            'İçerik: gönderiler, yanıtlar, beğeniler, repost ve takip ilişkileri.',
            'Direkt mesajlar ve mesajlara eklenen görseller.',
            'Teknik kayıtlar: oturum açma geçmişi ve güvenlik denetim kayıtları kapsamında IP adresi ve tarayıcı bilgisi.',
          ]}
        />
      </LegalSection>

      <LegalSection title="İşleme amaçları ve hukuki sebep (KVKK m.5/6)">
        <p>
          Verileriniz; hesabınızın oluşturulması ve yönetimi, içeriğin sunulması, mesajlaşma, güvenlik
          ve kötüye kullanımın önlenmesi amaçlarıyla işlenir. Hukuki sebep, çoğunlukla sözleşmenin
          ifası ve meşru menfaattir. Aşağıdaki işlemler ise <strong>açık rızanıza</strong> tabidir ve
          kayıt sırasında onayınız alınır:
        </p>
        <LegalList
          items={[
            'Gönderi içeriğinin moderasyon amacıyla OpenAI\'a gönderilmesi.',
            'Verilerin yurt dışındaki hizmet sağlayıcılara aktarılması (aşağıya bakınız).',
            'Varsa pazarlama / bilgilendirme e-postaları.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Hizmet sağlayıcılar ve yurt dışı aktarım">
        <p>
          Hizmeti çalıştırmak için aşağıdaki üçüncü taraf işleyicileri kullanırız. Ana uygulama ve
          veritabanı Almanya'da (AB içinde) barındırılır; Cloudflare, Cloudinary, Resend ve OpenAI
          ABD merkezlidir ve bu dördüne yapılan aktarımlar yurt dışı aktarım sayılır:
        </p>
        <LegalList
          items={[
            'Hetzner (Almanya, AB içi) — API, veritabanı ve ön yüzün barındırıldığı sunucu.',
            'Cloudflare (ABD) — DNS, DDoS koruması ve içerik dağıtım ağı (CDN).',
            'Cloudinary (ABD) — görsel depolama ve sunumu.',
            'Resend (ABD) — işlemsel e-posta gönderimi (ör. şifre sıfırlama).',
            'OpenAI (ABD) — gönderi içeriğinin otomatik moderasyonu.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Saklama süresi">
        <p>
          Hesabınızı sildiğinizde içeriğiniz önce pasif (soft-delete) hale getirilir ve 30 gün sonra
          çalışan bir görev tarafından kalıcı olarak silinir; bu sırada profil, gönderi ve mesaj
          görselleriniz Cloudinary üzerinden de kaldırılır. Güvenlik denetim kayıtları, aktöre
          bağlanmadan (anonimleştirilerek) bir süre daha tutulabilir.
        </p>
      </LegalSection>

      <LegalSection title="Haklarınız (KVKK m.11 / GDPR)">
        <p>
          Verilerinize erişme, düzeltme, silinmesini isteme ve işlemeye itiraz etme haklarına
          sahipsiniz. Hesabınızı uygulama içindeki Ayarlar &gt; Hesabımı Sil bölümünden doğrudan
          silebilir veya yukarıdaki e-posta üzerinden talepte bulunabilirsiniz. Şikayetler için aynı
          kanalı kullanabilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="Çerezler ve güvenlik">
        <p>
          Yalnızca işlevsel çerezler kullanılır: oturumunuzu sürdürmek için HttpOnly bir yenileme
          tokenı çerezi tutulur. Reklam veya üçüncü taraf takip çerezi kullanılmaz. Şifreler hash\'lenir,
          iletişim HTTPS üzerinden yapılır ve kimlik doğrulama uç noktaları hız sınırlamasıyla korunur.
        </p>
      </LegalSection>

      <LegalSection title="Yaş sınırı">
        <p>
          Hizmet 13 yaşından küçükler için tasarlanmamıştır. Kayıt sırasında yaş şartını karşıladığınızı
          onaylamanız istenir.
        </p>
      </LegalSection>

      <LegalSection title="In English (summary)">
        <p>
          SocialHan is a portfolio/demo project. We process account data (username, email, hashed
          password), profile data, content, direct messages with images, and technical logs (IP for
          security/audit). The app and database are hosted on Hetzner (Germany, EU). Cloudflare,
          Cloudinary, Resend, and OpenAI are US-based, so data reaching those four involves a
          cross-border transfer. Sending post content to OpenAI for moderation, cross-border
          transfer, and any marketing email require your explicit consent, collected at registration.
          On account deletion, content is soft-deleted then permanently removed after 30 days,
          including images on Cloudinary. You may access, correct or erase your data via Settings or by
          email. Only functional cookies are used. Minimum age is 13.
        </p>
      </LegalSection>
    </article>
  );
}
