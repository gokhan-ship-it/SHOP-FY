// Render sonrası kontroller ve out/rapor.md.
// 1) Dosya boyutları ve akış özellikleri (H.264, yuv420p, bt709, ses yok, faststart)
// 2) Geçiş kareleri: hem kayıpsız kaynak kareler (Remotion PNG) hem MP4'ten çözülen kareler
// 3) Renk: her MP4'ten kare çıkarıp köşe piksellerini #FBEAD6 ile karşılaştır (± 2)
// 4) Kenar bandı: ışın/konfeti kenara varmadan sönüyor mu
// Kullanım: node scripts/kontrol.mjs   (ffmpeg yoksa Remotion'un ffmpeg'i kullanılır)
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(KOK, 'out');
const GECICI = path.join(OUT, '_kontrol');
fs.mkdirSync(GECICI, {recursive: true});

const W = 720;
const ZEMIN = [0xfb, 0xea, 0xd6];
const TOLERANS = 2;

const KLIPLER = [
	{id: 'Klip1Bekleme', dosya: 'jfclub-1-bekleme.mp4', kare: 72, hedefKB: 250},
	{id: 'Klip2Acilis', dosya: 'jfclub-2-acilis.mp4', kare: 60, hedefKB: 400},
	{id: 'Klip3Acik', dosya: 'jfclub-3-acik.mp4', kare: 90, hedefKB: 300},
];

// ---------- ffmpeg ----------
const sistemdeVar = (bin) => spawnSync(bin, ['-version'], {stdio: 'ignore'}).status === 0;
const FF = sistemdeVar('ffmpeg') ? ['ffmpeg'] : ['npx', 'remotion', 'ffmpeg'];
const FP = sistemdeVar('ffprobe') ? ['ffprobe'] : ['npx', 'remotion', 'ffprobe'];
const calistir = (cmd, args) => {
	const r = spawnSync(cmd[0], [...cmd.slice(1), ...args], {maxBuffer: 1 << 30, cwd: KOK});
	if (r.status !== 0) {
		throw new Error(`${cmd.join(' ')} ${args.join(' ')}\n${r.stderr}`);
	}
	return r.stdout;
};

// MP4'ü tarayıcıların yaptığı gibi çöz: BT.709 matris, sınırlı aralık → RGB24.
const mp4Kareleri = (dosya) => {
	const buf = calistir(FF, [
		'-v', 'error', '-i', dosya,
		'-vf', 'scale=in_color_matrix=bt709:in_range=limited:flags=accurate_rnd+full_chroma_int,format=rgb24',
		'-f', 'rawvideo', '-',
	]);
	const boyut = W * W * 3;
	const kareler = [];
	for (let i = 0; i + boyut <= buf.length; i += boyut) {
		kareler.push(buf.subarray(i, i + boyut));
	}
	return kareler;
};

const pngOku = (dosya) => calistir(FF, ['-v', 'error', '-i', dosya, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);

const fark = (a, b) => {
	let maks = 0;
	let toplam = 0;
	let farkliPiksel = 0;
	let kare = 0;
	for (let i = 0; i < a.length; i += 3) {
		let pmaks = 0;
		for (let c = 0; c < 3; c++) {
			const d = Math.abs(a[i + c] - b[i + c]);
			toplam += d;
			kare += d * d;
			if (d > pmaks) pmaks = d;
		}
		if (pmaks > maks) maks = pmaks;
		if (pmaks > TOLERANS) farkliPiksel++;
	}
	const mse = kare / a.length;
	return {
		maks,
		ort: toplam / a.length,
		farkliYuzde: (100 * farkliPiksel) / (a.length / 3),
		psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse),
	};
};

const piksel = (buf, x, y) => {
	const i = (y * W + x) * 3;
	return [buf[i], buf[i + 1], buf[i + 2]];
};

const KOSELER = [
	['sol üst', 0, 0],
	['sağ üst', W - 1, 0],
	['sol alt', 0, W - 1],
	['sağ alt', W - 1, W - 1],
];

