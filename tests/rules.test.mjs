import assert from "node:assert/strict";
import {
  buildDynamicCleanupRules,
  buildDynamicRedirectRules,
  buildDynamicRules,
  cleanUrl,
  previewUrl,
  redirectUrl
} from "../src/rules.js";

const settings = {
  enabled: true,
  cleanTrackingParams: true,
  redirectEnabled: true,
  stripEmptyParams: true,
  trackingParams: ["utm_source", "fbclid"],
  redirects: [
    {
      id: "yt",
      enabled: true,
      sourceHost: "youtube.com",
      includeSubdomains: true,
      targetOrigin: "https://yewtu.be"
    }
  ]
};

{
  const result = cleanUrl("https://example.com/a?utm_source=x&keep=1&fbclid=y#frag", settings);
  assert.equal(result.ok, true);
  assert.equal(result.cleanedUrl, "https://example.com/a?keep=1#frag");
}

{
  const result = cleanUrl("https://example.com/a?UTM_SOURCE=x&keep=1&unknown=y", settings);
  assert.equal(result.ok, true);
  assert.equal(result.cleanedUrl, "https://example.com/a?keep=1&unknown=y");
}

{
  const result = redirectUrl("https://www.youtube.com/watch?v=1", settings);
  assert.equal(result.ok, true);
  assert.equal(result.redirectedUrl, "https://yewtu.be/watch?v=1");
}

{
  const result = previewUrl("https://youtube.com/watch?v=1&utm_source=x", settings);
  assert.equal(result.ok, true);
  assert.equal(result.cleanedUrl, "https://yewtu.be/watch?v=1");
  assert.equal(result.redirectRuleId, "yt");
}

{
  const rules = buildDynamicRedirectRules(settings);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, 100);
  assert.equal(rules[0].action.type, "redirect");
  assert.match(rules[0].condition.regexFilter, /youtube/);
  assert.equal(rules[0].action.redirect.regexSubstitution, "https://yewtu.be/\\2");
}

{
  const rules = buildDynamicCleanupRules(settings);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, 1);
  assert.equal(rules[0].action.type, "redirect");
  assert.deepEqual(rules[0].action.redirect.transform.queryTransform.removeParams, [
    "fbclid",
    "utm_source"
  ]);
  assert.deepEqual(rules[0].condition.resourceTypes, ["main_frame"]);
}

{
  const rules = buildDynamicRules(settings);
  assert.equal(rules.length, 2);
  assert.deepEqual(rules.map((rule) => rule.id), [1, 100]);
}

{
  assert.deepEqual(buildDynamicRules({ ...settings, enabled: false }), []);
  assert.deepEqual(buildDynamicCleanupRules({ ...settings, cleanTrackingParams: false }), []);
  assert.deepEqual(buildDynamicRedirectRules({ ...settings, redirectEnabled: false }), []);
}

{
  const result = cleanUrl("notaurl", settings);
  assert.equal(result.ok, false);
}

console.log("rules.test.mjs: ok");
