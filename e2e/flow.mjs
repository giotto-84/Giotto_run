// Prova il flusso completo in viewport iPhone (chiaro e scuro) e salva gli screenshot.
// Uso: npm run build && npx vite preview --port 4173 & node e2e/flow.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const BASE = process.env.APP_URL ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? 'screenshots';
mkdirSync(OUT, { recursive: true });
const iphone = devices['iPhone 13'];
const errors = [];

async function run(scheme) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...iphone,
    colorScheme: scheme,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    permissions: ['geolocation'],
    geolocation: { latitude: 45.4642, longitude: 9.19 },
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${scheme}] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${scheme}] console: ${m.text()}`));
  page.on('dialog', (d) => d.accept());
  const shot = (name) => page.screenshot({ path: `${OUT}/${scheme}-${name}.png`, fullPage: true });
  const next = () => page.getByRole('button', { name: 'Avanti' }).click();

  await page.goto(BASE);
  await page.getByPlaceholder('Il tuo nome').fill('Giotto');
  await shot('01-benvenuto');
  await next();
  await shot('02-chi-sei');
  await next();
  // PAR-Q: prima un "sì" per vedere il blocco, poi tutto "no"
  const groups = page.locator('.card.flat .chips');
  const n = await groups.count();
  for (let i = 0; i < n; i++) await groups.nth(i).getByRole('button', { name: i === 0 ? 'Sì' : 'No' }).click();
  await next();
  await page.getByText('Prima di iniziare, parla con il tuo medico').waitFor();
  await shot('03-parq-blocco');
  await page.getByRole('button', { name: 'Rivedi le risposte' }).click();
  await groups.nth(0).getByRole('button', { name: 'No' }).click();
  await next();
  await page.getByRole('button', { name: /Non faccio attività/ }).click();
  await shot('04-partenza');
  await next();
  await page.getByRole('button', { name: /Correre 5 km/ }).click();
  await page.getByLabel('Data della gara').fill('2027-05-16');
  await shot('05-obiettivo');
  await next();
  await shot('06-tempo');
  await next();
  await next();
  await shot('07-riepilogo');
  await page.getByRole('button', { name: 'Crea il mio piano' }).click();
  await page.getByRole('heading', { name: 'Questa settimana' }).waitFor();
  await shot('08-oggi');

  await page.getByRole('link', { name: 'Piano' }).click();
  await page.getByRole('heading', { name: /La scala/ }).waitFor();
  await shot('09-piano');

  await page.locator('a.session').first().click();
  await page.getByRole('heading', { name: 'Programma' }).waitFor();
  await shot('10-seduta');

  // modifica dei tempi: +1 ripetizione e corsa più lunga
  await page.getByRole('button', { name: 'Modifica i tempi' }).click();
  await page.getByRole('button', { name: 'Una ripetizione in più' }).click();
  await page.getByRole('button', { name: 'Allunga Corsa' }).click();
  await shot('10b-modifica-tempi');
  await page.getByRole('button', { name: 'Salva i tempi' }).click();
  await page.getByText('Tempi modificati da te').waitFor();
  await page.getByText('7 × (45 s di corsa + 3 min di cammino)').first().waitFor();
  await shot('10c-seduta-modificata');
  await page.getByRole('link', { name: /Cos’è questo allenamento/ }).click();
  await page.getByText('Il cuore e il fiato migliorano in fretta').waitFor();
  await shot('10d-guida-allenamenti');
  await page.goBack();

  await page.getByRole('link', { name: /Inizia allenamento guidato/ }).click();
  await shot('11-player-pronto');
  await page.getByRole('button', { name: 'Via!' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Salta al passo successivo' }).click();
  await page.waitForTimeout(600);
  await shot('12-player-corsa');
  await page.getByRole('button', { name: 'Termina e salva' }).click();
  await page.getByText('Quanto è stato faticoso?').waitFor();
  await page.getByPlaceholder('facoltativa').fill('2,4');
  await shot('13-registra');
  await page.getByRole('button', { name: 'Salva' }).click();
  await page.getByText('Corsa salvata!').waitFor();
  await shot('14-oggi-dopo');

  // corsa libera registrata a mano con GPX
  await page.goto(BASE + '#/registra');
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Parco</name><trkseg>${Array.from({ length: 30 }, (_, i) => `<trkpt lat="${45.46 + i * 0.0008}" lon="9.19"><time>${new Date(Date.now() - 86400000 * 3 + i * 40000).toISOString()}</time></trkpt>`).join('')}</trkseg></trk></gpx>`;
  await page.locator('input[type=file]').setInputFiles({ name: 'corsa.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(gpx) });
  await page.getByText(/File letto/).waitFor();
  await shot('15-gpx');
  await page.getByRole('button', { name: 'Salva' }).click();
  await page.getByText('Corsa salvata!').waitFor();

  await page.getByRole('link', { name: 'Progressi' }).click();
  await page.getByRole('heading', { name: 'Km a settimana' }).waitFor();
  await shot('16-progressi');

  // correggi una corsa già salvata
  await page.locator('details.exrow summary').first().click();
  await page.getByRole('link', { name: 'Correggi' }).first().click();
  await page.getByRole('heading', { name: 'Correggi corsa' }).waitFor();
  await page.getByPlaceholder('30:00').fill('31:15');
  await page.getByRole('button', { name: 'Salva' }).click();
  await page.getByRole('heading', { name: 'Km a settimana' }).waitFor();
  await page.locator('details.exrow summary').first().click();
  await page.getByText(/31:15/).first().waitFor();

  await page.getByRole('link', { name: 'Guida' }).click();
  await shot('17-guida');
  await page.getByRole('link', { name: /Skip basso/ }).click();
  await shot('18-esercizio-disegno');
  await page.goBack();
  await page.getByRole('link', { name: /Squat a corpo libero/ }).click();
  await shot('19-esercizio-foto');
  await page.goBack();
  await page.getByRole('button', { name: 'Consigli' }).click();
  await page.getByText('GPS: come registrare le corse').click();
  await shot('20-consigli');

  await page.getByRole('link', { name: 'Profilo' }).click();
  await page.getByRole('heading', { name: 'Durante la corsa' }).waitFor();
  await shot('21-profilo');
  await browser.close();
}

await run('light');
await run('dark');
if (errors.length) {
  console.error('ERRORI:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Flusso completo OK, screenshot in', OUT);
