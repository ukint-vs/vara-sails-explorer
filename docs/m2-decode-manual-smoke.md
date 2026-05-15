# M2 Decode Manual Smoke

This smoke is intentionally not CI-gated because public RPC availability and chain state can drift.

## Goal

Validate one real Vara/Sails program or code ID end to end:

```text
programId or codeId
  -> selected Vara RPC endpoint
  -> original code bytes
  -> embedded sails:idl
  -> cached idlHash + aliases
  -> pasted raw Sails payload decode
```

## Steps

1. Run `pnpm prepare:sails-js` after updating `/Users/ukintvs/Documents/projects/sails`.
2. Run `pnpm install`.
3. Start the explorer with `pnpm dev`.
4. Open `/decode`.
5. Select `Program` or `Code`.
6. Paste a known Sails program ID or code ID from the selected endpoint.
7. Click `Resolve`.
8. Confirm the source rail shows `chain_embedded`, `codeId`, `idlHash`, and cache state.
9. Paste a matching raw Sails payload.
10. Click `Decode payload`.
11. Confirm the result, route inspector, and copied diagnostics all name the same provenance.

## Expected Failures

- Program not found: check endpoint and ID.
- Code not found: check endpoint and code ID.
- Original code missing: endpoint did not expose original code bytes for this code.
- No embedded IDL: the code has no `sails:idl` custom section.
- Sails unknown: the payload does not match the resolved IDL or selected decode kind.
