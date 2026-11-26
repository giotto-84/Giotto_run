/**
 * Esercizi per runner, spiegati per principianti.
 * `img` = cartella di free-exercise-db (pubblico dominio, github.com/yuhonas/free-exercise-db).
 * `pose` = disegno semplice fatto apposta (src/components/Figure.tsx) quando non esiste una foto libera.
 */
export type ExCategory = 'riscaldamento' | 'andature' | 'rinforzo' | 'stretching';

export interface Exercise {
  id: string;
  name: string;
  cat: ExCategory;
  img?: string;
  pose?: string;
  /** Quantità consigliata, es. "2 × 12" o "30 s per lato". */
  dose: string;
  why: string;
  steps: string[];
  mistakes: string[];
  /** Nota sull'immagine (es. "in foto con i manubri: tu fallo a corpo libero"). */
  imgNote?: string;
  video: string;
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const EXERCISES: Exercise[] = [
  /* ---------------- Riscaldamento ---------------- */
  {
    id: 'caviglie',
    name: 'Circonduzioni delle caviglie',
    cat: 'riscaldamento',
    img: 'Ankle_Circles',
    dose: '10 giri per verso, per piede',
    why: 'Scioglie le caviglie, che a ogni passo assorbono il colpo.',
    steps: ['In piedi, appoggiati a un muro o a un albero.', 'Alza leggermente un piede e appoggia solo la punta a terra.', 'Disegna dei cerchi ampi con il tallone, prima in un verso poi nell’altro.', 'Cambia piede.'],
    mistakes: ['Fare cerchi piccolissimi e veloci: meglio ampi e lenti.'],
    video: yt('circonduzioni caviglie riscaldamento corsa'),
  },
  {
    id: 'slanci',
    name: 'Slanci della gamba avanti e indietro',
    cat: 'riscaldamento',
    pose: 'slanci',
    dose: '10 slanci per gamba',
    why: 'Prepara anche e muscoli posteriori della coscia al movimento della corsa.',
    steps: ['Appoggia una mano a un muro o a un palo, di fianco.', 'Stai dritto sulla gamba vicina al muro.', 'Fai oscillare l’altra gamba avanti e indietro come un pendolo, rilassata.', 'Aumenta piano piano l’ampiezza, senza forzare. Poi cambia lato.'],
    mistakes: ['Inarcare la schiena per salire di più.', 'Dare strappi: il movimento deve essere morbido.'],
    video: yt('slanci gamba leg swing riscaldamento corsa'),
  },
  {
    id: 'anche',
    name: 'Circonduzioni delle anche',
    cat: 'riscaldamento',
    img: 'Standing_Hip_Circles',
    dose: '10 giri per verso',
    why: 'Mobilizza il bacino, che nella corsa lavora tantissimo.',
    steps: ['In piedi, piedi alla larghezza delle spalle, mani sui fianchi.', 'Disegna dei cerchi ampi con il bacino, come con l’hula hoop.', 'Dopo 10 giri cambia verso.'],
    mistakes: ['Muovere le spalle invece del bacino.'],
    video: yt('circonduzioni anche riscaldamento'),
  },
  {
    id: 'affondi_camminati',
    name: 'Affondi camminati leggeri',
    cat: 'riscaldamento',
    img: 'Bodyweight_Walking_Lunge',
    dose: '8 passi per gamba',
    why: 'Scalda cosce e glutei e allunga i flessori dell’anca.',
    steps: ['Fai un passo lungo in avanti.', 'Piega entrambe le ginocchia scendendo poco, senza toccare terra.', 'Spingi sul piede davanti e porta avanti l’altra gamba nel passo successivo.', 'Busto dritto, sguardo avanti.'],
    mistakes: ['Ginocchio davanti che “cade” verso l’interno.', 'Scendere troppo: nel riscaldamento basta metà ampiezza.'],
    video: yt('affondi camminati riscaldamento corsa'),
  },

  /* ---------------- Andature ---------------- */
  {
    id: 'skip_basso',
    name: 'Skip basso',
    cat: 'andature',
    pose: 'skip_basso',
    dose: '2 × 20 metri',
    why: 'Insegna ad appoggiare il piede sotto il corpo e a tenere caviglie reattive.',
    steps: ['Corri sul posto avanzando piano.', 'Alza poco le ginocchia (i piedi salgono solo fino alla caviglia dell’altra gamba).', 'Appoggia sull’avampiede, con passi piccoli e rapidi.', 'Le braccia si muovono come nella corsa, gomiti piegati.'],
    mistakes: ['Battere i talloni a terra.', 'Piegarsi in avanti con il busto.'],
    video: yt('skip basso andature corsa tutorial'),
  },
  {
    id: 'skip_alto',
    name: 'Skip alto',
    cat: 'andature',
    img: 'Fast_Skipping',
    pose: 'skip_alto',
    dose: '2 × 20 metri',
    why: 'Rinforza i flessori dell’anca e migliora la spinta.',
    steps: ['Avanza lentamente alzando le ginocchia fino all’altezza dell’anca.', 'Appoggia l’avampiede sotto il corpo, non davanti.', 'Busto alto, braccia che accompagnano il movimento.', 'Conta la frequenza più che la velocità di avanzamento.'],
    mistakes: ['Sedersi all’indietro con il bacino.', 'Avanzare troppo veloce perdendo il ritmo delle ginocchia.'],
    video: yt('skip alto andature corsa tutorial'),
  },
  {
    id: 'calciata',
    name: 'Calciata',
    cat: 'andature',
    img: 'Single_Leg_Butt_Kick',
    pose: 'calciata',
    dose: '2 × 20 metri',
    why: 'Migliora il richiamo della gamba dopo la spinta e scioglie i quadricipiti.',
    steps: ['Avanza piano portando i talloni verso i glutei, una gamba alla volta.', 'Le ginocchia restano puntate verso il basso.', 'Appoggia sull’avampiede, passo rapido e leggero.'],
    mistakes: ['Portare le ginocchia in avanti.', 'Inarcare la schiena.'],
    imgNote: 'Nella foto l’esercizio è fatto da fermi: tu fallo avanzando piano.',
    video: yt('calciata andature corsa tutorial'),
  },
  {
    id: 'saltellato',
    name: 'Passo saltellato',
    cat: 'andature',
    pose: 'saltellato',
    dose: '2 × 20 metri',
    why: 'Coordina braccia e gambe e allena l’elasticità dei piedi.',
    steps: ['Come i bambini che saltellano: un passo e un piccolo saltello sullo stesso piede.', 'Mentre saltelli alza il ginocchio opposto.', 'Il braccio opposto al ginocchio sale in avanti.', 'Cerca leggerezza, non altezza.'],
    mistakes: ['Atterrare sui talloni.', 'Braccia rigide lungo i fianchi.'],
    video: yt('passo saltellato andature corsa'),
  },
  {
    id: 'incrociato',
    name: 'Passo incrociato laterale',
    cat: 'andature',
    img: 'Carioca_Quick_Step',
    dose: '2 × 15 metri per lato',
    why: 'Muove le anche in rotazione e migliora l’equilibrio.',
    steps: ['Avanza di lato.', 'La gamba dietro incrocia una volta davanti e una volta dietro all’altra.', 'Spalle ferme, è il bacino che ruota.', 'Torna indietro guardando dall’altra parte.'],
    mistakes: ['Andare troppo veloce e inciampare: inizia piano.'],
    video: yt('passo incrociato carioca andature corsa'),
  },
  {
    id: 'allunghi',
    name: 'Allunghi',
    cat: 'andature',
    pose: 'allunghi',
    dose: '4–6 × 60–80 metri (circa 20 secondi)',
    why: 'Abituano le gambe a una corsa più veloce senza fatica eccessiva.',
    steps: ['Parti corricchiando piano.', 'Aumenta gradualmente la velocità fino a circa l’80% del massimo.', 'Mantieni per qualche secondo restando sciolto, poi rallenta piano.', 'Torna indietro camminando: recupera completamente.'],
    mistakes: ['Fare uno scatto al massimo: deve essere veloce ma rilassato.', 'Irrigidire spalle e viso.'],
    video: yt('allunghi corsa come si fanno'),
  },

  /* ---------------- Rinforzo ---------------- */
  {
    id: 'squat',
    name: 'Squat a corpo libero',
    cat: 'rinforzo',
    img: 'Bodyweight_Squat',
    dose: '2–3 × 12',
    why: 'Rinforza cosce e glutei: proteggono le ginocchia durante la corsa.',
    steps: ['Piedi alla larghezza delle spalle, punte leggermente in fuori.', 'Scendi come per sederti su una sedia, spingendo il bacino indietro.', 'Ginocchia nella stessa direzione delle punte dei piedi.', 'Scendi finché ti senti stabile, poi risali spingendo sui talloni.'],
    mistakes: ['Ginocchia che si chiudono verso l’interno.', 'Talloni che si staccano da terra.'],
    video: yt('squat corpo libero tecnica principianti'),
  },
  {
    id: 'affondi',
    name: 'Affondi',
    cat: 'rinforzo',
    img: 'Bodyweight_Walking_Lunge',
    dose: '2 × 8 per gamba',
    why: 'Lavora una gamba alla volta, proprio come nella corsa.',
    steps: ['In piedi, fai un passo lungo in avanti.', 'Scendi piegando entrambe le ginocchia fino a circa 90°.', 'Il ginocchio dietro arriva vicino a terra senza toccare.', 'Spingi con il piede davanti e torna in piedi.'],
    mistakes: ['Busto inclinato in avanti.', 'Ginocchio davanti che supera molto la punta del piede.'],
    video: yt('affondi tecnica corretta principianti'),
  },
  {
    id: 'ponte',
    name: 'Ponte per i glutei',
    cat: 'rinforzo',
    img: 'Butt_Lift_Bridge',
    dose: '2–3 × 15',
    why: 'Glutei forti = bacino stabile e meno stress su ginocchia e schiena.',
    steps: ['Sdraiati a pancia in su, ginocchia piegate, piedi a terra.', 'Spingi sui talloni e solleva il bacino fino a formare una linea spalle–ginocchia.', 'Stringi i glutei 2 secondi in alto.', 'Scendi lentamente.'],
    mistakes: ['Inarcare la schiena invece di usare i glutei.'],
    video: yt('ponte glutei glute bridge tecnica'),
  },
  {
    id: 'ponte_una_gamba',
    name: 'Ponte su una gamba',
    cat: 'rinforzo',
    img: 'Single_Leg_Glute_Bridge',
    dose: '2 × 8 per gamba',
    why: 'Versione più difficile del ponte: quando quello normale è facile.',
    steps: ['Come il ponte, ma con una gamba distesa in aria.', 'Spingi sul tallone a terra e solleva il bacino.', 'Tieni il bacino dritto, senza farlo ruotare.'],
    mistakes: ['Il bacino scende da un lato.'],
    video: yt('ponte glutei una gamba single leg glute bridge'),
  },
  {
    id: 'polpacci',
    name: 'Sollevamenti sulle punte',
    cat: 'rinforzo',
    img: 'Standing_Dumbbell_Calf_Raise',
    imgNote: 'Nella foto con i manubri: tu fallo a corpo libero, anche su un gradino.',
    dose: '2–3 × 15',
    why: 'Polpacci e tendine d’Achille forti sono la miglior prevenzione per chi corre.',
    steps: ['In piedi, appoggiati con una mano al muro.', 'Sali sulle punte il più in alto possibile.', 'Resta 1 secondo in alto.', 'Scendi lentamente (conta fino a 3).', 'Quando è facile, fallo su una gamba sola.'],
    mistakes: ['Andare su e giù veloce: la discesa lenta è la parte più utile.'],
    video: yt('calf raise sollevamenti polpacci corpo libero'),
  },
  {
    id: 'plank',
    name: 'Plank',
    cat: 'rinforzo',
    img: 'Plank',
    dose: '3 × 20–40 secondi',
    why: 'Un busto stabile non “ondeggia” e fa sprecare meno energia correndo.',
    steps: ['Appoggiati su avambracci e punte dei piedi.', 'Corpo in linea retta dalla testa ai talloni.', 'Stringi pancia e glutei, respira normalmente.', 'Se è troppo difficile, appoggia le ginocchia.'],
    mistakes: ['Bacino troppo alto o che cede verso il basso.', 'Trattenere il respiro.'],
    video: yt('plank tecnica corretta principianti'),
  },
  {
    id: 'plank_laterale',
    name: 'Plank laterale',
    cat: 'rinforzo',
    img: 'Side_Bridge',
    dose: '2 × 20 secondi per lato',
    why: 'Rinforza i fianchi, che tengono il bacino dritto a ogni passo.',
    steps: ['Sdraiati su un fianco, appoggiato sull’avambraccio.', 'Solleva il bacino: corpo in linea retta.', 'Versione facile: ginocchia piegate e appoggiate.'],
    mistakes: ['Bacino che scende verso terra.', 'Spalla “schiacciata” verso l’orecchio.'],
    video: yt('plank laterale side plank principianti'),
  },
  {
    id: 'conchiglia',
    name: 'Conchiglia (clamshell)',
    cat: 'rinforzo',
    pose: 'conchiglia',
    dose: '2 × 15 per lato',
    why: 'Rinforza il medio gluteo: aiuta a prevenire il dolore al ginocchio del runner.',
    steps: ['Sdraiati su un fianco, ginocchia piegate, talloni uniti.', 'Tieni i piedi uniti e apri il ginocchio di sopra, come una conchiglia.', 'Il bacino non deve ruotare all’indietro.', 'Chiudi lentamente.'],
    mistakes: ['Ruotare tutto il busto per aprire di più.'],
    video: yt('clamshell esercizio conchiglia glutei'),
  },
  {
    id: 'equilibrio',
    name: 'Equilibrio su una gamba',
    cat: 'rinforzo',
    pose: 'equilibrio',
    dose: '3 × 30 secondi per gamba',
    why: 'Allena caviglie e piedi a reagire: meno distorsioni, soprattutto su sterrato.',
    steps: ['Stai in piedi su una gamba, ginocchio leggermente morbido.', 'Solleva l’altro piede da terra.', 'Resta in equilibrio guardando un punto fisso.', 'Più difficile: chiudi gli occhi o mettiti su un cuscino.'],
    mistakes: ['Ginocchio completamente bloccato.'],
    video: yt('equilibrio monopodalico esercizi caviglia runner'),
  },
  {
    id: 'step_up',
    name: 'Salita sul gradino',
    cat: 'rinforzo',
    img: 'Step-up_with_Knee_Raise',
    dose: '2 × 10 per gamba',
    why: 'Rinforza ogni gamba come nella spinta della corsa.',
    steps: ['Mettiti davanti a un gradino stabile o a una panchina bassa.', 'Appoggia tutto il piede sul gradino e sali spingendo con quella gamba.', 'In alto alza il ginocchio dell’altra gamba.', 'Scendi con calma e ripeti.'],
    mistakes: ['Spingere con la gamba a terra invece che con quella sul gradino.'],
    video: yt('step up esercizio gradino principianti'),
  },

  /* ---------------- Stretching ---------------- */
  {
    id: 'st_polpacci',
    name: 'Allungamento polpacci',
    cat: 'stretching',
    img: 'Calf_Stretch_Hands_Against_Wall',
    dose: '30 secondi per gamba',
    why: 'Il polpaccio dopo la corsa è sempre “contratto”: aiuta a scioglierlo.',
    steps: ['Mani al muro, una gamba avanti piegata e una dietro distesa.', 'Il tallone dietro resta a terra.', 'Porta il bacino verso il muro finché senti allungare il polpaccio.', 'Respira con calma, senza molleggiare.'],
    mistakes: ['Alzare il tallone dietro.'],
    video: yt('stretching polpacci al muro'),
  },
  {
    id: 'st_achille',
    name: 'Allungamento soleo e tendine d’Achille',
    cat: 'stretching',
    img: 'Standing_Soleus_And_Achilles_Stretch',
    dose: '30 secondi per gamba',
    why: 'Allunga la parte bassa del polpaccio, vicino al tendine.',
    steps: ['Come l’allungamento dei polpacci, ma piega anche il ginocchio dietro.', 'Tallone sempre a terra.', 'Senti l’allungamento più in basso, vicino alla caviglia.'],
    mistakes: ['Spingere troppo: deve essere una tensione leggera, mai dolore.'],
    video: yt('stretching soleo tendine achille'),
  },
  {
    id: 'st_quadricipiti',
    name: 'Allungamento quadricipiti',
    cat: 'stretching',
    img: 'On_Your_Side_Quad_Stretch',
    dose: '30 secondi per gamba',
    why: 'Scioglie la parte davanti della coscia.',
    steps: ['In piedi, appoggiati a un muro con una mano.', 'Piega una gamba e prendi la caviglia con la mano dello stesso lato.', 'Porta il tallone verso il gluteo, ginocchia vicine.', 'Bacino leggermente in avanti, schiena dritta.'],
    mistakes: ['Inarcare la schiena.', 'Allontanare il ginocchio di lato.'],
    imgNote: 'Nella foto è fatto sdraiati sul fianco: puoi farlo anche così, se in piedi perdi l’equilibrio.',
    video: yt('stretching quadricipiti in piedi'),
  },
  {
    id: 'st_posteriori',
    name: 'Allungamento posteriori della coscia',
    cat: 'stretching',
    img: 'Hamstring_Stretch',
    dose: '30 secondi per gamba',
    why: 'Allunga i muscoli dietro la coscia, spesso rigidi in chi sta seduto molte ore.',
    steps: ['Sdraiati a pancia in su.', 'Solleva una gamba distesa e tienila con le mani dietro la coscia (o con un asciugamano).', 'Avvicina la gamba finché senti allungare, senza piegare il ginocchio.', 'L’altra gamba resta a terra.'],
    mistakes: ['Tirare con forza: deve essere piacevole.'],
    video: yt('stretching ischiocrurali sdraiati asciugamano'),
  },
  {
    id: 'st_flessori',
    name: 'Allungamento flessori dell’anca',
    cat: 'stretching',
    img: 'Kneeling_Hip_Flexor',
    dose: '30 secondi per lato',
    why: 'Chi sta seduto tanto ha i flessori corti: allungarli migliora la falcata.',
    steps: ['In ginocchio su un tappetino, un piede avanti (come un affondo).', 'Busto dritto, stringi il gluteo della gamba dietro.', 'Porta il bacino leggermente in avanti.', 'Senti l’allungamento davanti all’anca della gamba dietro.'],
    mistakes: ['Inarcare la schiena invece di spingere il bacino.'],
    video: yt('stretching flessori anca in ginocchio'),
  },
  {
    id: 'st_glutei',
    name: 'Allungamento glutei',
    cat: 'stretching',
    img: 'Ankle_On_The_Knee',
    dose: '30 secondi per lato',
    why: 'Scioglie glutei e piriforme dopo la corsa.',
    steps: ['Sdraiati a pancia in su, ginocchia piegate.', 'Appoggia la caviglia destra sul ginocchio sinistro, come un “4”.', 'Prendi con le mani la coscia sinistra e avvicinala al petto.', 'Senti allungare il gluteo destro. Poi cambia lato.'],
    mistakes: ['Sollevare la testa e le spalle: restano appoggiate a terra.'],
    video: yt('stretching glutei sdraiati figura 4'),
  },
];

export const CATEGORY_LABEL: Record<ExCategory, string> = {
  riscaldamento: 'Riscaldamento',
  andature: 'Andature (tecnica di corsa)',
  rinforzo: 'Rinforzo per runner',
  stretching: 'Stretching',
};

export const CATEGORY_INTRO: Record<ExCategory, string> = {
  riscaldamento: 'Prima di ogni corsa, dopo 5 minuti di cammino veloce: 3–4 minuti per preparare le articolazioni.',
  andature: 'Esercizi di tecnica che rendono la corsa più leggera ed efficiente. Si fanno dopo il riscaldamento, su un tratto piano.',
  rinforzo: '15 minuti, 1–2 volte a settimana: fai 2 giri del circuito. È la migliore assicurazione contro gli infortuni.',
  stretching: 'A fine corsa, quando i muscoli sono caldi. Movimenti lenti, tensione leggera, mai dolore.',
};

/** Circuito di rinforzo: cambia con il livello del piano. */
export function strengthCircuit(advanced: boolean): string[] {
  return advanced
    ? ['squat', 'affondi', 'ponte_una_gamba', 'polpacci', 'plank', 'plank_laterale', 'conchiglia', 'step_up']
    : ['squat', 'ponte', 'polpacci', 'plank', 'conchiglia', 'equilibrio'];
}

export const WARMUP = ['caviglie', 'slanci', 'anche', 'affondi_camminati'];
export const DRILLS = ['skip_basso', 'skip_alto', 'calciata', 'saltellato', 'incrociato'];
export const STRETCH = ['st_polpacci', 'st_achille', 'st_quadricipiti', 'st_posteriori', 'st_flessori', 'st_glutei'];

export function getExercise(id: string): Exercise {
  const e = EXERCISES.find((x) => x.id === id);
  if (!e) throw new Error(`Esercizio sconosciuto: ${id}`);
  return e;
}

export function imageUrl(ex: Exercise, frame: 0 | 1): string | undefined {
  return ex.img ? `${import.meta.env.BASE_URL}exercises/${ex.img}/${frame}.jpg` : undefined;
}
