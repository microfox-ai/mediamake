# Sources (TEST FIXTURE: a fictional phone and company; treat these as verified for this test)

Topic: Kestrel Phone's new assistant runs on the phone itself, with no cloud.

- [s1] Kestrel launch post, 3 Nov 2026 (https://kestrel.example/blog/on-device): the assistant runs a 3-billion-parameter model on the phone. Confirmed (vendor).
- [s2] Same post: the model fits in 4 GB of memory using 4-bit quantisation (each weight stored in 4 bits instead of 16). Confirmed (vendor).
- [s3] Same post: it answers in about 0.4 s and works offline. Vendor-claimed.
- [s4] The cloud model it replaced had 70 billion parameters (Kestrel's 2025 developer docs, https://kestrel.example/docs/2025). Confirmed.
- [s5] Independent test by PhoneBench, 6 Nov 2026 (https://phonebench.example/kestrel): about 2 % battery per hour of active use; it scored 71 % on their reasoning set against 84 % for the old cloud model. Primary, third party.
- [s6] Kestrel says no prompts leave the phone for the on-device features. Vendor-claimed; not independently verified.
