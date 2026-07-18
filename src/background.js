import {
  DEFAULT_LEARNED_PARAMS,
  buildDynamicRules,
  learnFromUrl,
  normalizeLearnedParams,
  normalizeSettings
} from "./rules.js";

const SETTINGS_KEY = "settings";
const LEARNED_KEY = "learnedParams";

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([SETTINGS_KEY, LEARNED_KEY]);
  const settings = normalizeSettings(stored[SETTINGS_KEY]);
  const learnedParams = normalizeLearnedParams(stored[LEARNED_KEY] || DEFAULT_LEARNED_PARAMS);
  await chrome.storage.local.set({
    [SETTINGS_KEY]: settings,
    [LEARNED_KEY]: learnedParams
  });
  await syncDynamicRules(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  await syncDynamicRules(await getSettings());
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SETTINGS_KEY]) {
    syncDynamicRules(normalizeSettings(changes[SETTINGS_KEY].newValue))
      .catch((error) => console.error("Failed to sync LinkSweep rules.", error));
  }
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || tab?.url) {
    learnUrl(changeInfo.url || tab.url)
      .catch((error) => console.error("Failed to learn LinkSweep URL parameters.", error));
  }
});

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

async function getLearnedParams() {
  const stored = await chrome.storage.local.get(LEARNED_KEY);
  return normalizeLearnedParams(stored[LEARNED_KEY]);
}

async function syncDynamicRules(settings) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: buildDynamicRules(settings)
  });
}

async function learnUrl(url) {
  const [settings, learned] = await Promise.all([
    getSettings(),
    getLearnedParams()
  ]);
  const result = learnFromUrl(url, learned, settings);

  if (result.ok && result.changed) {
    await chrome.storage.local.set({ [LEARNED_KEY]: result.learned });
  }
}
