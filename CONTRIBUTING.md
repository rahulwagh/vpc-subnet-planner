# Contributing

Bug reports and pull requests are welcome. The whole tool is one file, so changes are easy to review.

## Ground rules

1. **No build step, no dependencies.** `index.html` must keep working when opened from disk. Fonts are the only external resource.
2. **Cloud facts come with a link.** If you change a reserved-address rule, a limit or a price, link the official documentation page in the pull request and in the `docs` field of `CLOUDS`.
3. **Tests first.** Add or adjust a case in `test/engine.test.js` for any engine change, then run:

   ```bash
   node --test test/engine.test.js     # or: npm test
   node scripts/generate-examples.js   # commit the regenerated examples/
   ```

   CI also runs `terraform validate` and `terraform fmt -check` on the AWS examples, and `bash -n` on the Azure and gcloud scripts.
4. **Privacy stays absolute.** Nothing may send the plan anywhere - no analytics, no fetches, no storage beyond the two `localStorage` keys for theme and teach mode.

## Local preview

```bash
node scripts/serve.js      # http://localhost:8080/
```

or simply open `index.html` in a browser.

## Reporting a planning bug

Paste the share link (the URL with the `#...` fragment). It reproduces the exact plan, including tiers and existing networks, with nothing else attached.
