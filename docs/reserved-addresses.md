# Reserved addresses per subnet - AWS, Azure, Google Cloud

Every cloud takes a few addresses out of each subnet for its own infrastructure. This is why a `/24` does not give you 254 hosts and why the smallest allowed subnet differs per cloud.

| Cloud | Reserved | Addresses | Smallest subnet | Usable in the smallest | Usable in a /24 | Source |
|---|---|---|---|---|---|---|
| AWS | 5 | `.0` network, `.1` VPC router, `.2` Amazon-provided DNS (Route 53 Resolver), `.3` reserved for future use, last = network broadcast (not supported, still reserved) | `/28` | 11 | 251 | [Subnet sizing](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) |
| Azure | 5 | `.0` network, `.1` default gateway, `.2` and `.3` Azure DNS, last = broadcast | `/29` | 3 | 251 | [Virtual network FAQ](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq#are-there-any-restrictions-on-using-ip-addresses-within-these-subnets) |
| Google Cloud | 4 | `.0` network, `.1` default gateway, second-to-last reserved for future use, last = broadcast | `/29` | 4 | 252 | [Subnets](https://cloud.google.com/vpc/docs/subnets#reserved_ip_addresses_in_every_subnet) |
| Classic IPv4 | 2 | network and broadcast | `/30` | 2 | 254 | [RFC 4632](https://datatracker.ietf.org/doc/html/rfc4632) |

Notes the planner applies:

- On AWS the `.2` address of the **VPC** (base + 2) is the Route 53 Resolver; inside every subnet base + 2 is also reserved, which is what the table shows.
- AWS VPCs are `/16` to `/28`; secondary CIDR blocks can be added later, including from `100.64.0.0/10` (carrier-grade NAT space), which the review accepts with a warning.
- Azure and Google Cloud subnets are not zonal. Azure subnets span all availability zones of the region; Google Cloud subnets are regional. The planner therefore uses one subnet per tier on those clouds, and the "zones" selector only applies to AWS and generic designs.
- Google Cloud's VPC itself has no CIDR - the address plan you make here is a convention you enforce, not something the API validates.

## Where the addresses go in practice

| Consumer | Addresses per subnet | Typical tier |
|---|---|---|
| Application Load Balancer | minimum 8 free addresses per subnet in at least 2 zones (a `/27` or larger) | public |
| NAT gateway | 1 per gateway, usually 1 per zone | public |
| Interface VPC endpoint | 1 per endpoint per subnet | private |
| Lambda in a VPC | 1 per ENI (Hyperplane ENIs are shared) | private |
| EKS node (VPC CNI) | 1 per node + 1 per pod (29 pods on m5.large; prefix delegation hands out /28 slots) | private |
| RDS instance | 1 per instance (2 for Multi-AZ, plus more during failover and scaling) | database |
| Transit Gateway attachment | 1 per zone, in a dedicated `/28` | transit |

These are the numbers behind the review rules "an ALB needs at least a /27 per zone" and "/28 is for Transit Gateway attachments, not workloads".
