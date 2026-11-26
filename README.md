# Giotto Run

Allenatore di corsa personale: web app (PWA) in italiano, installabile su iPhone e Android, gemella di [Giotto PT](https://giotto-84.github.io/Ruolino-/).

**App:** https://giotto-84.github.io/Giotto_run/

## Cosa fa (versione base)

- Questionario iniziale con PAR-Q (blocca e invita al medico in caso di risposte a rischio); import dei dati da un backup di Giotto PT.
- Piano a regole fisse: scala corsa/cammino da 30 secondi a 30 minuti, poi corse facili, lungo, allunghi, ripetute, fartlek e ritmo medio. Obiettivi: iniziare a correre, 5 km, 10 km, migliorare il tempo, forma. Data gara facoltativa.
- Bilancio automatico a fine settimana: avanza, ripete o alleggerisce (fatica e dolori). Scarico + test ogni 4 settimane. Mai due giorni intensi di fila, anche quando sposti una seduta.
- Allenamento guidato: timer, voce in italiano, bip, vibrazione (solo Android), schermo acceso, GPS facoltativo (solo a schermo acceso).
- Registrazione a mano o import GPX (Open GPX Tracker, Strava, Garmin…), sforzo 1–10, dolore, scarpe.
- Esercizi spiegati: riscaldamento, andature, rinforzo, stretching (foto Free Exercise DB, pubblico dominio, o disegni; video tramite ricerca YouTube).
- Progressi: km a settimana, passo, test, peso, km delle scarpe, storico.
- Promemoria tramite file calendario `.ics`; backup/ripristino in JSON; dati solo sul telefono.

## Sviluppo

```bash
npm install
npm run dev        # sviluppo
npm test           # test della logica
npm run build      # build di produzione
```

Prova completa in viewport iPhone (chiaro e scuro) con screenshot:

```bash
npm run build && npx vite preview --port 4173 &
node e2e/flow.mjs   # screenshot in ./screenshots
```

Pubblicazione: il workflow `.github/workflows/deploy.yml` pubblica su GitHub Pages a ogni push su `main` (Settings → Pages → Source: GitHub Actions).
