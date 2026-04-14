# Ketoy Console UI

React + Vite frontend for Ketoy Console.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy To Vercel

This project is prepared for Vercel deployment with SPA rewrites in [vercel.json](vercel.json).

### 1. Push repository

Push this folder to a Git provider (GitHub/GitLab/Bitbucket).

### 2. Import into Vercel

1. Create a new project in Vercel.
2. Select the repository.
3. Root directory: `console-ui` (if repository has multiple folders).
4. Build command: `npm run build`.
5. Output directory: `dist`.

### 3. Configure environment variables in Vercel

Set these for `Production` (and optionally `Preview`):

- `VITE_API_BASE_URL`
- `VITE_COGNITO_REGION`
- `VITE_COGNITO_CLIENT_ID`

You can copy default values from [.env.example](.env.example).

### 4. Redeploy

After saving env vars, trigger a new deployment.

## Why `vercel.json` is needed

The app uses React Router with browser history. Directly opening URLs like `/projects/<id>` needs rewrite-to-index fallback so Vercel serves `index.html` and routing works client-side.
