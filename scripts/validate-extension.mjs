import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

assert.equal(manifest.manifest_version, 3, "manifest_version must be 3");
assert.equal(manifest.version, "0.0.3", "manifest version must match v0.0.3");
assert.equal(manifest.name, "LinkSweep", "manifest name must be LinkSweep");
assert.deepEqual(manifest.permissions.sort(), [
  "activeTab",
  "declarativeNetRequest",
  "storage",
  "tabs"
].sort(), "permissions should stay minimal");
assert.deepEqual(manifest.host_permissions, ["<all_urls>"], "host permissions must be explicit");

const requiredFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  "src/rules.js",
  "src/popup.js",
  "src/options.js",
  "src/popup.css",
  "src/options.css",
  "README.md",
  "LICENSE"
];

for (const file of requiredFiles) {
  await access(file);
}

const moduleFiles = [
  "src/background.js",
  "src/options.js",
  "src/popup.js",
  "src/rules.js",
  "tests/rules.test.mjs",
  "scripts/build-extension.mjs",
  "scripts/validate-extension.mjs"
];

for (const file of moduleFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `${file} failed syntax check:\n${result.stderr}`);
}

console.log("validate-extension.mjs: ok");
