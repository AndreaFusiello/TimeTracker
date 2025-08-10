# 🔧 RENDER.COM - CONFIGURAZIONE VARIABILI D'AMBIENTE

## 📋 VARIABILI DA INSERIRE SU RENDER.COM

Vai su **Render.com → Il tuo servizio → Environment** e aggiungi:

### 1. Variabili Base (OBBLIGATORIE)
```
NODE_ENV = production
```

### 2. Database PostgreSQL
```
DATABASE_URL = postgresql://user:password@host:port/database
```
**Come ottenerla:**
- Crea database PostgreSQL su Render.com o usa Neon/Supabase
- Copia la connection string completa

### 3. Sicurezza Sessioni
```
SESSION_SECRET = ed41a3c1265f4ac7256ef8525ff25c6d48001c59d21fd7ec851e9b9747a9dec1
```
*(Chiave generata, sicura per produzione)*

### 4. Configurazione Replit Auth
```
REPLIT_DOMAINS = timetracker-pro.onrender.com
ISSUER_URL = https://replit.com/oidc
REPL_ID = [IL_TUO_CLIENT_ID_REPLIT]
```

## 🔑 COME OTTENERE IL REPL_ID

**IMPORTANTE**: Se usi Replit Auth (OIDC), il `REPL_ID` è automatico!

### Su Replit (Automatico)
- Il `REPL_ID` è fornito automaticamente come variabile d'ambiente
- Non serve registrazione OAuth separata

### Su Render.com (Manuale)
1. Controlla il valore su Replit: guarda nei Secrets o esegui `echo $REPL_ID`
2. Copia questo valore esatto in Render.com come variabile `REPL_ID`
3. Oppure usa un valore placeholder per test iniziale

## ⚠️ IMPORTANTE

- **DATABASE_URL** deve essere PostgreSQL valido
- **REPL_ID** non deve essere vuoto o l'auth fallirà
- **REPLIT_DOMAINS** deve corrispondere al dominio Render
- **SESSION_SECRET** deve essere lungo almeno 32 caratteri

## 🚀 DOPO LA CONFIGURAZIONE

1. Salva tutte le variabili
2. Trigger deploy manuale
3. Verifica health check: `/api/health`
4. Testa login: `/api/login`

**Se tutto è configurato correttamente, l'app dovrebbe funzionare senza errori!**