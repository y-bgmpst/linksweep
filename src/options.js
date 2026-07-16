import { DEFAULT_SETTINGS, normalizeSettings } from "./rules.js";

const SETTINGS_KEY = "settings";
const trackingParams = document.querySelector("#trackingParams");
const redirectList = document.querySelector("#redirects");
const template = document.querySelector("#redirectTemplate");
const status = document.querySelector("#status");

let settings = DEFAULT_SETTINGS;

init();

async function init() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  settings = normalizeSettings(stored[SETTINGS_KEY]);
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
  renderRedirects();
}

function renderRedirects() {
  redirectList.replaceChildren();

  settings.redirects.forEach((rule, index) => {
    const row = template.content.firstElementChild.cloneNode(true);
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

