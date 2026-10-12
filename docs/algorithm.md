# How the planner allocates subnets

Everything below is implemented in the `plan()` function of [`index.html`](../index.html) and exercised by [`test/engine.test.js`](../test/engine.test.js). The engine is about 60 lines; this page explains the decisions behind them.

## Inputs

| Input | Meaning | Default |
|---|---|---|
| Network address + prefix | The VPC / VNet / address plan, e.g. `10.0.0.0/16` | `10.0.0.0/16` |
| Cloud | Decides the reserved addresses, the smallest subnet and whether subnets are zonal | AWS |
| Zones | Availability Zones (AWS, generic). Azure and Google Cloud subnets span zones, so the engine uses one slot there | 3 |
| Reserve a future zone | Adds one empty slot per tier so a 4th zone can be added without renumbering | off |
| Tiers | Name, role (public / private / isolated / database / transit) and a size: either a prefix or a host count | three-tier preset |
| Contiguous tiers | Keep each tier in one summary block | on |
| Growth headroom | Percent added on top of host counts before rounding up | 50 |
| Existing networks | One CIDR per line, used for the overlap check | empty |

## Step 1 - normalise the network

The typed address is snapped down to the boundary of its prefix (`10.0.5.0/16` becomes `10.0.0.0/16`). The review flags this as a warning because the cloud API would have rejected the typed value.

## Step 2 - size each tier

- **By prefix:** used as typed, but never larger than the network itself (a `/20` tier inside a `/22` network is clamped to `/22`).
- **By hosts:** `hostsToPrefix(hosts, reserved, growth)` computes `need = ceil(hosts × (1 + growth/100)) + reserved` and returns the largest prefix whose size is at least `need`. With AWS's 5 reserved addresses, 50 hosts + 50 % growth = 75 + 5 = 80 addresses, so a `/25` (128). 251 hosts with 0 % growth is exactly a `/24`; 252 tips over to a `/23`.

## Step 3 - build the allocation items

Two modes:

- **Contiguous (default).** One item per tier. Its size is `subnet size × slots rounded up to a power of two`, where `slots = zones (+1 if a future zone is reserved)`. Three zones therefore round up to four slots: three `/20` subnets become one `/18` block. The spare slot is **alignment padding** - it is reported separately (see below) and is exactly the space a 4th zone would use.
- **Non-contiguous.** One item per subnet. Nothing is padded; subnets of different tiers may interleave.

## Step 4 - largest-first, aligned, first-fit packing

Items are sorted by size (largest first, then by tier order) and each one is placed at the **first aligned address** inside the network that does not overlap an item already placed. "Aligned" means the start address is a multiple of the item's own size, which is what makes the result a valid CIDR block. Placing the biggest blocks first guarantees that smaller blocks fill the gaps rather than fragmenting the space.

If an item does not fit, the planner records an error naming the tier and the block size (`private: a /18 block does not fit in 10.0.0.0/20 ...`) and continues with the remaining items, so you still see what *would* fit.

## Step 5 - free space as clean CIDRs

The gaps between placed blocks and the tail of the network are split into the fewest aligned CIDR blocks (`splitFree`). For the default three-tier plan in a `/16` the leftover is `10.0.72.0/21`, `10.0.80.0/20`, `10.0.96.0/19` and `10.0.128.0/17` - each one can be handed to a new tier without renumbering anything.

Alignment padding inside the tier blocks is listed as a separate category (`R.pad`). It is unused address space, but it is *inside* a tier's summary block, so the review tells you to reserve it for a future zone instead of giving it to another tier (which would break the "one route per tier" property).

## Step 6 - overlap check

Every line in "existing networks" is parsed as a CIDR with an optional label. If it overlaps the network, the review fails and `suggestFree()` proposes up to four same-sized blocks from the RFC 1918 ranges that overlap none of the listed networks.

## Step 7 - review

See [the rules table in the README](../README.md#the-design-rules-it-checks). Score = 100 − 25 per failing rule − 8 per warning, floored at 0.

## Why not just split the VPC into equal parts?

Equal splitting (the approach most CIDR calculators take) wastes space and produces subnets that are either too big for public tiers or too small for node pools. Real designs have a `/20` or `/19` for workloads next to a `/24` for load balancers. Largest-first aligned packing handles mixed sizes, keeps tiers summarisable and leaves the biggest possible free blocks.
