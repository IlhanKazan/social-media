import { useEffect } from 'react';

const SITE = 'SocialHan';
const ORIGIN = 'https://socialhan.ilhankazan.com';

function setMeta(selector: string, attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

interface DocumentMeta {
  /** Page name. Rendered as "<title> · SocialHan"; omit on the home page. */
  readonly title?: string;
  readonly description?: string;
  /** Path only, e.g. "/about". Defaults to the current location. */
  readonly path?: string;
}

/**
 * Sets the title, description and canonical URL for the current route.
 *
 * A client-rendered SPA serves one static shell, so without this every route
 * shipped the same <title> and no canonical at all — search results collapse to
 * a single indistinguishable entry, and URL variants compete with each other.
 *
 * Crawlers that execute JavaScript pick these up. Ones that do not still need
 * server-rendered markup, which is a larger change than this hook.
 */
export function useDocumentMeta({ title, description, path }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : SITE;
    document.title = fullTitle;

    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }

    const url = `${ORIGIN}${path ?? window.location.pathname}`;
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  }, [title, description, path]);
}
