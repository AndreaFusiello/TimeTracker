# Passi per Deploy su Render.com

## 🚨 ERRORE RISOLTO - Nuova Configurazione

L'errore sul deploy era dovuto alla configurazione build. Ora è stato sistemato:

### ✅ Soluzione Applicata:

1. **Render.yaml aggiornato** con comandi build diretti
2. **Build command semplificato** senza script bash
3. **Start command corretto** per produzione

### 📋 Passi per il Deploy:

1. **Collegare a GitHub:**
   - Vai su Replit Dashboard
   - Clicca "Connect to GitHub" 
   - Pusha tutto il codice

2. **Creare Database su Render.com:**
   - Vai su https://render.com
   - Crea nuovo PostgreSQL database
   - Prendi nota della Connection String

3. **Creare Web Service:**
   - Nuovo Web Service da GitHub repo
   - Scegli il repository TimeTracker
   - Render rileverà automaticamente render.yaml

4. **Configurare Variabili:**
   - `DATABASE_URL`: Connection string del database
   - `SESSION_SECRET`: Render genera automaticamente
   - `REPLIT_DOMAINS`: Il dominio Render assegnato (es: timetracker-pro.onrender.com)
   - `REPL_ID`: Il tuo Repl ID da Replit (visibile nell'URL)

### 🔧 Configurazione Aggiornata:

**render.yaml** ora usa comandi build diretti invece di script bash:
```yaml
buildCommand: npm install && vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && mkdir -p dist/uploads && cp -r shared dist/
startCommand: NODE_ENV=production node dist/index.js
```

### ✅ Build Locale Testato:
- Health check funzionante: `/api/health`
- Build frontend completato
- Build backend completato
- Server pronto per produzione

Il deploy ora dovrebbe funzionare senza errori!