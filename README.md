# Lab L-13: iCommit App — File Storage Commitment Tracking with UHRP

A React/TypeScript frontend for submitting file storage commitments using the Universal Hash Resolution Protocol (UHRP). Built with `@bsv/sdk`, Material-UI, and LARS.

## What It Does

- Upload a file **or** enter a URL
- Set a hosting duration (in minutes)
- The app fetches the file, uploads it to `https://nanostore.babbage.systems`, and creates a UHRP token on-chain as a PushDrop output
- The UHRP URL is displayed after successful submission

## Prerequisites

- Node.js v20+
- Docker Desktop running
- Metanet Client running
- LARS configured (global server key set via `npx lars`)

## Setup and Start

```bash
npm install
npm run start
```

Then open `http://localhost:5173` in your browser.

## Project Structure

```
lab-l13/
├── deployment-info.json        # LARS config (frontend-only)
├── package.json                # Root package with workspaces
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx             # Main app layout
        ├── index.tsx           # React entry point
        ├── theme.ts            # MUI dark theme
        ├── App.scss            # Global styles
        ├── components/
        │   └── CommitmentForm.tsx   # UI form for submitting commitments
        └── utils/
            └── publishCommitment.ts # Core UHRP logic
```

## UHRP Token Fields

Each commitment token contains:
- Field 0: Protocol address (`1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG`)
- Field 1: SHA256 hash of the file (32 bytes)
- Field 2: Hosted file URL at nanostore.babbage.systems
- Field 3: Expiry time (Unix timestamp)
- Field 4: File size in bytes

Tokens are broadcast to the `tm_uhrp` topic via `TopicBroadcaster`.

## Key Packages

- `@bsv/sdk` — WalletClient, PushDrop, StorageUploader, TopicBroadcaster
- `@mui/material` — UI components
- `react-toastify` — Toast notifications
- `@bsv/lars` — Local development runtime
