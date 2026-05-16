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

1. Run `pnpm install`.
2. Start the explorer with `pnpm dev`.
3. Open `/decode`.
4. Select `Program` or `Code`.
5. Paste a known Sails program ID or code ID from the selected endpoint.
6. Click `Resolve`.
7. Confirm the source rail shows `chain_embedded`, `codeId`, `idlHash`, and cache state.
8. Paste a matching raw Sails payload.
9. Confirm auto-decode updates the result without a manual Decode click.
10. Confirm the result, route inspector, and copied diagnostics all name the same provenance.

## Expected Failures

- Program not found: check endpoint and ID.
- Code not found: check endpoint and code ID.
- Original code missing: endpoint did not expose original code bytes for this code.
- No embedded IDL: the code has no `sails:idl` custom section.
- Sails unknown: the payload does not match the resolved IDL or selected decode kind.
