# CIDR cheat sheet for cloud subnets

Usable hosts per prefix after each cloud's reserved addresses (AWS 5, Azure 5, Google Cloud 4, classic IPv4 2). "n/a" means the cloud does not allow a subnet that small.

| Prefix | Addresses | Subnet mask | AWS usable | Azure usable | GCP usable | Classic usable |
|---|---|---|---|---|---|---|
| /16 | 65,536 | 255.255.0.0 | 65,531 | 65,531 | 65,532 | 65,534 |
| /17 | 32,768 | 255.255.128.0 | 32,763 | 32,763 | 32,764 | 32,766 |
| /18 | 16,384 | 255.255.192.0 | 16,379 | 16,379 | 16,380 | 16,382 |
| /19 | 8,192 | 255.255.224.0 | 8,187 | 8,187 | 8,188 | 8,190 |
| /20 | 4,096 | 255.255.240.0 | 4,091 | 4,091 | 4,092 | 4,094 |
| /21 | 2,048 | 255.255.248.0 | 2,043 | 2,043 | 2,044 | 2,046 |
| /22 | 1,024 | 255.255.252.0 | 1,019 | 1,019 | 1,020 | 1,022 |
| /23 | 512 | 255.255.254.0 | 507 | 507 | 508 | 510 |
| /24 | 256 | 255.255.255.0 | 251 | 251 | 252 | 254 |
| /25 | 128 | 255.255.255.128 | 123 | 123 | 124 | 126 |
| /26 | 64 | 255.255.255.192 | 59 | 59 | 60 | 62 |
| /27 | 32 | 255.255.255.224 | 27 | 27 | 28 | 30 |
| /28 | 16 | 255.255.255.240 | 11 | 11 | 12 | 14 |
| /29 | 8 | 255.255.255.248 | n/a | 3 | 4 | 6 |
| /30 | 4 | 255.255.255.252 | n/a | n/a | n/a | 2 |

## How many subnets of size X fit in a /16?

| Subnet | Count in a /16 | Count in a /20 |
|---|---|---|
| /18 | 4 | - |
| /19 | 8 | - |
| /20 | 16 | 1 |
| /21 | 32 | 2 |
| /22 | 64 | 4 |
| /23 | 128 | 8 |
| /24 | 256 | 16 |
| /26 | 1,024 | 64 |
| /28 | 4,096 | 256 |

Rule: each extra bit of prefix halves the size and doubles the count.

## Private ranges (RFC 1918) and the one that is almost private

| Range | Size | Notes |
|---|---|---|
| `10.0.0.0/8` | 16,777,216 | 256 × /16 - the usual choice for cloud VPCs |
| `172.16.0.0/12` | 1,048,576 | 16 × /16 (`172.16.0.0` to `172.31.255.255`). Docker's default bridge networks live here |
| `192.168.0.0/16` | 65,536 | one /16 - home and small-office networks, so avoid it for anything that will peer with laptops over VPN |
| `100.64.0.0/10` | 4,194,304 | carrier-grade NAT (RFC 6598). Allowed by AWS as a secondary VPC CIDR and used for EKS custom networking; not RFC 1918 |

## Terraform cidrsubnet() in one line

`cidrsubnet(prefix, newbits, netnum)` returns the `netnum`-th block of size `prefix length + newbits` inside `prefix`.

- `cidrsubnet("10.0.0.0/16", 4, 2)` = the third `/20` = `10.0.32.0/20`
- `cidrsubnet("10.0.0.0/16", 8, 64)` = the 65th `/24` = `10.0.64.0/24`

The planner's Terraform export prints these for every subnet, with the resolved CIDR as a trailing comment, so a reviewer can check the maths without running `terraform plan`. The relationship is `newbits = subnet prefix − VPC prefix` and `netnum = (subnet address − VPC address) ÷ subnet size`.

## Alignment in one picture

A `/20` must start on a multiple of 4,096 addresses: `10.0.0.0`, `10.0.16.0`, `10.0.32.0`, `10.0.48.0` ... `10.0.8.0/20` is not a valid block (8 × 256 = 2,048 is not a multiple of 4,096), which is the error the cloud API returns as "invalid CIDR". The planner only ever produces aligned blocks and snaps a mistyped network address to its boundary.
