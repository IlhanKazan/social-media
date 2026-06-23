# Gizlilik Politikası & KVKK Aydınlatma Metni

> Son güncelleme: 21 Haziran 2026 · Consent version: `2026-06-1`
>
> Bu metin uygulamadaki `/privacy` sayfasının kanonik kaynağıdır. SocialHan bir
> portfolyo / demo projesidir, ticari bir hizmet değildir. İyi niyetle hazırlanmıştır,
> hukuki tavsiye niteliği taşımaz.

## Veri sorumlusu
SocialHan demo uygulamasını yürüten geliştirici. İletişim: ilhan.kazan3664@gmail.com

## İşlenen veriler
- Hesap: kullanıcı adı, e-posta, şifre (yalnızca BCrypt hash).
- Profil: görünen ad, biyografi, profil/kapak görselleri.
- İçerik: gönderiler, yanıtlar, beğeniler, repost, takip ilişkileri.
- Direkt mesajlar ve mesaj görselleri.
- Teknik: oturum geçmişi ve güvenlik denetim kayıtlarında IP + tarayıcı bilgisi.

## İşleme amaçları ve hukuki sebep (KVKK m.5/6)
Hesap yönetimi, içerik sunumu, mesajlaşma, güvenlik ve kötüye kullanımın önlenmesi.
Hukuki sebep çoğunlukla sözleşmenin ifası ve meşru menfaattir.

**Açık rıza gerektiren işlemler** (kayıt sırasında onaylanır):
- Gönderi içeriğinin moderasyon için OpenAI'a gönderilmesi.
- Verilerin yurt dışı hizmet sağlayıcılarına aktarılması.
- Varsa pazarlama / bilgilendirme e-postaları.

## Hizmet sağlayıcılar ve yurt dışı aktarım (tümü ABD merkezli)
- Render — uygulama (API) barındırma
- Supabase — PostgreSQL veritabanı
- Netlify — ön yüz barındırma + CDN
- Cloudinary — görsel depolama/sunum
- Resend — işlemsel e-posta
- OpenAI — otomatik içerik moderasyonu

## Saklama süresi
Hesap silindiğinde içerik önce soft-delete edilir, 30 gün sonra zamanlanmış görevle
kalıcı silinir; profil/gönderi/mesaj görselleri Cloudinary'den de kaldırılır. Güvenlik
denetim kayıtları anonimleştirilerek bir süre tutulabilir.

## Haklarınız (KVKK m.11 / GDPR)
Erişim, düzeltme, silme ve işlemeye itiraz. Hesap, uygulama içi Ayarlar > Hesabımı Sil
ile doğrudan silinebilir; talep ve şikayetler için: ilhan.kazan3664@gmail.com

## Çerezler ve güvenlik
Yalnızca işlevsel çerez: oturum için HttpOnly yenileme tokenı. Reklam/takip çerezi yok.
Şifreler hash'lenir, iletişim HTTPS, auth uç noktaları hız sınırlamalı.

## Yaş sınırı
13 yaş altı için tasarlanmamıştır; kayıtta yaş onayı alınır.

---

## In English (summary)
SocialHan is a portfolio/demo project. We process account data (username, email, hashed
password), profile data, content, DMs with images, and technical logs (IP for
security/audit). Processors are US-based (Render, Supabase, Netlify, Cloudinary, Resend, OpenAI),
so data is transferred abroad. Sending post content to OpenAI for moderation, cross-border
transfer, and any marketing email require explicit consent collected at registration. On
deletion, content is soft-deleted then permanently removed after 30 days, including
Cloudinary images. Access/correct/erase via Settings or email. Functional cookies only.
Minimum age 13.
