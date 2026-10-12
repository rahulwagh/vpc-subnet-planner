# Changelog

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
