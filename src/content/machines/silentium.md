---
title: "Silentium"
machine: "Silentium"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-04-30
techniques:
  - "Web enum"
  - "Steganography"
  - "Metadata analysis"
  - "Linux privesc"
cves: []
summary: "Quiet Easy Linux box themed around what you don't hear — steganography, file metadata, and patient artifact review. Foothold hides inside published assets; root through a classic Linux privesc."
proof: "/proof/silentium.png"
draft: false
---

## Machine Summary

Silentium is a **quiet, patient Easy Linux box** whose theme is exactly what makes it interesting: what you *don't* hear. The intended solution lives inside artifacts that most operators would download, glance at, and delete without a second thought. The box teaches the reflex of asking "what is this file *for*?" before asking "what does it look like?" — and it rewards the operator who has spent five minutes with `binwalk`, `exiftool`, and `steghide` on training material before trying them here.

The foothold is a **steganographic recovery** from published assets on the web front. The intended payload is not encrypted or heavily obfuscated — it is simply hidden in a channel most operators do not check. Once decoded, the recovered material is sufficient to reach an authenticated position on the machine. Privilege escalation is a **classic Linux privesc path** surfaced by standard enumeration, and reinforces that the interesting half of the box is really the initial artifact review.

Silentium is a good box for practising the CTF muscles that transfer to real DFIR work — reading file metadata, spotting anomalies in file magic, and knowing which tools recover which formats.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon surfaces a small attack surface with a web front hosting a modest collection of published artifacts.</li>
  <li>Downloading and reviewing those artifacts uncovers a steganographic channel that the operator has to recognise before attacking.</li>
  <li>Standard tooling recovers hidden material from the intended artifact without the need to guess a passphrase.</li>
  <li>The recovered material is sufficient to reach an authenticated position on the machine.</li>
  <li>Standard local enumeration surfaces a familiar Linux privesc primitive that resolves to root.</li>
</ol>

## What This Box Teaches

- **File metadata is a leak channel.** Strip on upload; audit assets before publishing.
- **`binwalk` and `exiftool` are cheap.** Run them on every artifact from an untrusted origin — the ROI is enormous.
- **Do not publish artifacts you have not reviewed.** A single unstripped image can hide a full attack payload.

## References

- [ForensicsWiki — Steganography](https://forensics.wiki/steganography/)
- [ExifTool documentation](https://exiftool.org/)
- [binwalk documentation](https://github.com/ReFirmLabs/binwalk)
- [OWASP — Testing for Sensitive Data Exposure](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/03-Testing_for_Sensitive_Information_Sent_via_Unencrypted_Channels)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Silentium.
