---
title: "Enigma"
machine: "Enigma"
status: active
os: Linux
difficulty: Easy
ownedUser: true
ownedRoot: true
date: 2026-07-04
techniques:
  - "Historical ciphers"
  - "Small-key brute force"
  - "Web enum"
  - "Linux privesc"
cves: []
summary: "Easy Linux Seasonal machine themed around the historical Enigma cipher. Foothold requires recognising a rotor-cipher output and reducing its key space with a targeted brute force; root is standard Linux enumeration with a small twist."
proof: "/proof/enigma.png"
draft: false
---

## Machine Summary

Enigma is an **Easy Linux Seasonal machine** that leans on its theme — the historical Enigma cipher — as both a puzzle and a hint. Rather than exposing a novel software vulnerability, the box challenges the operator to recognise the class of output it is producing and to reduce the corresponding key space using patient, structured brute force. The initial foothold rewards someone who has spent even a short time reading about classical cryptography and can distinguish rotor-cipher output from modern symmetric ciphertext at a glance.

Once initial access is achieved, the machine is a well-behaved small Linux target that emphasises careful enumeration rather than exotic post-exploitation. Privilege escalation follows a **classic Linux misconfiguration path** — the sort of thing that shows up in every junior-level engagement — and confirms that the harder half of the box is really the cryptographic front door. Enigma is a good box for anyone learning to *not skip a small artifact* on an enumeration pass, and for anyone practising the "read the theme" habit that pays off across HTB Seasonal machines.

## Attack Path Overview

<ol class="attack-path">
  <li>Recon reveals a small attack surface with a web front and a single supporting service; the target's theme is the strongest hint about which class of cipher is in play.</li>
  <li>Careful reading of the exposed application uncovers material that has been encoded rather than encrypted with modern primitives — a rotor-style cipher output.</li>
  <li>Reducing the key space using a scripted small-key search recovers plaintext credentials.</li>
  <li>Recovered credentials produce an interactive shell as a low-privileged user.</li>
  <li>Standard local enumeration surfaces a familiar misconfiguration in the sudo policy that resolves to root.</li>
</ol>

## What This Box Teaches

- **Recognising cryptographic families before attacking them.** A rotor cipher's fingerprint is unmistakable to a trained eye — this box makes that recognition worth points.
- **Small key spaces are attackable in code.** Modern CPUs eat historical key spaces for breakfast; if the algorithm is old, do not wait to see if brute force is worth trying — it is.
- **Enumeration discipline matters even on Easy boxes.** The intended solution lives in an artifact that a rushed operator would skip.

## References

- [Wikipedia — Enigma machine](https://en.wikipedia.org/wiki/Enigma_machine)
- [Practical Cryptography — classical cipher primer](https://practicalcryptography.com/ciphers/)
- [GTFOBins — Linux binaries commonly abused for privesc](https://gtfobins.github.io/)

> **Compliance note.** This summary is spoiler-safe and describes only the *class* of vulnerabilities and techniques exercised. The full walkthrough — with commands, payloads, and defensive detections — will publish here the moment HTB officially retires Enigma.
