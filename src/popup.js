import { DEFAULT_SETTINGS, normalizeSettings, previewUrl } from "./rules.js";

const SETTINGS_KEY = "settings";
const fields = {
  enabled: document.querySelector("#enabled"),
  cleanTrackingParams: document.querySelector("#cleanTrackingParams"),
  learnEnabled: document.querySelector("#learnEnabled"),
  redirectEnabled: document.querySelector("#redirectEnabled"),
  previewInput: document.querySelector("#previewInput"),
  previewOutput: document.querySelector("#previewOutput"),
  cleanTab: document.querySelector("#cleanTab"),
  openOptions: document.querySelector("#openOptions")
};

let settings = DEFAULT_SETTINGS;

init();

async function init() {
  settings = await loadSettings();
  renderSettings();
  renderPreview();

  fields.enabled.addEventListener("change", updateBooleanSetting);
  fields.cleanTrackingParams.addEventListener("change", updateBooleanSetting);
  fields.learnEnabled.addEventListener("change", updateBooleanSetting);
  fields.redirectEnabled.addEventListener("change", updateBooleanSetting);
  fields.previewInput.addEventListener("input", renderPreview);
  fields.cleanTab.addEventListener("click", cleanActiveTab);
  fields.openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(stored[SETTINGS_KEY]);
}

function renderSettings() {
  fields.enabled.checked = settings.enabled;
  fields.cleanTrackingParams.checked = settings.cleanTrackingParams;
  fields.learnEnabled.checked = settings.learnEnabled;
  fields.redirectEnabled.checked = settings.redirectEnabled;
}

async function updateBooleanSetting(event) {
  settings = {
    ...settings,
    [event.target.id]: event.target.checked
  };
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  renderPreview();
}

function renderPreview() {
  const result = previewUrl(fields.previewInput.value.trim(), settings);
  if (!result.ok) {
    fields.previewOutput.textContent = result.reason;
    return;
  }

  fields.previewOutput.textContent = result.changed
    ? result.cleanedUrl
    : "No change.";
}

async function cleanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    fields.previewOutput.textContent = "No active tab URL available.";
    return;
  }

  const result = previewUrl(tab.url, settings);
  if (result.ok && result.changed) {
    await chrome.tabs.update(tab.id, { url: result.cleanedUrl });
  }

  fields.previewOutput.textContent = result.changed
    ? result.cleanedUrl
    : result.reason || "Current tab is already swept.";
}
