import {
  DEFAULT_LEARNED_PARAMS,
  DEFAULT_SETTINGS,
  dismissLearnedParam,
  getLearnedSuggestions,
  normalizeLearnedParams,
  normalizeSettings
} from "./rules.js";

const SETTINGS_KEY = "settings";
const LEARNED_KEY = "learnedParams";
const trackingParams = document.querySelector("#trackingParams");
const redirectList = document.querySelector("#redirects");
const suggestionsList = document.querySelector("#suggestions");
const redirectTemplate = document.querySelector("#redirectTemplate");
const suggestionTemplate = document.querySelector("#suggestionTemplate");
const status = document.querySelector("#status");

let settings = DEFAULT_SETTINGS;
let learnedParams = DEFAULT_LEARNED_PARAMS;

init();

async function init() {
  const stored = await chrome.storage.local.get([SETTINGS_KEY, LEARNED_KEY]);
  settings = normalizeSettings(stored[SETTINGS_KEY]);
  learnedParams = normalizeLearnedParams(stored[LEARNED_KEY]);
  render();

  document.querySelector("#addRedirect").addEventListener("click", () => {
    settings.redirects.push({
      id: `custom-${Date.now()}`,
      enabled: true,
      sourceHost: "",
      includeSubdomains: true,
      targetOrigin: "https://"
    });
    renderRedirects();
  });

  document.querySelector("#save").addEventListener("click", save);
}

function render() {
  trackingParams.value = settings.trackingParams.join("\n");
  renderSuggestions();
  renderRedirects();
}

function renderSuggestions() {
  const suggestions = getLearnedSuggestions(learnedParams, settings);
  suggestionsList.replaceChildren();

  if (suggestions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "suggestion-empty";
    empty.textContent = "No suggestions yet.";
    suggestionsList.append(empty);
    return;
  }

  for (const suggestion of suggestions) {
    const row = suggestionTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="param"]').textContent = suggestion.param;
    row.querySelector('[data-field="meta"]').textContent = `${suggestion.count} seen on ${suggestion.domains.join(", ")}`;
    row.querySelector('[data-action="add"]').addEventListener("click", () => addSuggestion(suggestion.param));
    row.querySelector('[data-action="dismiss"]').addEventListener("click", () => dismissSuggestion(suggestion.param));
    suggestionsList.append(row);
  }
}

function renderRedirects() {
  redirectList.replaceChildren();

  settings.redirects.forEach((rule, index) => {
    const row = redirectTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-field="enabled"]').checked = rule.enabled;
    row.querySelector('[data-field="sourceHost"]').value = rule.sourceHost;
    row.querySelector('[data-field="targetOrigin"]').value = rule.targetOrigin;
    row.querySelector('[data-field="includeSubdomains"]').checked = rule.includeSubdomains;
    row.querySelector('[data-action="remove"]').addEventListener("click", () => {
      settings.redirects.splice(index, 1);
      renderRedirects();
    });
    redirectList.append(row);
  });
}

async function save() {
  const redirects = [...redirectList.querySelectorAll(".redirect-row")].map((row, index) => ({
    id: settings.redirects[index]?.id || `custom-${index}`,
    enabled: row.querySelector('[data-field="enabled"]').checked,
    sourceHost: row.querySelector('[data-field="sourceHost"]').value,
    includeSubdomains: row.querySelector('[data-field="includeSubdomains"]').checked,
    targetOrigin: row.querySelector('[data-field="targetOrigin"]').value
  }));

  const nextSettings = normalizeSettings({
    ...settings,
    trackingParams: trackingParams.value.split(/\r?\n/),
    redirects
  });

  settings = nextSettings;
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  render();
  status.textContent = "Saved.";
  window.setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

async function addSuggestion(param) {
  settings = normalizeSettings({
    ...settings,
    trackingParams: [
      ...settings.trackingParams,
      param
    ]
  });
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  render();
  showStatus("Suggestion added.");
}

async function dismissSuggestion(param) {
  learnedParams = dismissLearnedParam(learnedParams, param);
  await chrome.storage.local.set({ [LEARNED_KEY]: learnedParams });
  renderSuggestions();
  showStatus("Suggestion dismissed.");
}

function showStatus(message) {
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "";
  }, 1800);
}
