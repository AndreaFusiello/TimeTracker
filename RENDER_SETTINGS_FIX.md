# 🔧 RENDER.COM SETTINGS - CONFIGURAZIONE CORRETTA

## ❌ PROBLEMA IDENTIFICATO

Le impostazioni manuali su Render.com stanno sovrascrivendo il nostro `render.yaml`.

**Impostazioni attuali sbagliate:**
- Build Command: `npm run build` ❌
- Start Command: `npm start` ❌  
- Health Check: `/health` ❌

## ✅ IMPOSTAZIONI CORRETTE DA APPLICARE

Vai su Render.com → Il tuo servizio → Settings → Build & Deploy e aggiorna:

### 1. Build Command
**Sostituisci** `npm run build` **con:**
```bash
npm install && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && mkdir -p dist/uploads && cp -r shared dist/
```

### 2. Start Command  
**Sostituisci** `npm start` **con:**
```bash
NODE_ENV=production node dist/index.js
```

### 3. Health Check Path
**Sostituisci** `/health` **con:**
```bash
/api/health
```

## 🔧 ALTERNATIVE: Aggiornare package.json

Se preferisci mantenere `npm run build` e `npm start`, posso aggiornare gli script nel package.json per funzionare correttamente.

## ⚡ AZIONE IMMEDIATA

**Opzione A**: Aggiorna manualmente le impostazioni su Render.com come sopra
**Opzione B**: Dimmi di aggiornare gli script npm nel package.json

Quale preferisci?