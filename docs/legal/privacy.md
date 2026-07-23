# Gizlilik Politikası & KVKK Aydınlatma Metni

> Son güncelleme: 23 Temmuz 2026 · Consent version: `2026-07-1`
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

## Hizmet sağlayıcılar ve yurt dışı aktarım
- Hetzner (Almanya, AB içi) — API, veritabanı ve ön yüzün barındırıldığı sunucu
- Cloudflare (ABD merkezli) — DNS, DDoS koruması ve içerik dağıtım ağı (CDN)
- Cloudinary (ABD) — görsel depolama/sunum
- Resend (ABD) — işlemsel e-posta
- OpenAI (ABD) — otomatik içerik moderasyonu

Ana uygulama ve veritabanı Almanya'da (AB içinde) barındırılır. Cloudflare,
Cloudinary, Resend ve OpenAI ABD merkezlidir; bu dört sağlayıcıya yapılan
aktarımlar için yurt dışı aktarım rızası kayıt sırasında alınır.

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
security/audit). The app and database are hosted on Hetzner (Germany, EU). Cloudflare,
Cloudinary, Resend, and OpenAI are US-based, so data reaching those four involves a
cross-border transfer. Sending post content to OpenAI for moderation, cross-border
transfer, and any marketing email require explicit consent collected at registration. On
deletion, content is soft-deleted then permanently removed after 30 days, including
Cloudinary images. Access/correct/erase via Settings or email. Functional cookies only.
Minimum age 13.
