import { LegalTitle, LegalSection, DemoDisclaimer } from './LegalProse';

export function AboutPage() {
  return (
    <article>
      <LegalTitle title="Hakkında · About" />

      <DemoDisclaimer />

      <LegalSection title="SocialHan nedir?">
        <p>
          SocialHan, gerçek zamanlı bir akış, konu zincirleri, direkt mesajlar ve görsel paylaşımı
          sunan Twitter benzeri bir sosyal medya platformudur. 2024'te yapılan bir portfolyo
          projesinin 2026 yılında modern bir yığınla sıfırdan yeniden yazılmış halidir.
        </p>
        <p>
          Proje; Java 21 / Spring Boot tabanlı bir backend, React 19 + TypeScript bir frontend ve
          PostgreSQL veritabanı kullanır. Amacı, üretim kalitesinde, gerçek zamanlı özelliklere sahip
          bir uygulamayı uçtan uca göstermektir.
        </p>
      </LegalSection>

      <LegalSection title="In English">
        <p>
          SocialHan is a Twitter-style social platform with a real-time feed, threaded conversations,
          direct messages and image sharing. It is a 2026 ground-up rewrite of a 2024 portfolio
          project, built to showcase a production-grade, real-time application end to end.
        </p>
      </LegalSection>

      <LegalSection title="İletişim · Contact">
        <p>
          Sorular ve talepler için: <a className="text-primary hover:underline" href="mailto:ilhan.kazan3664@gmail.com">ilhan.kazan3664@gmail.com</a>
        </p>
      </LegalSection>
    </article>
  );
}
