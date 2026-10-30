// Seçilen kareleri kayıpsız PNG olarak çıkarır (tek paketleme, tek tarayıcı).
// Kullanım: node scripts/kareler.mjs <hedefKlasor> Klip1Bekleme:0,71 Klip2Acilis:0,59 ...
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [hedef, ...istekler] = process.argv.slice(2);
if (!hedef || istekler.length === 0) {
	console.error('Kullanım: node scripts/kareler.mjs <hedefKlasor> Klip1Bekleme:0,71 ...');
	process.exit(1);
}
fs.mkdirSync(hedef, {recursive: true});

const kok = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const serveUrl = await bundle({entryPoint: path.join(kok, 'src/index.ts'), publicDir: path.join(kok, 'public')});
const browser = await openBrowser('chrome', {
	browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE ?? null,
});

for (const istek of istekler) {
	const [id, liste] = istek.split(':');
	const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
	const kareler = liste === 'hepsi'
		? [...Array(composition.durationInFrames).keys()]
		: liste.split(',').map(Number);
	for (const frame of kareler) {
		const output = path.join(hedef, `${id}-${String(frame).padStart(3, '0')}.png`);
		await renderStill({composition, serveUrl, output, frame, puppeteerInstance: browser, imageFormat: 'png', overwrite: true});
		console.log(output);
	}
}
await browser.close({silent: true});
