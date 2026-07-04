---
title: "CCTV"
machine: "CCTV"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-03-14
techniques:
  - "IoT / embedded"
  - "Web enum"
  - "Default credentials"
  - "Vendor firmware analysis"
  - "Linux privesc"
cves: []
summary: "Easy Linux box themed around a video-surveillance appliance. Its shape mirrors the low-quality firmware that ships on real network cameras — a good primer for IoT engagements."
proof: "/proof/cctv.png"
draft: false
---

## Machine Summary

CCTV is an **Easy Linux box** deliberately shaped like a real IoT appliance — the kind of network camera that ships from a vendor with generous defaults, an under-authenticated admin panel, and a firmware image that treats least-privilege as a suggestion. The whole point is to practise the enumeration patterns that appear again and again in real IoT engagements, where the vulnerability is almost never a novel exploit and almost always a policy decision the vendor never revisited.

The foothold combines **an unauthenticated informational endpoint** with the **default-credential arithmetic** that plagues every "just this one appliance" deployment. Once authenticated, the operator has a functional admin session; from there the box hands over a shell through the ordinary vendor mechanisms rather than any exotic escape. Privilege escalation is a matter of noticing that these appliances typically boot with generous privileges — a reminder that "the vendor shipped it this way" is not a threat model.

CCTV is a good primer for anyone reading the OWASP IoT Top 10 or working through the Attify hardware-security training material.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon reveals an embedded web stack on the target — familiar enough to any operator who has looked at consumer network gear.</li>
  <li>The vendor's admin interface exposes informational endpoints without authentication that leak enough context to characterise the appliance.</li>
  <li>Credential arithmetic on the appliance's documented defaults produces working admin access.</li>
  <li>Vendor-native functionality inside the admin panel is sufficient to obtain an interactive shell on the underlying system.</li>
  <li>Standard local enumeration surfaces the generous privileges typical of embedded firmware, which resolve directly to root.</li>
</ol>

## What This Box Teaches

- **Default credentials are still the #1 IoT vulnerability.** Every appliance should require a password change at first boot.
- **Informational endpoints must be authenticated.** "It's just the model number" is how attackers pick their exploit.
- **Vendor firmware treats least-privilege as optional.** In a real engagement, that assumption is your privilege escalation.

## References

- [OWASP IoT Top 10](https://owasp.org/www-project-internet-of-things/)
- [OWASP — Embedded Application Security](https://owasp.org/www-project-embedded-application-security/)
- [Firmware Security Testing Methodology (FSTM)](https://github.com/scriptingxss/owasp-fstm)
- [Attify — IoT security research](https://blog.attify.com/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires CCTV.
