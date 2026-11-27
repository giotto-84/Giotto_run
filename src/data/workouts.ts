import type { SessionType, Step } from '../types';

/** Spiegazione semplice di ogni tipo di allenamento (Guida → Allenamenti). */
export interface WorkoutInfo {
  id: string;
  name: string;
  /** In una frase. */
  short: string;
  what: string;
  why: string;
  /** Sforzo percepito, scala 1–10. */
  effort: string;
  /** Quando compare nel piano. */
  when: string;
  example: string;
  /** Profilo di esempio per la barra colorata. */
  demo: Step[];
  tips: string[];
}

const st = (kind: Step['kind'], min: number): Step => ({ kind, sec: Math.round(min * 60), label: '' });
const reps = (n: number, a: Step, b: Step): Step[] => Array.from({ length: n }, (_, i) => (i < n - 1 ? [a, b] : [a])).flat();

export const WORKOUTS: WorkoutInfo[] = [
  {
    id: 'corsacammino',
    name: 'Corsa e cammino',
    short: 'Tratti di corsa leggera alternati a tratti di cammino.',
    what: 'Corri piano per un tempo breve, poi cammini per recuperare, e ripeti. Settimana dopo settimana i tratti di corsa si allungano e quelli di cammino si accorciano, fino a 30 minuti di corsa senza fermarti.',
    why: 'Il cuore e il fiato migliorano in fretta, ma muscoli, tendini e ossa hanno bisogno di più tempo. Camminare tra un tratto e l’altro permette di abituare tutto il corpo senza farsi male.',
    effort: '3–5 su 10 durante la corsa: devi riuscire a parlare. Se ti manca il fiato, rallenta: la velocità non conta.',
    when: 'Tutte le uscite della prima fase, per chi parte da zero o cammina soltanto.',
    example: '5 min di cammino veloce · 6 × (1 min di corsa + 2 min di cammino) · 5 min di cammino',
    demo: [st('riscaldamento', 5), ...reps(6, st('corsa', 1), st('cammino', 2)), st('defaticamento', 5)],
    tips: ['Corri così piano da sentirti quasi “ridicolo”: è giusto così.', 'Se un gradino ti sembra troppo duro, ripeti la settimana: nessuna fretta.'],
  },
  {
    id: 'facile',
    name: 'Corsa facile',
    short: 'Corsa tranquilla e continua, la base di tutto.',
    what: 'Una corsa a ritmo comodo, senza pause, per un tempo stabilito.',
    why: 'Costruisce la resistenza: il cuore diventa più efficiente, i muscoli imparano a usare meglio l’ossigeno e i grassi. È la parte più importante dell’allenamento, anche per chi vuole andare veloce.',
    effort: '4–5 su 10: respiri bene e riesci a fare frasi intere.',
    when: 'Quasi tutte le settimane, 1–2 volte. Spesso con il rinforzo dopo.',
    example: '5 min di cammino veloce · 30 min di corsa facile · 5 min di cammino',
    demo: [st('riscaldamento', 5), st('corsa', 30), st('defaticamento', 5)],
    tips: ['Se hai dubbi sul ritmo, vai più piano.', 'Va bene camminare in salita.'],
  },
  {
    id: 'lungo',
    name: 'Lungo',
    short: 'L’uscita più lunga della settimana, a ritmo lento.',
    what: 'Una corsa più lunga delle altre, a ritmo uguale o un po’ più lento della corsa facile.',
    why: 'Insegna al corpo a durare nel tempo: rinforza gambe e tendini e prepara alla distanza della gara.',
    effort: '4–5 su 10, costante dall’inizio alla fine.',
    when: 'Una volta a settimana, di solito nell’ultimo giorno di allenamento (spesso il weekend).',
    example: '5 min di cammino · 50 min di corsa lenta · 5 min di cammino',
    demo: [st('riscaldamento', 5), st('corsa', 50), st('defaticamento', 5)],
    tips: ['Porta acqua se supera i 45 minuti o se fa caldo.', 'Meglio finire con la sensazione di poter continuare.'],
  },
  {
    id: 'allunghi',
    name: 'Corsa facile con allunghi',
    short: 'Corsa facile e poi qualche breve accelerazione.',
    what: 'Dopo la corsa facile fai 4–6 accelerazioni di circa 20 secondi, aumentando piano la velocità, con 1 minuto di recupero camminando.',
    why: 'Abitua le gambe a muoversi più velocemente e migliora la tecnica, senza la fatica delle ripetute. È il primo passo verso gli allenamenti di velocità.',
    effort: 'Corsa facile 4–5; allunghi 7 su 10: veloci ma sciolti, mai uno scatto al massimo.',
    when: 'Nelle prime settimane dopo i 30 minuti continui, e qualche giorno prima della gara.',
    example: '30 min di corsa facile · 6 × (20 s di allungo + 1 min di recupero)',
    demo: [st('riscaldamento', 5), st('corsa', 30), ...reps(6, st('allunghi', 0.33), st('recupero', 1)), st('defaticamento', 5)],
    tips: ['Spalle e viso rilassati: pensa a “correre leggero”.', 'Fai gli allunghi su un tratto piano.'],
  },
  {
    id: 'ripetute',
    name: 'Ripetute',
    short: 'Tratti veloci ripetuti, con recupero tra uno e l’altro.',
    what: 'Dopo un buon riscaldamento corri più veloce per un tempo breve (da 1 a 5 minuti), poi recuperi camminando o trottando, e ripeti più volte.',
    why: 'Migliorano la velocità e la capacità di tenere un ritmo alto: è l’allenamento che più fa scendere il tempo sui 5 e 10 km.',
    effort: '7–8 su 10 nei tratti veloci: riesci a dire solo poche parole. Devi poter fare tutte le ripetizioni allo stesso ritmo.',
    when: 'Al massimo una volta a settimana, mai il giorno prima o dopo il lungo.',
    example: '10 min di riscaldamento · 6 × (2 min veloce + 2 min di recupero) · 8 min di defaticamento',
    demo: [st('riscaldamento', 10), ...reps(6, st('veloce', 2), st('recupero', 2)), st('defaticamento', 8)],
    tips: ['Le prime ripetute devono sembrare facili: se le ultime non riesci a farle, sei partito troppo forte.', 'Una pista di atletica è il posto ideale.'],
  },
  {
    id: 'fartlek',
    name: 'Fartlek',
    short: 'Cambi di ritmo liberi dentro una corsa.',
    what: '“Fartlek” in svedese vuol dire “gioco di velocità”: durante una corsa facile alterni tratti più svelti e tratti lenti, senza fermarti mai.',
    why: 'Allena la velocità in modo più leggero e divertente delle ripetute. Ottimo per chi corre per stare in forma.',
    effort: '6–7 su 10 nei tratti svelti, 4 su 10 in quelli lenti.',
    when: 'Una volta a settimana, in alternativa alle ripetute o al ritmo medio.',
    example: '10 min di riscaldamento · 8 × (1 min più svelto + 1 min e mezzo lento) · 8 min di defaticamento',
    demo: [st('riscaldamento', 10), ...reps(8, st('veloce', 1), st('recupero', 1.5)), st('defaticamento', 8)],
    tips: ['Puoi usare dei riferimenti: “svelto fino al prossimo lampione”.', 'Nei tratti lenti continua a correre, non camminare.'],
  },
  {
    id: 'medio',
    name: 'Ritmo medio',
    short: 'Tratti lunghi a ritmo impegnativo ma costante.',
    what: 'Uno o più tratti da 6 a 25 minuti a un ritmo “comodamente duro”, più veloce della corsa facile ma più lento delle ripetute.',
    why: 'Alza la “soglia”: il ritmo oltre il quale la fatica cresce in fretta. Serve per tenere un buon ritmo a lungo, soprattutto sui 10 km.',
    effort: '6–7 su 10: riesci a dire qualche parola, non una frase intera.',
    when: 'Per gli obiettivi 10 km e “migliorare il tempo”, a settimane alterne con le ripetute.',
    example: '10 min di riscaldamento · 2 × (8 min a ritmo medio + 2 min di recupero) · 8 min di defaticamento',
    demo: [st('riscaldamento', 10), st('veloce', 8), st('recupero', 2), st('veloce', 8), st('defaticamento', 8)],
    tips: ['Il ritmo deve essere uguale dall’inizio alla fine.', 'Meglio un po’ più lento che troppo veloce.'],
  },
  {
    id: 'test',
    name: 'Test',
    short: 'Una prova per misurare i progressi e aggiornare il piano.',
    what: 'Chi è all’inizio corre piano senza fermarsi finché riesce (al massimo 30 minuti). Chi corre già fa il test dei 12 minuti: percorre più strada possibile in 12 minuti a ritmo costante.',
    why: 'Il risultato aggiorna il piano: può farti saltare avanti nella scala corsa/cammino oppure ricalcolare i tuoi ritmi di allenamento.',
    effort: 'Corsa continua: 5 su 10, senza forzare. Test dei 12 minuti: 8–9 su 10, il massimo che riesci a tenere costante.',
    when: 'Ogni 4 settimane, nella settimana di scarico.',
    example: '10 min di riscaldamento · 12 min di test · 8 min di defaticamento',
    demo: [st('riscaldamento', 10), st('allunghi', 0.33), st('recupero', 1.7), st('test', 12), st('defaticamento', 8)],
    tips: ['Fallo riposato e non a stomaco pieno.', 'Su una pista: 1 giro = 400 metri, facile da contare.'],
  },
  {
    id: 'gara',
    name: 'Gara',
    short: 'Il giorno dell’obiettivo.',
    what: 'Riscaldamento leggero con un paio di allunghi, poi la gara.',
    why: 'È il momento di raccogliere quello che hai costruito. La settimana prima è più leggera, e il giorno prima riposi, per arrivare freschi.',
    effort: 'Parti a 6–7 su 10 e aumenta solo nell’ultimo terzo.',
    when: 'Il giorno che hai scelto nel questionario.',
    example: '10 min di riscaldamento · 2 allunghi · gara',
    demo: [st('riscaldamento', 10), st('allunghi', 0.33), st('recupero', 1), st('allunghi', 0.33), st('recupero', 2), st('gara', 30)],
    tips: ['Niente scarpe o vestiti nuovi il giorno della gara.', 'Colazione leggera almeno 2–3 ore prima.', 'L’errore più comune è partire troppo forte.'],
  },
  {
    id: 'rinforzo',
    name: 'Cammino + rinforzo',
    short: 'Un giorno senza corsa: cammino veloce ed esercizi.',
    what: '10 minuti di cammino veloce e poi un circuito di esercizi a corpo libero: squat, ponte per i glutei, polpacci, plank e altri.',
    why: 'Muscoli forti proteggono ginocchia, tendini e schiena. Per chi parte da zero è anche un modo per allenarsi senza caricare troppo le gambe.',
    effort: '5–6 su 10: gli ultimi movimenti di ogni esercizio devono costare un po’ di fatica.',
    when: 'Nei giorni in più per chi è all’inizio; per gli altri, 15 minuti dopo una corsa facile.',
    example: '10 min di cammino veloce · 2 giri del circuito di rinforzo (circa 15 minuti)',
    demo: [st('riscaldamento', 10), st('andature', 15)],
    tips: ['Fai i movimenti lenti e controllati.', 'Le spiegazioni sono in Guida → Esercizi.'],
  },
  {
    id: 'scarico',
    name: 'Settimana di scarico',
    short: 'Ogni 4 settimane si corre un po’ meno.',
    what: 'Una settimana con circa un quarto di corsa in meno, e il test.',
    why: 'Il corpo migliora mentre recupera, non mentre si allena. Lo scarico serve ad assorbire il lavoro fatto e a ripartire più forti, riducendo il rischio di infortuni.',
    effort: 'Come al solito, ma per meno tempo.',
    when: 'Ogni 4ª settimana del piano.',
    example: 'Le stesse uscite, più corte, con il test al posto di un allenamento.',
    demo: [st('riscaldamento', 5), st('corsa', 22), st('defaticamento', 5)],
    tips: ['Non “recuperare” correndo di più: lo scarico fa parte del piano.'],
  },
  {
    id: 'riscaldamento',
    name: 'Riscaldamento e defaticamento',
    short: 'L’inizio e la fine di ogni uscita.',
    what: 'All’inizio: 5–10 minuti di cammino veloce o corsa lentissima, più qualche esercizio di mobilità. Alla fine: 5–8 minuti di cammino o corsa lentissima e lo stretching.',
    why: 'Il riscaldamento prepara cuore, muscoli e articolazioni allo sforzo. Il defaticamento riporta il corpo piano piano a riposo.',
    effort: '2–3 su 10.',
    when: 'In ogni allenamento: sono già compresi nei tempi.',
    example: '5 min di cammino veloce + circonduzioni di caviglie e anche, slanci delle gambe',
    demo: [st('riscaldamento', 5), st('andature', 3)],
    tips: ['Con il freddo allunga il riscaldamento.', 'Lo stretching si fa alla fine, non prima.'],
  },
];

/** Quale scheda della guida spiega ogni tipo di seduta. */
export const WORKOUT_FOR_TYPE: Record<SessionType, string> = {
  corsacammino: 'corsacammino',
  facile: 'facile',
  lungo: 'lungo',
  allunghi: 'allunghi',
  ripetute: 'ripetute',
  fartlek: 'fartlek',
  medio: 'medio',
  test: 'test',
  gara: 'gara',
  rinforzo: 'rinforzo',
};