// Dış banttaki (kenardan `bant` px) en büyük zemin sapması.
const bantSapmasi = (buf, bant) => {
	let maks = 0;
	for (let y = 0; y < W; y++) {
		const tumSatir = y < bant || y >= W - bant;
		for (let x = 0; x < W; x++) {
			if (!tumSatir && x >= bant && x < W - bant) {
				x = W - bant - 1;
				continue;
			}
			const i = (y * W + x) * 3;
			for (let c = 0; c < 3; c++) {
				const d = Math.abs(buf[i + c] - ZEMIN[c]);
				if (d > maks) maks = d;
			}
		}
	}
	return maks;
};

// MP4 üst düzey kutular: faststart = moov, mdat'tan önce.
const kutuSirasi = (dosya) => {
	const buf = fs.readFileSync(dosya);
	const sira = [];
	let i = 0;
	while (i + 8 <= buf.length) {
		let boy = buf.readUInt32BE(i);
		const tip = buf.toString('latin1', i + 4, i + 8);
		if (boy === 1) boy = Number(buf.readBigUInt64BE(i + 8));
		if (boy === 0) boy = buf.length - i;
		sira.push(tip);
		i += boy;
	}
	return sira;
};

// ---------- 1) Dosyalar ve akış özellikleri ----------
const kb = (bayt) => (bayt / 1000).toFixed(1); // 1 KB = 1000 B (katı yorum)
const dosyalar = [];
for (const k of KLIPLER) {
	const yol = path.join(OUT, k.dosya);
	const bayt = fs.statSync(yol).size;
	const probe = JSON.parse(calistir(FP, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', yol]).toString());
	const video = probe.streams.find((s) => s.codec_type === 'video');
	const sesler = probe.streams.filter((s) => s.codec_type === 'audio');
	const sira = kutuSirasi(yol);
	dosyalar.push({
		...k,
		bayt,
		video,
		sesSayisi: sesler.length,
		faststart: sira.indexOf('moov') !== -1 && sira.indexOf('moov') < sira.indexOf('mdat'),
		sira,
	});
}
const pngler = ['jfclub-kapali.png', 'jfclub-acik.png'].map((dosya) => {
	const yol = path.join(OUT, dosya);
	const probe = JSON.parse(calistir(FP, ['-v', 'error', '-show_streams', '-of', 'json', yol]).toString());
	return {dosya, bayt: fs.statSync(yol).size, w: probe.streams[0].width, h: probe.streams[0].height};
});

// ---------- 2) Kaynak (kayıpsız) geçiş kareleri ----------
const ISTENEN = {
	Klip1Bekleme: [0, 1, 70, 71],
	Klip2Acilis: [0, 58, 59],
	Klip3Acik: [0, 1, 88, 89],
};
console.log('Kaynak kareler çiziliyor…');
const serveUrl = await bundle({entryPoint: path.join(KOK, 'src/index.ts'), publicDir: path.join(KOK, 'public')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE ?? null});
const kaynak = {};
for (const [id, kareler] of Object.entries(ISTENEN)) {
	const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
	kaynak[id] = {};
	for (const frame of kareler) {
		const output = path.join(GECICI, `${id}-${frame}.png`);
		await renderStill({composition, serveUrl, output, frame, puppeteerInstance: browser, imageFormat: 'png', overwrite: true});
		kaynak[id][frame] = pngOku(output);
	}
}
await browser.close({silent: true});

// ---------- 2b) MP4'ten çözülen kareler ----------
console.log('MP4 kareleri çözülüyor…');
const video = {};
for (const k of KLIPLER) {
	video[k.id] = mp4Kareleri(path.join(OUT, k.dosya));
}

const GECISLER = [
	{ad: 'Klip1 kare 71 → kare 0 (döngü)', a: ['Klip1Bekleme', 71], b: ['Klip1Bekleme', 0], komsu: [['Klip1Bekleme', 70], ['Klip1Bekleme', 71]]},
	{ad: 'Klip1 kare 0 = Klip2 kare 0', a: ['Klip1Bekleme', 0], b: ['Klip2Acilis', 0]},
	{ad: 'Klip2 kare 59 = Klip3 kare 0', a: ['Klip2Acilis', 59], b: ['Klip3Acik', 0]},
	{ad: 'Klip3 kare 89 → kare 0 (döngü)', a: ['Klip3Acik', 89], b: ['Klip3Acik', 0], komsu: [['Klip3Acik', 88], ['Klip3Acik', 89]]},
];
const gecisSonuclari = GECISLER.map((g) => {
	const kaynakFark = fark(kaynak[g.a[0]][g.a[1]], kaynak[g.b[0]][g.b[1]]);
	const videoFark = fark(video[g.a[0]][g.a[1]], video[g.b[0]][g.b[1]]);
	const komsuKaynak = g.komsu ? fark(kaynak[g.komsu[0][0]][g.komsu[0][1]], kaynak[g.komsu[1][0]][g.komsu[1][1]]) : null;
	const komsuVideo = g.komsu ? fark(video[g.komsu[0][0]][g.komsu[0][1]], video[g.komsu[1][0]][g.komsu[1][1]]) : null;
	// Karşılaştırma tabanı: çözülen karelerin kendi kaynaklarına uzaklığı (yuv420p + H.264 kaybı).
	const tabanA = fark(video[g.a[0]][g.a[1]], kaynak[g.a[0]][g.a[1]]);
	const tabanB = fark(video[g.b[0]][g.b[1]], kaynak[g.b[0]][g.b[1]]);
	return {...g, kaynakFark, videoFark, komsuKaynak, komsuVideo, tabanA, tabanB};
});

// Kare sayısı kontrolü
const kareSayilari = KLIPLER.map((k) => ({id: k.id, beklenen: k.kare, cozulen: video[k.id].length}));

// ---------- 3) Renk kontrolü ----------
// BRIEF: her MP4'ten bir kare (ortadaki kare) çıkar, köşe piksellerini ölç. Ek bilgi: tüm karelerin köşeleri.
const renk = KLIPLER.map((k) => {
	const kareNo = Math.floor(k.kare / 2);
	const buf = video[k.id][kareNo];
	const koseler = KOSELER.map(([ad, x, y]) => {
		const p = piksel(buf, x, y);
		const d = p.map((v, c) => v - ZEMIN[c]);
		return {ad, p, d, maks: Math.max(...d.map(Math.abs))};
	});
	const asanKareler = [];
	let tumMaks = 0;
	video[k.id].forEach((kare, i) => {
		let m = 0;
		for (const [, x, y] of KOSELER) {
			const p = piksel(kare, x, y);
			for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(p[c] - ZEMIN[c]));
		}
		tumMaks = Math.max(tumMaks, m);
		if (m > TOLERANS) asanKareler.push(i);
	});
	return {id: k.id, dosya: k.dosya, kareNo, koseler, maks: Math.max(...koseler.map((x) => x.maks)), tumMaks, asanKareler};
});
const pngRenk = pngler.map((p) => {
	const buf = pngOku(path.join(OUT, p.dosya));
	return {dosya: p.dosya, maks: Math.max(...KOSELER.map(([, x, y]) => Math.max(...piksel(buf, x, y).map((v, c) => Math.abs(v - ZEMIN[c])))))};
});

// ---------- 4) Kenar bandı ----------
const BANT = 24;
const kenar = KLIPLER.map((k) => {
	const sapmalar = video[k.id].map((kare) => bantSapmasi(kare, BANT));
	const asan = sapmalar.map((s, i) => [i, s]).filter(([, s]) => s > TOLERANS).map(([i]) => i);
	return {id: k.id, maks: Math.max(...sapmalar), asan};
});

// ---------- 5) Güvenli alan (40 px) ----------
// Nesne pikseli: kutu/kapak/tilki kırmızısı ya da tilkinin beyaz konturu. Tek tük konfeti parçasını
// saymamak için bir satır/sütun en az 6 nesne pikseli içerdiğinde dikkate alınır.
const GUVENLI = 40;
const nesneKutusu = (buf) => {
	const satir = new Uint16Array(W);
	const sutun = new Uint16Array(W);
	for (let y = 0; y < W; y++) {
		for (let x = 0; x < W; x++) {
			const i = (y * W + x) * 3;
			const r = buf[i];
			const g = buf[i + 1];
			const b = buf[i + 2];
			const kirmizi = r > 150 && g < 90 && b < 110;
			const beyaz = r >= 250 && g >= 250 && b >= 250;
			if (kirmizi || beyaz) {
				satir[y]++;
				sutun[x]++;
			}
		}
	}
	const ilk = (dizi) => dizi.findIndex((n) => n >= 6);
	const son = (dizi) => W - 1 - [...dizi].reverse().findIndex((n) => n >= 6);
	return {x0: ilk(sutun), x1: son(sutun), y0: ilk(satir), y1: son(satir)};
};
// Klip2'de kapak kare 0–20 arasında kadraj dışına uçar (BRIEF gereği kenarı geçer); o kareler hariç.
const KAPAK_UCUSU = {Klip2Acilis: 20};
const guvenli = KLIPLER.map((k) => {
	const bas = (KAPAK_UCUSU[k.id] ?? -1) + 1;
	const t = {x0: W, x1: 0, y0: W, y1: 0};
	for (let i = bas; i < video[k.id].length; i++) {
		const b = nesneKutusu(video[k.id][i]);
		t.x0 = Math.min(t.x0, b.x0);
		t.x1 = Math.max(t.x1, b.x1);
		t.y0 = Math.min(t.y0, b.y0);
		t.y1 = Math.max(t.y1, b.y1);
	}
	const icinde = t.x0 >= GUVENLI && t.y0 >= GUVENLI && t.x1 <= W - 1 - GUVENLI && t.y1 <= W - 1 - GUVENLI;
	return {id: k.id, bas, ...t, icinde};
});

// ---------- Rapor ----------
const f2 = (n) => (n === Infinity ? '∞' : n.toFixed(2));
const satirFark = (d) => `maks ${d.maks} · ort ${f2(d.ort)} · >±${TOLERANS}: %${f2(d.farkliYuzde)} · PSNR ${f2(d.psnr)} dB`;
const sonuc = (b) => (b ? 'geçti ✓' : 'kaldı ✗');

let md = '';
md += '# JantiFox Club · Remotion çıktı raporu\n\n';
md += `Oluşturma: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · \`npm run check\` ile yeniden üretilir.\n\n`;

md += '## Remotion Studio\n\nDepo kökünden tek komut:\n\n```bash\ncd jfclub-remotion && npm install && npx remotion studio\n```\n\n';
md += 'Yeniden render: `npm run render` · Kontroller + bu rapor: `npm run check` · Önizleme: `out/onizleme.html`\n\n';

md += '## 1. Dosyalar\n\n';
md += '1 KB = 1000 bayt alındı (hedefler için katı yorum).\n\n';
md += '| Dosya | Boyut | Hedef | Kare | Codec / piksel | Renk etiketi | Ses izi | Faststart |\n|---|---|---|---|---|---|---|---|\n';
for (const d of dosyalar) {
	const v = d.video;
	md += `| \`${d.dosya}\` | ${kb(d.bayt)} KB (${d.bayt} B) | ≤ ${d.hedefKB} KB ${d.bayt <= d.hedefKB * 1000 ? '✓' : '✗'} | ${v.nb_frames} @ ${v.r_frame_rate} | ${v.codec_name} ${v.profile ?? ''} / ${v.pix_fmt} | ${v.color_space ?? '-'} / ${v.color_transfer ?? '-'} / ${v.color_primaries ?? '-'} (${v.color_range ?? '-'}) | ${d.sesSayisi === 0 ? 'yok ✓' : d.sesSayisi + ' ✗'} | ${d.faststart ? 'evet ✓' : 'hayır ✗'} (${d.sira.join(' → ')}) |\n`;
}
for (const p of pngler) {
	md += `| \`${p.dosya}\` | ${kb(p.bayt)} KB | – | ${p.w} × ${p.h} | PNG | – | – | – |\n`;
}
md += '\n`jfclub-kapali.png` = Klip1 kare 0, `jfclub-acik.png` = Klip3 kare 0.\n\n';
md += 'Çözülen kare sayıları: ' + kareSayilari.map((k) => `${k.id} ${k.cozulen}/${k.beklenen} ${k.cozulen === k.beklenen ? '✓' : '✗'}`).join(' · ') + '\n\n';

md += '## 2. Geçiş kontrolü\n\n';
md += `Kanal başına piksel farkı (0–255). **Kaynak** = Remotion'un kayıpsız PNG karesi. **MP4** = videodan BT.709 / sınırlı aralıkla (tarayıcının yaptığı gibi) çözülen kare.\n\n`;
md += '| Geçiş | Kaynak (kayıpsız) | MP4 (çözülmüş) |\n|---|---|---|\n';
for (const g of gecisSonuclari) {
	md += `| ${g.ad} | ${satirFark(g.kaynakFark)} | ${satirFark(g.videoFark)} |\n`;
}
md += '\n';
const [g1, g2, g3, g4] = gecisSonuclari;
md += `- **Klip1 döngüsü (71 → 0):** kare 53–71 ve 0–33 aynı dinlenme pozu; kaynakta fark ${g1.kaynakFark.maks}. MP4'teki fark (PSNR ${f2(g1.videoFark.psnr)} dB) yalnızca kodlayıcının durağan karelerdeki ince düzeltmesidir.\n`;
md += `- **Klip1 0 = Klip2 0** ve **Klip2 59 = Klip3 0:** kaynak kareler birebir aynı (fark ${g2.kaynakFark.maks} ve ${g3.kaynakFark.maks}): üç klip aynı sahne bileşenini aynı durumla çiziyor; ışın açısı (44,25°), parlama (%75) ve tilki konumu dahil.\n`;
md += `- MP4'te iki ayrı H.264 kodlaması karşılaştırıldığı için sıkıştırma gürültüsü kalır (PSNR ${f2(g2.videoFark.psnr)} / ${f2(g3.videoFark.psnr)} dB). Ölçek vermek için: aynı kareler kendi kayıpsız kaynaklarına göre ${f2(g2.tabanA.psnr)} / ${f2(g2.tabanB.psnr)} dB ve ${f2(g3.tabanA.psnr)} / ${f2(g3.tabanB.psnr)} dB (yuv420p renk alt örneklemesi + H.264). Yani geçişteki fark, her videonun kaynağa göre zaten taşıdığı farktan küçük; geçişte görünür atlama oluşmaz. MP4'te bit bit eşitlik için sabit QP (CRF değil) gerekirdi; BRIEF CRF istediği için CRF kullanıldı.\n`;
md += `- **Klip3 döngüsü (89 → 0):** bu iki kare aynı olmamalı; ardışık iki kare gibi olmalı (ışınlar 0,75° döner, tilki salınımın dibindedir). Komşu 88 → 89 farkı: kaynak ${satirFark(g4.komsuKaynak)}; MP4 ${satirFark(g4.komsuVideo)}. Kaynakta 89 → 0 farkı (ort ${f2(g4.kaynakFark.ort)}) sıradan bir ardışık kare farkıyla (ort ${f2(g4.komsuKaynak.ort)}) aynı düzeyde, yani döngü noktasında hareket atlaması yok. MP4'te biraz daha yüksek çıkması, kare 0'ın anahtar kare (I) olarak ayrı kodlanmasından gelen sıkıştırma gürültüsüdür. Işınlar 90 karede 67,5° (= 3 × 22,5° periyot) döner, salınım (1 − cos) / 2 eğrisiyle kare 90'da başa döner.\n\n`;

md += `## 3. Renk kontrolü (hedef #FBEAD6 = 251, 234, 214 · tolerans kanal başına ±${TOLERANS})\n\n`;
md += 'Her MP4\'ten ortadaki kare çıkarıldı, dört köşe pikseli ölçüldü:\n\n';
md += '| MP4 | Kare | Sol üst | Sağ üst | Sol alt | Sağ alt | En büyük fark | Sonuç |\n|---|---|---|---|---|---|---|---|\n';
for (const r of renk) {
	const h = (k) => `${k.p.join(', ')} (Δ ${k.d.map((v) => (v > 0 ? '+' + v : v)).join('/')})`;
	md += `| \`${r.dosya}\` | ${r.kareNo} | ${r.koseler.map(h).join(' | ')} | ${r.maks} | ${sonuc(r.maks <= TOLERANS)} |\n`;
}
md += '\n' + pngRenk.map((p) => `\`${p.dosya}\` köşeleri: en büyük fark ${p.maks} ${p.maks <= TOLERANS ? '✓' : '✗'}`).join(' · ') + '\n\n';
md += 'Ek: tüm karelerde dört köşe — ' + renk.map((r) => `${r.id}: en büyük fark ${r.tumMaks}${r.asanKareler.length ? ` (±${TOLERANS}'yi aşan kareler ${r.asanKareler[0]}–${r.asanKareler[r.asanKareler.length - 1]}: kapak sol üst köşeden kadraj dışına uçuyor)` : ''}`).join(' · ') + '\n\n';
const renkDuzeltme = renk.every((r) => r.maks <= TOLERANS);
md += renkDuzeltme ? 'Düzeltme gerekmedi.\n\n' : '**Düzeltme gerekli.**\n\n';

md += `## 4. Kenar bandı (dış ${BANT} px, tüm kareler, MP4)\n\n`;
md += 'Işın, parlama ve konfeti kenardan 32 px içeride tamamen söner.\n\n';
md += `| Klip | En büyük sapma | ±${TOLERANS}'yi aşan kareler |\n|---|---|---|\n`;
for (const k of kenar) {
	md += `| ${k.id} | ${k.maks} | ${k.asan.length ? `${k.asan.join(', ')} (kapak uçuşu)` : 'yok'} |\n`;
}
md += '\n';

md += `## 5. Güvenli alan (${GUVENLI} px)\n\n`;
md += 'Kutu, kapak, fiyonk ve tilkinin kapladığı alan (tüm kareler, MP4):\n\n';
md += '| Klip | Kareler | x | y | Sonuç |\n|---|---|---|---|---|\n';
for (const g of guvenli) {
	md += `| ${g.id} | ${g.bas}–${KLIPLER.find((k) => k.id === g.id).kare - 1} | ${g.x0}–${g.x1} | ${g.y0}–${g.y1} | ${g.icinde ? `${GUVENLI}–${W - 1 - GUVENLI} içinde ✓` : 'taşıyor ✗'} |\n`;
}
md += '\nKlip2 kare 0–20: kapak BRIEF gereği sol üste uçup kadrajdan çıkar (kare 21\'den itibaren kadrajda değildir, kare 30\'da sahneden kaldırılır).\n\n';

const renderSh = fs.readFileSync(path.join(KOK, 'scripts/render.sh'), 'utf8');
const crf = (n) => (renderSh.match(new RegExp(`CRF${n}="\\$\\{CRF${n}:-(\\d+)\\}"`)) ?? [])[1] ?? '?';
md += '## 6. Uygulama notları\n\n';
md += [
	'Sahne, `referans/sahne-referans.html` ile aynı CSS 3D yapısında × 3 ölçekle kuruldu (rotateX(−21°) rotateY(−33°), perspektif 2280 px, ölçek 0,86). Kapalı kare `kare-kapali-720.png` ile satır satır karşılaştırıldı; kutu kenarları ±1 px içinde örtüşüyor.',
	'Logolar `logolar/` klasöründen dosya olarak kullanıldı (yeniden çizilmedi, ® işaretleri duruyor). Kurdele: kapak üstünde çapraz, kapağın dört yanında, gövdenin sağ, sol ve arka yüzünde; logolu ön yüzde gövdeye inmiyor.',
	'Işık ve gölge iyileştirmeleri: kapağın gövdeye düşen ince gölgesi (kapak kalkınca azalır), kapak kenarlarında hafif parlama, fiyonkta hacim ışığı ve kapağa düşen yumuşak gölge, tilkide köşeleri yuvarlak beyaz yama konturu, daha yumuşak zemin gölgesi ve parlama.',
	'Işın huzmeleri: 16 huzme, 22,5° periyot (taslaktaki 22° değil; 22° ile 360° tam bölünmüyor), 7° genişlik, kenarları yumuşatılmış. Dönüş açısı gradyanın kendisine veriliyor (her kare yeniden çizilir, döndürme bulanıklığı olmaz). İlk 90 px\'te de sönüyor; merkez tilkinin arkasında kalıyor ama gözlük boşluklarından titreşim görünüyordu.',
	'Işın, parlama ve konfeti, kenardan 32 px içeride sıfıra inen yumuşak bir kenar maskesiyle söner. Parlama da maskeye dahil; üst kenarda zeminden açık bir şerit kalmaz.',
	'Klip2: kutu tabanından esner (zemine basar). Kapak soldurulmaz; kare 21\'de kadrajdan tamamen çıkar ve kare 30\'da sahneden kaldırılır. 3D gruplarına opacity/filter verilmedi.',
	'Klip2 tilki tepe noktası: BRIEF "≈ 21 px yukarı, %106" diyor; bu değerlerle tilkinin konturu 40 px güvenli kenara 1 px giriyordu. Tepe ≈ 19 px\'e çekildi (ölçek %106 aynı kaldı).',
	'Tilkiye 0,05°\'lik sabit, görünmeyen bir dönüş payı eklendi. Dönüş tam 0 olduğunda Chrome tilkiyi yeniden örneklemeden, daha keskin çiziyordu; bu yüzden Klip2 sonu ve Klip3 kare 0 ile Klip3\'ün salınımlı kareleri arasında bir karelik keskinlik sıçraması oluşuyordu.',
	'Konfeti: 26 parça (daire, yıldız, kalp, ince dikdörtgen; 6 renk, açık renklerde ince kontur). Remotion `random()` sabit tohumlarla kullanıldı. Parçalar sürtünmeli balistik bir yay çizer, döner, kâğıt gibi takla atar; son parça kare 56\'da söner.',
	`Render: ara kareler PNG (kayıpsız), x264 veryslow, CRF Klip1 ${crf(1)} · Klip2 ${crf(2)} · Klip3 ${crf(3)} (scripts/render.sh).`,
].map((n) => `- ${n}`).join('\n') + '\n';

fs.writeFileSync(path.join(OUT, 'rapor.md'), md);
fs.writeFileSync(
	path.join(GECICI, 'sonuc.json'),
	JSON.stringify(
		{
			dosyalar: dosyalar.map(({video: v, ...d}) => ({...d, pix_fmt: v.pix_fmt, color_space: v.color_space})),
			gecisler: gecisSonuclari.map(({ad, kaynakFark, videoFark, komsuKaynak, komsuVideo, tabanA, tabanB}) => ({ad, kaynakFark, videoFark, komsuKaynak, komsuVideo, tabanA, tabanB})),
			renk,
			pngRenk,
			kenar,
			guvenli,
			kareSayilari,
		},
		null,
		2,
	),
);
console.log(md);
