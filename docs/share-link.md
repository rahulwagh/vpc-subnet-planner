# Share links and privacy

The planner never sends anything to a server. The whole state lives in the URL fragment (the part after `#`), which browsers do not transmit in HTTP requests, so even the jhooq.com access logs never see your network design.

## Format

`#` + base64 of a compact JSON object:

| Key | Meaning | Example |
|---|---|---|
| `c` | cloud: `aws`, `azure`, `gcp`, `generic` | `"aws"` |
| `a` | network address | `"10.0.0.0"` |
| `p` | network prefix | `16` |
| `z` | zones | `3` |
| `f` | reserve a future zone (1/0) | `0` |
| `k` | contiguous tiers (1/0) | `1` |
| `g` | growth headroom in percent | `50` |
| `e` | existing networks, newline separated | `"10.1.0.0/16 on-prem"` |
| `t` | tiers as `[name, role, mode, value]` | `[["public","public","prefix",24]]` |
| `r` | include routing in the Terraform export (1/0) | `1` |

Example:

```
{"c":"aws","a":"10.0.0.0","p":16,"z":3,"f":1,"k":1,"g":50,"e":"","t":[["public","public","prefix",24],["private","private","prefix",20],["database","data","prefix",24]],"r":1}
```

becomes

```
https://jhooq.com/tools/vpc-subnet-planner/#eyJjIjoiYXdzIiwiYSI6IjEwLjAuMC4wIiwicCI6MTYsInoiOjMsImYiOjEsImsiOjEsImciOjUwLCJlIjoiIiwidCI6W1sicHVibGljIiwicHVibGljIiwicHJlZml4IiwyNF0sWyJwcml2YXRlIiwicHJpdmF0ZSIsInByZWZpeCIsMjBdLFsiZGF0YWJhc2UiLCJkYXRhIiwicHJlZml4IiwyNF1dLCJyIjoxfQ
```

Unknown keys are ignored and missing keys fall back to defaults, so links keep working across versions. Each example folder's README carries the link for that scenario.

## What is stored in the browser

Two `localStorage` keys, both optional: `jq-theme` (`light`/`dark`) and `jq-teach` (`1` when "Teach me" is on). No cookies, no analytics inside the tool itself.
