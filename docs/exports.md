# Exports

Every export is generated from the same plan object, so the CIDRs are identical across formats. The [examples](../examples/) folder holds a generated set for six scenarios; CI regenerates them and fails if they drift from the engine.

| Tab | Cloud | What you get | Validated by |
|---|---|---|---|
| Terraform | AWS | `locals.subnets` map with `cidrsubnet()` per subnet, `aws_vpc`, `aws_subnet` (for_each), and with routing on: Internet Gateway, public route table, one Elastic IP + NAT gateway per zone, one private route table per zone, an isolated route table for database/isolated/transit tiers, and a free S3 gateway endpoint attached to every non-public route table. Outputs `vpc_id` and `subnet_ids`. Free blocks are listed as a trailing comment | `terraform validate` and `terraform fmt -check` in CI against Terraform 1.16.2 and the current AWS provider (6.x) |
| Terraform | Azure / GCP | The Azure CLI / gcloud script (the Terraform tab falls back to the native CLI for those clouds) | `bash -n` |
| CloudFormation | AWS only | `AWS::EC2::VPC` plus one `AWS::EC2::Subnet` per subnet with `Fn::Select` over the region's zones | structure checked by the engine tests |
| Azure CLI / Bicep | Azure | `az network vnet create` and one `az network vnet subnet create` per tier | `bash -n` |
| gcloud | Google Cloud | `gcloud compute networks create` (custom mode) and one `gcloud compute networks subnets create` per tier | `bash -n` |
| Markdown | all | Table of name, tier, zone, CIDR, range and usable hosts, plus the free blocks | - |
| CSV | all | `name,tier,role,zone,cidr,first,last,total,usable,reserved` | - |
| JSON | all | Full plan including the reserved addresses of every subnet with their purpose | `JSON.parse` in CI |

## The Terraform routing choices, and why

- **One NAT gateway per zone.** A single NAT gateway is cheaper (about $33 per month instead of $99 for three) but makes every private subnet depend on one zone. The export builds the resilient layout; delete the extra gateways yourself if the cost matters more than the blast radius.
- **Per-zone private route tables.** Required for the per-zone NAT gateways - each private subnet routes to the gateway in its own zone, so cross-zone data charges and single-zone failures are avoided.
- **Isolated route table with no default route** for database, isolated and transit tiers. Databases should never have an internet route.
- **S3 gateway endpoint.** Free, and it keeps S3 traffic (backups, container image layers, Terraform state) off the NAT gateway's per-GB charge.
- **`map_public_ip_on_launch` only on public subnets.**
- **Availability Zones from the data source**, sliced to the number of zones in the plan, so the same file applies in any region.

What the export does *not* do, on purpose: security groups, network ACLs, flow logs, DNS zones and DynamoDB endpoints. Those depend on your workload; the planner stops at the address plan and the routes that follow from it.

## Future-zone slots

Subnets reserved for a future zone are **not** emitted as resources. They appear in the Markdown/CSV/JSON exports flagged as `future`, and in the Terraform file only as free-space comments. When you add the zone, add the entry to `locals.subnets` - the `cidrsubnet()` index is the next number in the tier's sequence.
