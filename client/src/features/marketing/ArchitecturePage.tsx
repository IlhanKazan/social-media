import { useTranslation } from 'react-i18next';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { LegalTitle, LegalSection, LegalList } from './LegalProse';

const TOPOLOGY_DIAGRAM = `flowchart TB
    subgraph clients["Clients"]
        Web["Browser (React 19 SPA)"]
        Mobile["Mobile app (Expo)"]
    end
    CF["Cloudflare (proxy, DNS, DDoS)"]
    Coolify["Coolify / Traefik (TLS)"]
    API["Spring Boot API"]
    DB[("PostgreSQL")]
    Cloudinary["Cloudinary (images)"]
    OpenAI["OpenAI (moderation)"]
    Resend["Resend (email)"]
    FCM["Firebase (push)"]

    Web -->|HTTPS + WSS| CF
    Mobile -->|HTTPS + WSS| CF
    CF --> Coolify --> API
    API --> DB
    API --> Cloudinary
    API --> OpenAI
    API --> Resend
    API --> FCM`;

const LAYERING_DIAGRAM = `flowchart LR
    C["controller<br/>(REST/WS)"] --> M["manager<br/>(orchestration)"]
    M --> S["service<br/>(business logic)"]
    S --> R["repository<br/>(JPA)"]
    R --> DB[("PostgreSQL")]`;

const LIFECYCLE_DIAGRAM = `sequenceDiagram
    participant C as Client
    participant F as Security filter chain
    participant Ctl as Controller
    participant Mgr as Manager
    participant Svc as Service
    participant Repo as Repository
    participant Async as Async listeners

    C->>F: Authenticated request
    F->>F: JWT auth, maintenance check, authz
    F->>Ctl: Rate-limit check passed
    Ctl->>Ctl: Validate request
    Ctl->>Mgr: Delegate
    Mgr->>Svc: Apply domain rules
    Svc->>Repo: Persist
    Mgr->>Async: Publish events
    Async-->>Async: Side effects (audit, push, WS)
    Mgr-->>Ctl: Result
    Ctl-->>C: DTO response`;

const REALTIME_DIAGRAM = `sequenceDiagram
    participant Cl as Client (web/mobile)
    participant Br as STOMP broker
    participant Other as Other subscribers

    Cl->>Br: CONNECT (JWT)
    Br-->>Cl: CONNECTED
    Cl->>Br: SEND /app/...
    Br->>Other: /topic/... (broadcast)
    Br->>Cl: /user/queue/... (per-user)`;

export function ArchitecturePage() {
  const { t } = useTranslation();

  return (
    <article>
      <LegalTitle title={t('legal.architecture.title')} />

      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {t('legal.architecture.intro')}
      </p>

      <LegalSection title={t('legal.architecture.topology.title')}>
        <p>{t('legal.architecture.topology.body')}</p>
        <MermaidDiagram code={TOPOLOGY_DIAGRAM} />
      </LegalSection>

      <LegalSection title={t('legal.architecture.layering.title')}>
        <p>{t('legal.architecture.layering.intro')}</p>
        <MermaidDiagram code={LAYERING_DIAGRAM} />
        <LegalList items={t('legal.architecture.layering.items', { returnObjects: true }) as string[]} />
        <p>{t('legal.architecture.layering.outro')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.lifecycle.title')}>
        <p>{t('legal.architecture.lifecycle.intro')}</p>
        <MermaidDiagram code={LIFECYCLE_DIAGRAM} />
        <LegalList items={t('legal.architecture.lifecycle.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.architecture.auth.title')}>
        <LegalList items={t('legal.architecture.auth.items', { returnObjects: true }) as string[]} />
        <p>{t('legal.architecture.auth.outro')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.realtime.title')}>
        <p>{t('legal.architecture.realtime.body')}</p>
        <MermaidDiagram code={REALTIME_DIAGRAM} />
      </LegalSection>

      <LegalSection title={t('legal.architecture.data.title')}>
        <p>{t('legal.architecture.data.intro')}</p>
        <LegalList items={t('legal.architecture.data.items', { returnObjects: true }) as string[]} />
        <p>{t('legal.architecture.data.outro')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.caching.title')}>
        <p>{t('legal.architecture.caching.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.rateLimit.title')}>
        <p>{t('legal.architecture.rateLimit.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.moderation.title')}>
        <p>{t('legal.architecture.moderation.body')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.supporting.title')}>
        <LegalList items={t('legal.architecture.supporting.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.architecture.operations.title')}>
        <p>{t('legal.architecture.operations.intro')}</p>
        <LegalList items={t('legal.architecture.operations.items', { returnObjects: true }) as string[]} />
      </LegalSection>

      <LegalSection title={t('legal.architecture.frontend.title')}>
        <p>{t('legal.architecture.frontend.intro')}</p>
        <LegalList items={t('legal.architecture.frontend.items', { returnObjects: true }) as string[]} />
        <p>{t('legal.architecture.frontend.outro')}</p>
      </LegalSection>

      <LegalSection title={t('legal.architecture.testing.title')}>
        <p>{t('legal.architecture.testing.body')}</p>
      </LegalSection>
    </article>
  );
}
