# Changelog

## 1.2.0 - 2026-10-12

- Guided flow is the default: one question per step (cloud, address space, zones, tiers, existing networks, review) with a stepper, Back/Next, validation and a summary card with edit links. The zones step is skipped for Azure and Google Cloud. "Expert view" restores the everything-on-one-screen layout; the choice is remembered.
- Live blueprint under the step card: the region frame, then the VPC box (drawn with its CIDR and range), then the zone columns, then subnets appearing one by one (name first, CIDR and usable count a moment later) with NAT / no-internet-route / TGW badges, Internet and Internet Gateway, existing networks as boxes joined by clear/overlap lines, and the free blocks. New pieces animate in; "Replay" plays the whole build again.
- Share link now also carries the step and the view, so a shared plan opens at the review step and replays the build.
- Official AWS, Microsoft Azure and Google Cloud logos on the cloud cards and the blueprint frame (dark-mode aware), a generic rack icon for data centre.
- Fixes: tier name field was placed in the wrong grid column; teach-mode video capped to 420 px; future-zone subnets no longer collide with their badges.

## 1.1.0 - 2026-10-12

- Alignment padding is now visible: in contiguous mode the spare slots that round a tier up to a power-of-two block are drawn on the map (hatched, dimmed), listed in the subnet table as `padding (<tier> block)` and reported by the design review with a one-click fix (reserve a future zone).
- Terraform export passes `terraform fmt -check`: trailing CIDR comments in `locals.subnets` are column-aligned and single-line `variable` / `output` blocks no longer carry extra spaces.
- Repository: engine tests (`node --test test/`), generated examples for six scenarios, CI that runs the tests, `terraform validate` + `fmt -check` on the AWS exports and syntax checks on the CLI scripts.

## 1.0.0 - 2026-10-12

- First public release at https://jhooq.com/tools/vpc-subnet-planner/
- AWS, Azure, Google Cloud and generic IPv4 rules (reserved addresses, smallest subnet, VPC size limits, zonal vs regional subnets).
- Largest-first aligned packing, contiguous tier blocks, future-zone reservation, sizing by prefix or by hosts with growth headroom.
- Design review with score, overlap check against existing networks with free-block suggestions, NAT gateway cost estimate, EKS node capacity hint.
- Exports: Terraform (cidrsubnet-derived, routing with NAT per zone, isolated route table, S3 gateway endpoint), CloudFormation, Azure CLI / Bicep, gcloud, Markdown, CSV, JSON.
- Proportional / equal-width address map, zone layout cards, Teach-me mode with the companion videos, dark mode, print, shareable link that encodes the whole plan in the URL fragment.
