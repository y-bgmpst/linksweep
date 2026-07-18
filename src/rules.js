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
  learnEnabled: true,
  redirectEnabled: true,
  stripEmptyParams: true,
  trackingParams: DEFAULT_TRACKING_PARAMS,
  redirects: DEFAULT_REDIRECTS
};

const DEFAULT_LEARNED_PARAMS = {
  version: 1,
  dismissedParams: [],
  domains: {}
};

const CLEANUP_RULE_ID = 1;
const REDIRECT_RULE_ID_OFFSET = 100;

function normalizeSettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return {
    ...merged,
    learnEnabled: Boolean(merged.learnEnabled),
    trackingParams: normalizeParamList(merged.trackingParams),
    redirects: Array.isArray(merged.redirects)
      ? merged.redirects.map(normalizeRedirect).filter(Boolean)
      : DEFAULT_REDIRECTS.map(normalizeRedirect).filter(Boolean)
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

function normalizeLearnedParams(learned = {}) {
  const dismissedParams = normalizeParamList(learned.dismissedParams || []);
  const domains = {};

  if (learned.domains && typeof learned.domains === "object") {
    for (const [domain, domainStats] of Object.entries(learned.domains)) {
      const host = normalizeHost(domain);
      if (!host || !domainStats || typeof domainStats !== "object") {
        continue;
      }

      const params = {};
      const sourceParams = domainStats.params && typeof domainStats.params === "object"
        ? domainStats.params
        : {};

      for (const [param, stats] of Object.entries(sourceParams)) {
        const normalizedParam = normalizeParamList([param])[0];
        if (!normalizedParam || !stats || typeof stats !== "object") {
          continue;
        }

        params[normalizedParam] = {
          count: Math.max(0, Number.parseInt(stats.count, 10) || 0),
          firstSeen: Number.parseInt(stats.firstSeen, 10) || 0,
          lastSeen: Number.parseInt(stats.lastSeen, 10) || 0
        };
      }

      if (Object.keys(params).length > 0) {
        domains[host] = { params };
      }
    }
  }

  return {
    version: 1,
    dismissedParams,
    domains
  };
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

function learnFromUrl(input, learned = DEFAULT_LEARNED_PARAMS, settings = DEFAULT_SETTINGS, now = Date.now()) {
  const normalizedSettings = normalizeSettings(settings);
  const normalizedLearned = normalizeLearnedParams(learned);

  if (!normalizedSettings.enabled || !normalizedSettings.learnEnabled) {
    return { ok: true, changed: false, learned: normalizedLearned };
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, changed: false, reason: "Enter a valid absolute URL.", learned: normalizedLearned };
  }

  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    return { ok: true, changed: false, learned: normalizedLearned };
  }

  const knownParams = new Set(normalizedSettings.trackingParams);
  const dismissedParams = new Set(normalizedLearned.dismissedParams);
  const params = normalizeParamList([...url.searchParams.keys()])
    .filter((param) => !knownParams.has(param) && !dismissedParams.has(param));

  if (params.length === 0) {
    return { ok: true, changed: false, learned: normalizedLearned };
  }

  const host = normalizeHost(url.hostname);
  const nextDomain = normalizedLearned.domains[host]
    ? { params: { ...normalizedLearned.domains[host].params } }
    : { params: {} };

  for (const param of params) {
    const previous = nextDomain.params[param] || {
      count: 0,
      firstSeen: now,
      lastSeen: 0
    };

    nextDomain.params[param] = {
      count: previous.count + 1,
      firstSeen: previous.firstSeen || now,
      lastSeen: now
    };
  }

  return {
    ok: true,
    changed: true,
    learned: {
      ...normalizedLearned,
      domains: {
        ...normalizedLearned.domains,
        [host]: nextDomain
      }
    }
  };
}

function getLearnedSuggestions(learned = DEFAULT_LEARNED_PARAMS, settings = DEFAULT_SETTINGS, options = {}) {
  const normalizedLearned = normalizeLearnedParams(learned);
  const normalizedSettings = normalizeSettings(settings);
  const knownParams = new Set(normalizedSettings.trackingParams);
  const dismissedParams = new Set(normalizedLearned.dismissedParams);
  const limit = Number.parseInt(options.limit, 10) || 20;
  const minCount = Number.parseInt(options.minCount, 10) || 1;
  const suggestions = new Map();

  for (const [domain, domainStats] of Object.entries(normalizedLearned.domains)) {
    for (const [param, stats] of Object.entries(domainStats.params)) {
      if (knownParams.has(param) || dismissedParams.has(param) || stats.count < minCount) {
        continue;
      }

      const existing = suggestions.get(param) || {
        param,
        count: 0,
        domains: [],
        lastSeen: 0
      };

      suggestions.set(param, {
        ...existing,
        count: existing.count + stats.count,
        domains: [...existing.domains, domain].sort(),
        lastSeen: Math.max(existing.lastSeen, stats.lastSeen)
      });
    }
  }

  return [...suggestions.values()]
    .sort((left, right) => right.count - left.count || left.param.localeCompare(right.param))
    .slice(0, limit);
}

function dismissLearnedParam(learned = DEFAULT_LEARNED_PARAMS, param) {
  const normalizedLearned = normalizeLearnedParams(learned);
  const normalizedParam = normalizeParamList([param])[0];
  if (!normalizedParam) {
    return normalizedLearned;
  }

  return {
    ...normalizedLearned,
    dismissedParams: normalizeParamList([
      ...normalizedLearned.dismissedParams,
      normalizedParam
    ])
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
      id: REDIRECT_RULE_ID_OFFSET + index,
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

function buildDynamicCleanupRules(settings = DEFAULT_SETTINGS) {
  const normalized = normalizeSettings(settings);
  if (!normalized.enabled || !normalized.cleanTrackingParams || normalized.trackingParams.length === 0) {
    return [];
  }

  return [
    {
      id: CLEANUP_RULE_ID,
      priority: 2,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            queryTransform: {
              removeParams: normalized.trackingParams
            }
          }
        }
      },
      condition: {
        regexFilter: `^https?://[^#]*[?&](${normalized.trackingParams.map(escapeRegex).join("|")})(=|&|$)`,
        resourceTypes: ["main_frame"]
      }
    }
  ];
}

function buildDynamicRules(settings = DEFAULT_SETTINGS) {
  return [
    ...buildDynamicCleanupRules(settings),
    ...buildDynamicRedirectRules(settings)
  ];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const api = {
  DEFAULT_LEARNED_PARAMS,
  DEFAULT_SETTINGS,
  DEFAULT_TRACKING_PARAMS,
  DEFAULT_REDIRECTS,
  buildDynamicCleanupRules,
  buildDynamicRedirectRules,
  buildDynamicRules,
  cleanUrl,
  dismissLearnedParam,
  getLearnedSuggestions,
  learnFromUrl,
  normalizeLearnedParams,
  normalizeSettings,
  previewUrl,
  redirectUrl
};

export {
  DEFAULT_LEARNED_PARAMS,
  DEFAULT_SETTINGS,
  DEFAULT_TRACKING_PARAMS,
  DEFAULT_REDIRECTS,
  buildDynamicCleanupRules,
  buildDynamicRedirectRules,
  buildDynamicRules,
  cleanUrl,
  dismissLearnedParam,
  getLearnedSuggestions,
  learnFromUrl,
  normalizeLearnedParams,
  normalizeSettings,
  previewUrl,
  redirectUrl
};
