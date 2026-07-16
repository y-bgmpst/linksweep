const DEFAULT_TRACKING_PARAMS = [
  "fbclid",
  "gclid",
  "gbraid",
  "mc_cid",
  "mc_eid",
  "msclkid",
  "igshid",
  "ref",
  "spm",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term"
];

const DEFAULT_REDIRECTS = [
  {
    id: "youtube-invidious",
    enabled: false,
    sourceHost: "youtube.com",
    includeSubdomains: true,
    targetOrigin: "https://yewtu.be"
  },
  {
    id: "x-nitter",
    enabled: false,
    sourceHost: "x.com",
    includeSubdomains: false,
    targetOrigin: "https://nitter.net"
  },
  {
    id: "twitter-nitter",
    enabled: false,
    sourceHost: "twitter.com",
    includeSubdomains: false,
    targetOrigin: "https://nitter.net"
  },
  {
    id: "reddit-libreddit",
    enabled: false,
    sourceHost: "reddit.com",
    includeSubdomains: true,
    targetOrigin: "https://libreddit.bus-hit.me"
  }
];

const DEFAULT_SETTINGS = {
  enabled: true,
  cleanTrackingParams: true,
  redirectEnabled: true,
  stripEmptyParams: true,
  trackingParams: DEFAULT_TRACKING_PARAMS,
  redirects: DEFAULT_REDIRECTS
};

function normalizeSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...merged,
    trackingParams: normalizeParamList(merged.trackingParams),
    redirects: Array.isArray(merged.redirects)
      ? merged.redirects.map(normalizeRedirect).filter(Boolean)
      : DEFAULT_REDIRECTS
  };
}

function normalizeParamList(params) {
  if (!Array.isArray(params)) {
    return [...DEFAULT_TRACKING_PARAMS];
  }

  return [...new Set(params
    .map((param) => String(param).trim().toLowerCase())
    .filter((param) => /^[a-z0-9_.-]+$/.test(param)))]
    .sort();
}

function normalizeRedirect(rule) {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const sourceHost = normalizeHost(rule.sourceHost);
  const targetOrigin = normalizeOrigin(rule.targetOrigin);
  if (!sourceHost || !targetOrigin) {
    return null;
  }

  return {
    id: String(rule.id || sourceHost).replace(/[^a-z0-9_-]/gi, "-").toLowerCase(),
    enabled: Boolean(rule.enabled),
    sourceHost,
    includeSubdomains: Boolean(rule.includeSubdomains),
    targetOrigin
  };
}

function normalizeHost(value) {
  const host = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) {
    return "";
  }

  return host.replace(/^\.+|\.+$/g, "");
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

function cleanUrl(input, settings = DEFAULT_SETTINGS) {
  const normalized = normalizeSettings(settings);
  let url;

  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Enter a valid absolute URL." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, reason: "Only HTTP and HTTPS URLs can be cleaned." };
  }

  const before = url.href;
  const trackingParams = new Set(normalized.trackingParams);

  for (const key of [...url.searchParams.keys()]) {
    const lowerKey = key.toLowerCase();
    const value = url.searchParams.get(key);
    if (
      normalized.cleanTrackingParams && trackingParams.has(lowerKey)
      || normalized.stripEmptyParams && value === ""
    ) {
      url.searchParams.delete(key);
    }
  }

  return {
    ok: true,
    changed: before !== url.href,
    originalUrl: before,
    cleanedUrl: url.href
  };
}

function redirectUrl(input, settings = DEFAULT_SETTINGS) {
  const normalized = normalizeSettings(settings);
  let url;

  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Enter a valid absolute URL." };
  }

  if (!normalized.enabled || !normalized.redirectEnabled) {
    return { ok: true, changed: false, redirectedUrl: url.href };
  }

  const match = normalized.redirects.find((rule) => {
    if (!rule.enabled) {
      return false;
    }

    if (url.hostname === rule.sourceHost) {
      return true;
    }

    return rule.includeSubdomains && url.hostname.endsWith(`.${rule.sourceHost}`);
  });

  if (!match) {
    return { ok: true, changed: false, redirectedUrl: url.href };
  }

  const target = new URL(match.targetOrigin);
  target.pathname = url.pathname;
  target.search = url.search;
  target.hash = url.hash;

  return {
    ok: true,
    changed: target.href !== url.href,
    ruleId: match.id,
    redirectedUrl: target.href
  };
}

function previewUrl(input, settings = DEFAULT_SETTINGS) {
  const redirect = redirectUrl(input, settings);
  if (!redirect.ok) {
    return redirect;
  }

  const cleaned = cleanUrl(redirect.redirectedUrl, settings);
  if (!cleaned.ok) {
    return cleaned;
  }

  return {
    ok: true,
    originalUrl: input,
    redirectedUrl: redirect.redirectedUrl,
    cleanedUrl: cleaned.cleanedUrl,
    changed: redirect.changed || cleaned.changed,
    redirectRuleId: redirect.ruleId || null
  };
}

function buildDynamicRedirectRules(settings = DEFAULT_SETTINGS) {
  const normalized = normalizeSettings(settings);
  if (!normalized.enabled || !normalized.redirectEnabled) {
    return [];
  }

  return normalized.redirects
    .filter((rule) => rule.enabled)
    .map((rule, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: rule.includeSubdomains
            ? `${rule.targetOrigin}/\\2`
            : `${rule.targetOrigin}/\\1`
        }
      },
      condition: {
        regexFilter: rule.includeSubdomains
          ? `^https?://([^/]+\\.)?${escapeRegex(rule.sourceHost)}/?(.*)$`
          : `^https?://${escapeRegex(rule.sourceHost)}/?(.*)$`,
        resourceTypes: ["main_frame"]
      }
    }));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const api = {
  DEFAULT_SETTINGS,
  DEFAULT_TRACKING_PARAMS,
  DEFAULT_REDIRECTS,
  buildDynamicRedirectRules,
  cleanUrl,
  normalizeSettings,
  previewUrl,
  redirectUrl
};

export {
  DEFAULT_SETTINGS,
  DEFAULT_TRACKING_PARAMS,
  DEFAULT_REDIRECTS,
  buildDynamicRedirectRules,
  cleanUrl,
  normalizeSettings,
  previewUrl,
  redirectUrl
};
