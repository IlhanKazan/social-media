import { useEffect, useId, useRef, useState } from 'react';

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// Mermaid renders through a single shared DOM sandbox and one global config, so
// concurrent render() calls clobber each other — with four diagrams mounting at
// once some came back empty, which is why they "sometimes" failed to appear.
// Every render is therefore chained onto one promise, and the theme is applied
// inside that chain so a re-theme can never race a render in flight.
let renderQueue: Promise<unknown> = Promise.resolve();
let lastTheme: string | null = null;

function enqueueRender(id: string, code: string, dark: boolean): Promise<string> {
  const task = renderQueue.then(async () => {
    const { default: mermaid } = await import('mermaid');
    const theme = dark ? 'dark' : 'default';
    if (theme !== lastTheme) {
      mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });
      lastTheme = theme;
    }
    const { svg } = await mermaid.render(id, code);
    return svg;
  });

  // Keep the chain alive even when one diagram fails, or a single bad graph
  // would block every diagram queued behind it.
  renderQueue = task.catch(() => undefined);
  return task;
}

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(isDarkMode);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const svg = await enqueueRender(`mermaid-${id}`, code, dark);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, dark, id]);

  if (failed) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg border border-zinc-200 bg-muted p-4 text-xs text-muted-foreground dark:border-zinc-800">
        {code}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-6 w-full overflow-x-auto [&>svg]:!h-auto [&>svg]:!max-w-none [&>svg]:w-full" />;
}
