# 🔍 DEBUG DEPLOY RENDER.COM - VARIABILI D'AMBIENTE

## ✅ DEBUG AGGIUNTO AL CODICE

Ho aggiunto un sistema di debug nel file `server/index.ts` che controllerà automaticamente le variabili d'ambiente critiche all'avvio dell'applicazione.

**Cosa fa il debug:**
```typescript
// DEBUG: Check variabili d'ambiente fondamentali
['REPL_ID', 'REPLIT_DOMAINS', 'SESSION_SECRET', 'DATABASE_URL'].forEach(k => {
  if (!process.env[k] || !process.env[k]!.trim()) {
    console.error(`❌ Missing env var: ${k}`);
  } else {
    console.log(`✅ Found env var: ${k}`);
  }
});
```

## 📋 PROCEDURA DEPLOY CON DEBUG

### 1. Pushare il Codice
```bash
git add .
git commit -m "Add environment variables debug"
git push origin main
```

### 2. Deploy su Render.com
- Vai su **Render.com → Il tuo servizio**
- Clicca **"Manual Deploy"**
- Seleziona **"Clear build cache & deploy"**

### 3. Controllare i Log
Nei log di deploy vedrai:

**✅ Scenario Successo (tutte le variabili configurate):**
```
✅ Found env var: REPL_ID
✅ Found env var: REPLIT_DOMAINS  
✅ Found env var: SESSION_SECRET
✅ Found env var: DATABASE_URL
```

**❌ Scenario Errore (variabili mancanti):**
```
❌ Missing env var: REPL_ID
✅ Found env var: REPLIT_DOMAINS
❌ Missing env var: SESSION_SECRET  
✅ Found env var: DATABASE_URL
```

### 4. Correggere Errori
Se vedi `❌ Missing env var`, vai su:
- **Render.com → Il tuo servizio → Environment**
- Aggiungi la variabile mancante
- Redeploy

## 🔧 VARIABILI DA CONFIGURARE SU RENDER

Se nel debug vedi errori, configura queste variabili:

| Variabile | Valore | Come ottenerlo |
|-----------|--------|----------------|
| `REPL_ID` | Client ID OAuth | Registra app su Replit.com → Developer → OAuth Apps |
| `REPLIT_DOMAINS` | `timetracker-pro.onrender.com` | Dominio della tua app Render |
| `SESSION_SECRET` | `ed41a3c1265f4ac7256ef8525ff25c6d48001c59d21fd7ec851e9b9747a9dec1` | Chiave sicura generata |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Connection string database PostgreSQL |

## ⚡ PROSSIMI PASSI

1. **Deploy** con il debug attivo
2. **Controlla i log** per vedere quali variabili mancano
3. **Configura** le variabili mancanti su Render
4. **Redeploy** fino a vedere tutti ✅

**Il debug ti dirà esattamente cosa sistemare per far funzionare l'app!**