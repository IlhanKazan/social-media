import { LegalTitle, LegalSection, LegalList, DemoDisclaimer } from './LegalProse';

export function PrivacyPage() {
  return (
    <article>
      <LegalTitle title="Gizlilik Politikası & KVKK Aydınlatma Metni" updated="21 Haziran 2026" />

      <DemoDisclaimer />

      <LegalSection title="Veri sorumlusu">
        <p>
          Bu metin, SocialHan demo uygulamasını yürüten geliştirici (bundan sonra "biz") tarafından,
          6698 sayılı KVKK ve GDPR ilkeleri doğrultusunda hazırlanmıştır. İletişim:{' '}
          <a className="text-primary hover:underline" href="mailto:ilhan.kazan23@gmail.com">ilhan.kazan23@gmail.com</a>.
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
          Hizmeti çalıştırmak için aşağıdaki üçüncü taraf işleyicileri kullanırız. Bunların tümü ABD
          merkezlidir; bu nedenle verileriniz yurt dışına aktarılır:
        </p>
        <LegalList
          items={[
            'Render — uygulama (API) barındırma.',
            'Supabase — PostgreSQL veritabanı barındırma.',
            'Netlify — ön yüz (web arayüzü) barındırma ve içerik dağıtım ağı (CDN).',
            'Cloudinary — görsel depolama ve sunumu.',
            'Resend — işlemsel e-posta gönderimi (ör. şifre sıfırlama).',
            'OpenAI — gönderi içeriğinin otomatik moderasyonu.',
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
          security/audit). Processors are US-based (Render, Supabase, Netlify, Cloudinary, Resend, OpenAI), so
          data is transferred abroad. Sending post content to OpenAI for moderation, cross-border
          transfer, and any marketing email require your explicit consent, collected at registration.
          On account deletion, content is soft-deleted then permanently removed after 30 days,
          including images on Cloudinary. You may access, correct or erase your data via Settings or by
          email. Only functional cookies are used. Minimum age is 13.
        </p>
      </LegalSection>
    </article>
  );
}
