export interface Tip {
  id: string;
  title: string;
  intro: string;
  points: string[];
}

export const TIPS: Tip[] = [
  {
    id: 'sforzo',
    title: 'Quanto forte devo andare?',
    intro: 'All’inizio non servono orologi: basta ascoltare il respiro. Dopo ogni corsa l’app ti chiede uno sforzo da 1 a 10.',
    points: [
      '1–3 · Facilissimo: potresti cantare.',
      '4–5 · Corsa facile: riesci a parlare con frasi intere. È il ritmo della maggior parte delle uscite.',
      '6–7 · Medio: parli a fatica, poche parole.',
      '8–9 · Duro: riesci a dire solo una parola. Solo nelle ripetute brevi.',
      '10 · Massimo: non usarlo in allenamento.',
      'Regola d’oro: se sei in dubbio, vai più piano. Si migliora con la costanza, non con la fatica.',
    ],
  },
  {
    id: 'gps',
    title: 'GPS: come registrare le corse',
    intro: 'Giotto Run è una web app: su iPhone (e su molti Android) il GPS funziona solo con lo schermo acceso e l’app aperta davanti.',
    points: [
      'Se vuoi usare il GPS di Giotto Run: tocca “Usa il GPS” prima di partire e tieni il telefono in mano o in una fascia da braccio con lo schermo acceso. L’app prova a tenerlo acceso da sola.',
      'Se blocchi lo schermo o apri un’altra app, la registrazione si interrompe (il timer invece continua a contare correttamente).',
      'Soluzione consigliata: registra la corsa con un’app che funziona anche a schermo spento e poi importa il file GPX in Giotto Run.',
      'iPhone: “Open GPX Tracker” (gratuita, senza account). Premi Start, corri, premi Stop, poi “Salva” e condividi il file .gpx con “Salva su File”. In Giotto Run: Registra una corsa → Importa GPX.',
      'Android: app come “GPX Tracker” o “OsmAnd” esportano il file GPX allo stesso modo.',
      'Strava, Garmin Connect e Coros permettono di esportare il GPX di ogni attività dal sito o dall’app.',
      'Senza GPS va benissimo lo stesso: gli allenamenti sono a tempo e la voce ti guida.',
    ],
  },
  {
    id: 'scarpe',
    title: 'Scarpe',
    intro: 'Non serve la scarpa più costosa: serve quella comoda per te.',
    points: [
      'Compra scarpe da running (non da tennis o da passeggio), meglio in un negozio specializzato dove puoi provarle correndo.',
      'Prendile mezza misura o una misura più grandi del solito: davanti all’alluce deve restare un dito di spazio.',
      'Scegli la più comoda appena la indossi: è il criterio più affidabile.',
      'Per strada e parco va bene una scarpa “neutra” ammortizzata. Per sterrati fangosi esistono le scarpe da trail.',
      'Le scarpe durano circa 600–800 km: aggiungile in Profilo → Scarpe e l’app ti avvisa quando è ora di cambiarle.',
      'Calze tecniche (non di cotone) evitano le vesciche.',
    ],
  },
  {
    id: 'infortuni',
    title: 'Prevenire gli infortuni',
    intro: 'Quasi tutti gli infortuni dei principianti nascono dal fare troppo, troppo presto.',
    points: [
      'Non aumentare i km di una settimana più del 10% circa rispetto alla precedente: l’app lo fa per te, e ti avvisa se corri molto di più del previsto.',
      'Mai due giorni intensi di fila: tra le uscite impegnative ci vuole un giorno facile o di riposo.',
      'Il riposo fa parte dell’allenamento: è lì che il corpo si rinforza.',
      'Fai il rinforzo 1–2 volte a settimana (15 minuti): glutei, polpacci e busto forti proteggono ginocchia e tendini.',
      'Fastidio leggero che sparisce dopo il riscaldamento: puoi continuare con prudenza. Dolore che aumenta correndo, che ti fa zoppicare o che c’è anche a riposo: fermati.',
      'Se il dolore non passa in qualche giorno, senti un medico o un fisioterapista.',
      'Dopo ogni corsa dimmi se hai avuto dolore: se si ripete, il piano si alleggerisce da solo.',
    ],
  },
  {
    id: 'tapis',
    title: 'Tapis roulant',
    intro: 'Ottimo quando piove o è buio. Due accorgimenti:',
    points: [
      'Imposta la pendenza all’1%: simula meglio la corsa all’aperto.',
      'Nel piano trovi i ritmi anche in km/h, da impostare sul display.',
      'Il tempo “passa più lento”: usa gli avvisi a voce di Giotto Run per sapere quando cambiare velocità.',
    ],
  },
  {
    id: 'alimentazione',
    title: 'Mangiare e bere (consigli generali)',
    intro: 'Indicazioni di buon senso, non una dieta. Per esigenze particolari rivolgiti a un medico o a un nutrizionista.',
    points: [
      'Prima di correre: un pasto leggero 2–3 ore prima, oppure uno spuntino piccolo (una banana, una fetta biscottata con marmellata) 30–60 minuti prima.',
      'Per corse sotto l’ora non servono integratori o gel.',
      'Bevi durante la giornata. Con il caldo porta acqua per uscite oltre i 45 minuti.',
      'Dopo la corsa: bevi e fai un pasto normale con carboidrati e proteine (es. pasta, legumi, yogurt, uova).',
      'Se l’obiettivo è dimagrire, la corsa aiuta molto, ma conta soprattutto l’alimentazione di tutti i giorni: evita di “premiarti” con dolci dopo ogni uscita.',
    ],
  },
  {
    id: 'sicurezza',
    title: 'Sicurezza',
    intro: '',
    points: [
      'Di sera indossa qualcosa di catarifrangente o una luce: devi essere visto.',
      'Corri contro il senso di marcia delle auto, dove non c’è marciapiede.',
      'Con le cuffie tieni il volume basso, o usa un solo auricolare.',
      'Con il caldo corri al mattino presto o la sera e rallenta. Con il freddo vestiti “a cipolla”: dopo 10 minuti devi stare bene, non al caldo già alla partenza.',
      'Se senti dolore al petto, capogiri o fiato corto insolito: fermati subito e chiedi aiuto.',
    ],
  },
  {
    id: 'installa',
    title: 'Installare l’app sul telefono',
    intro: 'Giotto Run si installa dal browser, senza App Store.',
    points: [
      'iPhone (Safari): tocca il pulsante Condividi (il quadrato con la freccia), poi “Aggiungi alla schermata Home”.',
      'Android (Chrome): tocca il menu ⋮ in alto a destra, poi “Installa app” (o “Aggiungi a schermata Home”).',
      'I dati restano solo sul telefono: fai ogni tanto un backup da Profilo → Backup.',
      'Su Android durante gli allenamenti guidati il telefono vibra anche a ogni cambio; su iPhone Safari non permette la vibrazione, quindi ci sono voce e bip.',
    ],
  },
];
