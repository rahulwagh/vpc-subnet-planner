| Name | Tier | Zone | CIDR | Range | Usable |
|---|---|---|---|---|---|
| firewall-a | firewall (Private) | a | `10.255.0.0/26` | 10.255.0.0 - 10.255.0.63 | 59 |
| firewall-b | firewall (Private) | b | `10.255.0.64/26` | 10.255.0.64 - 10.255.0.127 | 59 |
| firewall-c | firewall (Private) | c | `10.255.0.128/26` | 10.255.0.128 - 10.255.0.191 | 59 |
| public-a | public (Public) | a | `10.255.1.0/26` | 10.255.1.0 - 10.255.1.63 | 59 |
| public-b | public (Public) | b | `10.255.1.64/26` | 10.255.1.64 - 10.255.1.127 | 59 |
| public-c | public (Public) | c | `10.255.1.128/26` | 10.255.1.128 - 10.255.1.191 | 59 |
| tgw-attach-a | tgw-attach (Transit) | a | `10.255.2.0/28` | 10.255.2.0 - 10.255.2.15 | 11 |
| tgw-attach-b | tgw-attach (Transit) | b | `10.255.2.16/28` | 10.255.2.16 - 10.255.2.31 | 11 |
| tgw-attach-c | tgw-attach (Transit) | c | `10.255.2.32/28` | 10.255.2.32 - 10.255.2.47 | 11 |
| free | - | - | `10.255.2.64/26` | - | 64 addresses |
| free | - | - | `10.255.2.128/25` | - | 128 addresses |
| free | - | - | `10.255.3.0/24` | - | 256 addresses |
| free | - | - | `10.255.4.0/22` | - | 1,024 addresses |
| free | - | - | `10.255.8.0/21` | - | 2,048 addresses |
