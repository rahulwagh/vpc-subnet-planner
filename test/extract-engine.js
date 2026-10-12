// Loads the planner engine (pure functions) out of index.html so it can run in Node without a DOM.
// Usage: const engine = require('./extract-engine')(pathToIndexHtml);
'use strict';
const fs = require('fs');
const vm = require('vm');
module.exports = function load(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.lastIndexOf('<script>') + '<script>'.length;
  const end = html.indexOf('let R=null;', start);
  if (start < 8 || end < 0) throw new Error('engine markers not found in ' + htmlPath);
  const src = html.slice(start, end) +
    '\n;({S,CLOUDS,ROLES,PRESETS,TABS,plan,review,suggestFree,hostsToPrefix,splitFree,parseCidr,cidrStr,ip2n,n2ip,size,overlaps,tfAws,cfnAws,azureCli,gcloud,csv,md,json});';
  const ctx = { document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  const e = vm.runInContext(src, ctx, { filename: 'planner-engine.js' });
  e.configure = (opts) => { Object.assign(e.S, opts); if (opts.preset) e.S.tiers = JSON.parse(JSON.stringify(e.PRESETS[opts.preset].tiers)); return e; };
  e.run = () => { const R = e.plan(); R.review = e.review(R); R.suggest = e.suggestFree(R); return R; };
  return e;
};
