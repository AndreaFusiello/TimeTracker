# 🚀 GUIDA COMPLETA DEPLOY SU RENDER.COM

## ⚙️ CONFIGURAZIONE AMBIENTE RENDER.COM

### 1. IMPOSTAZIONI BUILD & DEPLOY

Vai su **Render.com → Il tuo servizio → Settings**:

#### Build Command:
```bash
npm install && npm run build && mkdir -p dist/uploads && cp -r shared dist/
```

#### Start Command:
```bash
npm start
```

#### Health Check Path:
```bash
/api/health
```

### 2. VARIABILI D'AMBIENTE OBBLIGATORIE

Vai su **Render.com → Il tuo servizio → Environment**:

| Nome Variabile | Valore | Descrizione |
|----------------|--------|-------------|
| `NODE_ENV` | `production` | Ambiente di produzione |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Connessione PostgreSQL |
| `SESSION_SECRET` | `ed41a3c1265f4ac7256ef8525ff25c6d48001c59d21fd7ec851e9b9747a9dec1` | Chiave sessioni (generata) |
| `REPLIT_DOMAINS` | `timetracker-pro.onrender.com` | Dominio app Render |
| `ISSUER_URL` | `https://replit.com/oidc` | Provider OIDC Replit |
| `REPL_ID` | `[TUO_CLIENT_ID]` | Client ID registrato |

### 3. SETUP DATABASE POSTGRESQL

#### Opzione A: Database Render.com
1. Vai su **Render.com → New → PostgreSQL**
2. Nome: `timetracker-db`
3. User: `timetracker_user`
4. Database: `timetracker`
5. Copia la **Connection String** in `DATABASE_URL`

#### Opzione B: Database Esterno (Neon/Supabase)
1. Crea database su Neon.tech o Supabase
2. Copia connection string in `DATABASE_URL`

### 4. CONFIGURAZIONE REPLIT AUTH

Per ottenere il `REPL_ID`:

1. **Se hai già registrato l'app:**
   - Vai su Replit Account → Apps & Integrations
   - Trova la tua app e copia il Client ID

2. **Se devi registrare l'app:**
   - Vai su Replit Account → Developer → OAuth Apps
   - Crea nuova app con:
     - **Nome**: TimeTracker Pro
     - **Callback URL**: `https://timetracker-pro.onrender.com/api/callback`
     - **Homepage URL**: `https://timetracker-pro.onrender.com`
   - Copia il **Client ID** generato

### 5. VERIFICA CONFIGURAZIONE

Dopo il deploy, controlla:

- ✅ Health check: `https://timetracker-pro.onrender.com/api/health`
- ✅ Login: `https://timetracker-pro.onrender.com/api/login`
- ✅ Logs senza errori "clientId must be a non-empty string"

## 🔧 TROUBLESHOOTING

### Errore "vite: not found"
✅ **RISOLTO** - vite è ora dependency normale

### Errore "clientId must be a non-empty string"
- Verifica che `REPL_ID` sia impostato correttamente
- Controlla che `REPLIT_DOMAINS` corrisponda al dominio Render

### Errore database
- Verifica `DATABASE_URL` formato: `postgresql://user:pass@host:port/db`
- Controlla che il database sia accessibile

### Errore sessioni
- Verifica `SESSION_SECRET` sia almeno 32 caratteri
- Controlla tabella `sessions` esista nel database

## 📋 CHECKLIST DEPLOY

- [ ] Build command configurato
- [ ] Start command configurato  
- [ ] Health check path configurato
- [ ] Tutte le variabili d'ambiente inserite
- [ ] Database PostgreSQL configurato
- [ ] Replit OAuth app registrata
- [ ] Deploy eseguito
- [ ] Health check funzionante
- [ ] Login Replit funzionante