# E-posta sistemi — bilinen tuzaklar ve alınan kararlar

İlk gerçek duyuru gönderimi (2026-08-17) üç hata ortaya çıkardı. Üçü de
düzeltildi ve testle kilitlendi; buraya not düşülüyor çünkü üçü de aynı sınıfta:
**yerelde görünmeyen, ancak canlı gönderimde ortaya çıkan** hatalar.

---

## 1. Mail linkleri görsel CDN'ine gidiyordu

**Belirti:** Maildeki "Gizlilik" ve "Kullanım Şartları" bağlantıları
`res.cloudinary.com/privacy` adresine gidiyordu.

**Sebep:** Altbilgi linkleri logo URL'inden türetiliyordu. Gerekçe "aynı ayarı
iki kez yapılandırmayalım" idi — logo zaten siteyi işaret ediyor sanılmıştı.
İşaret etmiyor: logo bir CDN'den servis ediliyor.

**Düzeltme:** `FRONTEND_ORIGIN` okunuyor — şifre sıfırlama, doğrulama ve hoş
geldin linklerinin en başından beri kullandığı değer.

**Ders:** Bir yapılandırma değerini başka birinden türetmek, ikisinin aynı şeyi
ifade ettiği varsayımına dayanır. O varsayım yazılmadıysa kimse doğrulamaz.

---

## 2. Abonelikten çıkma sayfasındaki buton hiçbir yere gitmiyordu

**Belirti:** Mailden çıkış linkine basınca API alan adında bir sayfa açılıyor,
"Ayarlara dön" butonu `api-socialhan.../settings` adresine gidiyordu — orada
böyle bir sayfa yok.

**Sebep:** Sayfa `/settings` diye **göreli** bir link kullanıyordu. Sayfa API
sunucusundan servis edildiği için göreli link de API'ye çözümleniyor.

**Neden sayfa API'de:** Abonelikten çıkma bağlantısı oturumsuz ve JavaScript'siz
çalışmak zorunda — mail istemcisinden aylar sonra tıklanabilir. Ayrıca RFC 8058
tek tık iptali doğrudan URL'e POST atar, çalışacak bir sayfa yoktur. Bu yüzden
uç nokta API'de duruyor ve orada kalmalı.

**Düzeltme:** Buton `FRONTEND_ORIGIN` + `/settings` kullanıyor.

**İlgili:** Abonelikten çıkma linkinin kendisi `COOLIFY_URL`'den üretiliyor —
o **API** adresi olmalı, site değil. SPA'nın nginx'i `/api` yolunu proxy'lemiyor,
site adresinden üretilen bir link 404 sayfasına düşerdi.

---

## 3. Duyuru metnindeki paragraf boşlukları kayboluyordu

**Belirti:** Admin panelinde boşluklu, paragraflı yazılan duyuru, mailde tek
bir blok halinde iç içe geçmiş olarak göründü.

**Sebep:** Yeni satır karakteri HTML'de boşluktur. Metin, şablona ham olarak
gömülüyordu.

**Düzeltme:** HTML parçası için değerler kaçışlanıyor ve `\n` → `<br/>`
çevriliyor; düz metin parçası ham değeri koruyor. İki parça artık aynı haritadan
beslenmiyor.

**Bonus:** Aynı düzeltme HTML kaçışlaması da ekliyor. Metni sadece admin yazsa
bile, kaçışlanmamış bir `<` çevredeki tablo düzenini bozar.

**İstisna:** URL'ler kaçışlanmıyor — `&` işaretini kaçışlamak `href` içindeki
bağlantıyı kırar, ve URL'lerde biçimlendirilecek metin yok.

---

## 4. Botlara duyuru gidiyordu

**Belirti:** 6 hesaplı bir kurulumda duyuru 4 kişiye gitti; üçü bot, biri gerçek
kullanıcıydı. İki gerçek kullanıcı ise hiç almadı.

**İki ayrı sebep:**

**a) Botlar dahildi.** Alıcı sorgusunda rol filtresi yoktu. Bot adresleri seed
verisi; kimse onlardan haber almak istemedi. Aylık kota **şifre sıfırlamalarla
paylaşıldığı için**, bota giden her mail gerçek kullanıcının kritik mailinden
çalınan kotadır. Artık `role.name <> 'ROLE_BOT'` filtresi var.

**b) Doğrulanmamış adresler hariç — bu bilinçli.** `emailVerified = true` şartı
en baştan vardı. Doğrulanmamış adres, sahibi olduğu kanıtlanmamış adrestir. Biri
başkasının mailiyle kayıt olduysa, o kişi hiç duymadığı bir siteden toplu mail
alır ve ilk yapacağı şey "spam bildir" olur — bu da gönderen itibarını düşürüp
**şifre sıfırlama maillerinin de spam'e düşmesine** yol açar.

Bu filtre yalnızca duyuruları etkiler. Şifre sıfırlama, e-posta doğrulama ve
MFA kodu zorunlu maildir ve doğrulanmamış adrese de gider.

**Açık kalan kusur:** Önizleme ekranı "4 alıcı" diyor ama **neden 4 olduğunu**
söylemiyor. Kaç hesabın doğrulanmadığı veya bot olduğu için hariç tutulduğu
gösterilmeli; bu bilgi olmadan sayı keyfi görünüyor.

---

## Gönderim öncesi kontrol listesi

Bir sonraki duyurudan önce:

1. **Alıcı sayısını sorgula**, ekrandaki sayıyla karşılaştır:
   ```sql
   SELECT username, email_verified, email_notifications_enabled,
          (SELECT name FROM roles WHERE id = role_id) AS rol
   FROM accounts WHERE deleted_at IS NULL ORDER BY created_at;
   ```
2. **Metni paragraf boşluklarıyla yaz**, artık korunuyor.
3. **Kota payını düşün** — aylık sınır şifre sıfırlamalarla ortak.
4. **Gönderdikten sonra kendi mailini aç**, altbilgideki üç bağlantıya da tıkla:
   gizlilik, şartlar, abonelikten çık.
5. **Geri alınamaz.** Gönder düğmesi son karardır.

## Doğrulanması gerekenler (henüz yapılmadı)

- **SPF / DKIM / DMARC kayıtları yok.** `dig` ile `ilhankazan.com` ve
  alt alanlarında ölçüldü (2026-08-17): üçü de boş. Maillerin doğrulanacak
  hiçbir dayanağı yok, spam'e düşme riski gerçek.
- **Gerçek istemci testi yapılmadı.** Gmail, Outlook ve iOS Mail'de görsel
  doğrulama yok. Özellikle Outlook, HTML'i Word ile işlediği için şablonun en
  kırılgan olduğu yer.
- **Karanlık mod** yalnızca `prefers-color-scheme` destekleyen istemcilerde
  çalışır; desteklemeyenler satır içi açık temayı görür, bu bilinçli.
