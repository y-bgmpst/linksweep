import { buildDynamicRules, normalizeSettings } from "./rules.js";

const SETTINGS_KEY = "settings";

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  await syncDynamicRules(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  await syncDynamicRules(await getSettings());
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SETTINGS_KEY]) {
    syncDynamicRules(normalizeSettings(changes[SETTINGS_KEY].newValue));
  }
});

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

async function syncDynamicRules(settings) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: buildDynamicRules(settings)
  });
}
