import { useEffect, useId, useRef, useState } from 'react';

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, '-');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(isDarkMode);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });

      const { svg } = await mermaid.render(`mermaid-${id}`, code);
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, dark, id]);

  return <div ref={containerRef} className="my-4 flex justify-center overflow-x-auto [&_svg]:max-w-full" />;
}
