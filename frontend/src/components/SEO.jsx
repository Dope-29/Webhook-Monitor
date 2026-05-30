import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'HookWatch';
const BASE_URL  = 'https://hookwatch.io';
const DEFAULT_IMG = `${BASE_URL}/og-image.png`;

/**
 * SEO component — drop into any page to set meta tags
 *
 * <SEO title="Dashboard" description="..." />
 */
export default function SEO({ title, description, canonical, noindex = false }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Webhook Observability Platform`;
  const desc = description || 'Monitor, replay, and get instant alerts for all your webhooks.';
  const url  = canonical ? `${BASE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {url && <link rel="canonical" href={url} />}

      {/* OG */}
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image"       content={DEFAULT_IMG} />
      {url && <meta property="og:url" content={url} />}

      {/* Twitter */}
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
