# Deploy su Render.com - TimeTracker Pro

Questa guida ti aiuterà a deployare TimeTracker Pro su Render.com con database PostgreSQL.

## Prerequisiti

1. Account GitHub con il repository del progetto
2. Account Render.com (gratuito)
3. Credenziali Replit Auth (opzionale per autenticazione Replit)

## Passo 1: Preparazione del Repository

Assicurati che il repository GitHub contenga tutti questi file:
- `render.yaml` - Configurazione Render
- `Dockerfile` - Container configuration
- `.dockerignore` - File da escludere dal build
- `package.json` - Dipendenze Node.js

## Passo 2: Configurazione Database

1. **Accedi a Render.com**
2. **Crea un nuovo Database PostgreSQL:**
   - Clicca "New +" → "PostgreSQL"
   - Nome: `timetracker-db`
   - Region: scegli la più vicina
   - Plan: Free (per test) o Starter (per produzione)
   - Clicca "Create Database"

3. **Salva le credenziali del database:**
   - Internal Database URL
   - External Database URL
   - Username
   - Password

## Passo 3: Deploy dell'Applicazione

### Opzione A: Deploy Automatico con render.yaml

1. **Crea nuovo Web Service:**
   - Clicca "New +" → "Web Service"
   - Connetti il repository GitHub
   - Render rileverà automaticamente il `render.yaml`

### Opzione B: Deploy Manuale

1. **Crea nuovo Web Service:**
   - Repository: collega il tuo repository GitHub
   - Branch: `main`
   - Root Directory: lascia vuoto
   - Environment: `Node`
   - Build Command: `chmod +x build.sh && ./build.sh`
   - Start Command: `cd dist && npm install --production && npm start`

2. **Configura le variabili d'ambiente:**
   ```
   NODE_ENV=production
   DATABASE_URL=[URL dal database creato al Passo 2]
   SESSION_SECRET=[genera una stringa casuale sicura]
   ```

3. **Per autenticazione Replit (opzionale):**
   ```
   REPLIT_DOMAINS=your-app-name.onrender.com
   ISSUER_URL=https://replit.com/oidc
   REPL_ID=[il tuo Repl ID da Replit]
   ```

## Passo 4: Configurazione Finale

1. **Attendi il deploy** (5-10 minuti)

2. **Verifica il funzionamento:**
   - Vai a `https://your-app-name.onrender.com/api/health`
   - Dovresti vedere: `{"status":"ok",...}`

3. **Inizializza il database:**
   - Il database verrà configurato automaticamente al primo avvio
   - Gli utenti admin possono creare nuovi account

## Variabili d'Ambiente Richieste

### Obbligatorie:
- `NODE_ENV=production`
- `DATABASE_URL` - URL del database PostgreSQL
- `SESSION_SECRET` - Stringa casuale per le sessioni (32+ caratteri)

### Opzionali (per Replit Auth):
- `REPLIT_DOMAINS` - Domini autorizzati per Replit Auth
- `ISSUER_URL` - URL dell'issuer OIDC (default: https://replit.com/oidc)
- `REPL_ID` - ID del tuo Repl su Replit

## Troubleshooting

### App non si avvia:
- Controlla i log in Render Dashboard
- Verifica che DATABASE_URL sia corretto
- Assicurati che NODE_ENV=production
- Verifica che il build script sia eseguibile: `chmod +x build.sh`

### Errori di build:
- **"vite: not found"**: Il build script ora usa `npx vite build` per risolvere questo
- **"esbuild: not found"**: Similmente risolto con `npx esbuild`
- **Dependenze mancanti**: Il build installa tutte le dipendenze incluse devDependencies

### Errori di database:
- Verifica la connessione al database PostgreSQL
- Controlla che le credenziali siano corrette
- Il database deve essere accessibile dall'app
- Attendi che il database sia completamente inizializzato

### Problemi di autenticazione:
- Controlla che SESSION_SECRET sia impostato e abbia almeno 32 caratteri
- Per Replit Auth: verifica REPLIT_DOMAINS e REPL_ID
- Assicurati che le sessioni siano configurate correttamente

### Deploy fallisce:
1. **Verifica i file richiesti** nel repository:
   - `build.sh` (con permessi di esecuzione)
   - `render.yaml` o configurazione manuale corretta
   - `package.json` e `package-lock.json`

2. **Controlla i log di build** per errori specifici
3. **Testa localmente** il build script: `./build.sh`

## Monitoraggio

- **Logs**: Render Dashboard → Service → Logs
- **Metriche**: Render Dashboard → Service → Metrics  
- **Health Check**: `https://your-app.onrender.com/api/health`

## Costi Stimati

### Plan Gratuito:
- Database PostgreSQL: Gratuito (1GB storage, condiviso)
- Web Service: Gratuito (512MB RAM, sleep dopo 15min inattività)

### Plan a Pagamento:
- Database: $7/mese (Starter)
- Web Service: $7/mese (Starter)

## Backup e Manutenzione

1. **Backup Database**: Render offre backup automatici
2. **Aggiornamenti**: Push su GitHub triggera deploy automatico
3. **Monitoring**: Configura alerting in Render Dashboard

## Supporto

Per problemi specifici:
1. Controlla i log di Render
2. Verifica la documentazione Render.com
3. Controlla la configurazione delle variabili d'ambiente