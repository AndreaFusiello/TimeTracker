# TimeTracker Pro

Una applicazione web completa per la gestione delle ore lavorative e delle attrezzature per professionisti NDT (Non-Destructive Testing), progettata per semplificare il monitoraggio del flusso di lavoro, la gestione delle attrezzature e la collaborazione del team.

## 🚀 Caratteristiche Principali

### 📊 Gestione Ore Lavorative
- **Inserimento ore** con validazione e controlli automatici
- **Storico completo** con filtri avanzati e ricerca
- **Statistiche dettagliate** con breakdown degli straordinari italiani
- **Calcolo automatico** di straordinari settimanali, extra e festivi
- **Tracciamento mensile** con riconoscimento festività italiane

### 👥 Sistema Ruoli
- **Operatori**: Inserimento ore, visualizzazione dati personali
- **Team Leader**: Gestione team, editing ore, reports estesi
- **Amministratori**: Controllo completo, gestione utenti, configurazione sistema

### 🔧 Gestione Attrezzature NDT
- **Catalogazione completa** di strumenti MT, UT e sonde UT
- **Tracciamento calibrazioni** con avvisi di scadenza (30 giorni)
- **Gestione file** per certificati e foto attrezzature
- **Assegnazione operatori** con controllo accessi
- **Stati attrezzature** (attiva, manutenzione, dismessa)

### 📋 Gestione Procedure
- **Controllo versioni** con sistema di revisioni
- **Upload documenti** con supporto per PDF e immagini
- **Accesso basato su ruoli** (operatori vedono solo versioni correnti)
- **Tracciamento modifiche** con timestamp e autore

### 🎓 Sistema Qualifiche
- **Gestione certificazioni** NDT per operatori
- **Monitoraggio scadenze** con avvisi automatici
- **Upload documenti** certificati con sistema sicuro
- **Statistiche qualifiche** (attive, in scadenza, scadute)
- **Filtri avanzati** per tipo, livello e stato

### 📈 Reporting Avanzato
- **Export multipli**: PDF, CSV, Excel
- **Report personalizzati** per ruolo utente
- **Analisi temporali** con grafici interattivi
- **Dashboard statistiche** in tempo reale

## 🛠 Tecnologie Utilizzate

### Frontend
- **React 18** con TypeScript
- **Wouter** per routing client-side
- **TanStack Query** per gestione stato server
- **shadcn/ui** componenti basati su Radix UI
- **Tailwind CSS** per styling responsive
- **React Hook Form** con validazione Zod

### Backend
- **Node.js** con Express.js
- **TypeScript** con moduli ES
- **Drizzle ORM** per database type-safe
- **PostgreSQL** per storage dati
- **Autenticazione ibrida** (Replit Auth + locale)
- **Sessioni PostgreSQL** per scalabilità

### Database
- **PostgreSQL** via Neon serverless
- **Schema-first** approach con Drizzle
- **Migrazioni automatiche** con Drizzle Kit
- **Backup automatici** e alta disponibilità

## 🚀 Installazione e Deploy

### Sviluppo Locale (Replit)
```bash
# Clona il repository
git clone https://github.com/tuouser/timetracker-pro

# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev
```

### Deploy su Render.com
Segui la guida completa in [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)

### Variabili d'Ambiente
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secure-secret
REPLIT_DOMAINS=your-domain.com  # opzionale
```

## 📁 Struttura Progetto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componenti UI
│   │   ├── pages/         # Pagine applicazione
│   │   ├── hooks/         # React hooks personalizzati
│   │   └── lib/           # Utilities e configurazioni
├── server/                # Backend Express
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Layer di accesso dati
│   ├── replitAuth.ts      # Autenticazione Replit
│   └── uploads.ts         # Gestione file
├── shared/                # Codice condiviso
│   └── schema.ts          # Schemi database e validazione
├── uploads/               # File caricati
└── dist/                  # Build produzione
```

## 🔧 API Endpoints

### Autenticazione
- `GET /api/auth/user` - Informazioni utente corrente
- `POST /api/auth/login-local` - Login locale
- `GET /api/login` - Login Replit Auth
- `GET /api/logout` - Logout

### Ore Lavorative
- `GET /api/work-hours` - Lista ore (filtrate per ruolo)
- `POST /api/work-hours` - Inserimento nuove ore
- `PUT /api/work-hours/:id` - Aggiornamento ore
- `DELETE /api/work-hours/:id` - Eliminazione ore

### Statistiche
- `GET /api/stats/user` - Statistiche utente
- `GET /api/stats/team` - Statistiche team

### Attrezzature
- `GET /api/equipment` - Lista attrezzature
- `POST /api/equipment` - Nuova attrezzatura
- `PUT /api/equipment/:id` - Aggiornamento
- `DELETE /api/equipment/:id` - Eliminazione

### Procedure
- `GET /api/procedures` - Lista procedure
- `POST /api/procedures` - Nuova procedura
- `GET /api/procedures/:id/download` - Download file

### Qualifiche
- `GET /api/qualifications` - Lista qualifiche
- `POST /api/qualifications` - Nuova qualifica
- `PUT /api/qualifications/:id` - Aggiornamento
- `DELETE /api/qualifications/:id` - Eliminazione

## 🔒 Sicurezza

- **Autenticazione ibrida**: Supporto Replit Auth e account locali
- **Controllo accessi basato su ruoli**: Operatori, Team Leader, Admin
- **Sessioni sicure**: Storage PostgreSQL con cookie HTTP-only
- **Validazione input**: Zod schemas per tutti i dati
- **Upload sicuri**: Controllo tipi file e dimensioni
- **CSRF protection**: Protezione cross-site request forgery

## 📊 Caratteristiche Business

### Straordinari Italiani
- **Settimanali**: Lun-Ven oltre 8h/giorno
- **Extra**: Sabato (tutte le ore)
- **Festivi**: Domenica e festività nazionali italiane

### Tipi Attività NDT
- **MT/PT**: Magnetoscopia/Liquidi Penetranti
- **UT**: Ultrasuoni
- **VT**: Controllo Visivo
- **RT**: Radiografia
- **ET**: Correnti Indotte
- **LT**: Controllo Perdite

### Livelli Qualifica
- **Livello I**: Tecnico base
- **Livello II**: Tecnico qualificato
- **Livello III**: Tecnico esperto/supervisore

## 🤝 Contribuzione

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/nuova-funzionalita`)
3. Commit modifiche (`git commit -am 'Aggiunge nuova funzionalità'`)
4. Push al branch (`git push origin feature/nuova-funzionalita`)
5. Apri Pull Request

## 📝 Licenza

Questo progetto è protetto da copyright. Tutti i diritti riservati.

## 📞 Supporto

Per supporto tecnico o domande:
- Apri un issue su GitHub
- Contatta l'amministratore di sistema
- Consulta la documentazione in `/docs`

---

**TimeTracker Pro** - Sviluppato per professionisti NDT che richiedono precisione, affidabilità e scalabilità nella gestione delle ore lavorative e delle attrezzature.