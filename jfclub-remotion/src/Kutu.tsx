import React from 'react';
import {Img, staticFile} from 'remotion';
import {KapakDurumu, TilkiDurumu} from './durum';
import {KAMERA, KUTU, RENK} from './sabitler';

// 3D hediye kutusu. Yapı ve renkler referans/sahne-referans.html ile aynı, ölçüler × 3.
// Not: 3D gruplarına (.kutu3d, .kapak) opacity/filter verilmez; aksi halde tarayıcı grubu düzleştirir.

const K = KUTU.kenar; // 360
const YK = K / 2; // 180
const KK = KUTU.kapakKenar; // 396
const YKK = KK / 2; // 198
const KH = KUTU.kapakYukseklik; // 84
const C = KUTU.kurdeleCizgi;

// Ortadan geçen kurdele şeridi (kenar çizgili), bir yüzün genişliğine göre.
const serit = (yon: '90deg' | '0deg', genislik: number, renk: string, cizgi = true) => {
	const a = (genislik - KUTU.kurdele) / 2;
	const b = a + KUTU.kurdele;
	if (!cizgi) {
		return `linear-gradient(${yon},transparent 0 ${a}px,${renk} ${a}px ${b}px,transparent ${b}px)`;
	}
	return `linear-gradient(${yon},transparent 0 ${a - C}px,${RENK.kurdeleKenar} ${a - C}px ${a}px,${renk} ${a}px ${b}px,${RENK.kurdeleKenar} ${b}px ${b + C}px,transparent ${b + C}px)`;
};

const yuz: React.CSSProperties = {
	position: 'absolute',
	left: -YK,
	top: -YK,
	width: K,
	height: K,
	// Yüz kenarı dokunun içinde kalsın: kenar yumuşatması temiz olur, yüzler arasında çizgi kalmaz.
	outline: '1px solid transparent',
};

const kapakYuz: React.CSSProperties = {
	position: 'absolute',
	left: -YKK,
	top: -KH / 2,
	width: KK,
	height: KH,
	outline: '1px solid transparent',
};

const kapakUstAlt: React.CSSProperties = {
	position: 'absolute',
	left: -YKK,
	top: -YKK,
	width: KK,
	height: KK,
	outline: '1px solid transparent',
};

// Kapağın gövdeye düşen ince gölgesi (kapak kalkınca azalır).
const KapakGolgesi: React.FC<{opaklik: number}> = ({opaklik}) =>
	opaklik > 0 ? (
		<div
			style={{
				position: 'absolute',
				left: 0,
				top: 0,
				width: '100%',
				height: 78,
				opacity: opaklik,
				background:
					'linear-gradient(180deg,rgba(58,0,12,0.34) 0px,rgba(58,0,12,0.16) 18px,rgba(58,0,12,0.05) 46px,rgba(58,0,12,0) 78px)',
			}}
		/>
	) : null;

const Fiyonk: React.FC<{yan?: boolean}> = ({yan}) => {
	const ilmekG = yan ? 114 : 126;
	const ilmekY = yan ? 81 : 93;
	const kenar = yan ? 15 : 3;
	const ilmek = (ayna: boolean): React.CSSProperties => ({
		position: 'absolute',
		bottom: 12,
		[ayna ? 'right' : 'left']: kenar,
		width: ilmekG,
		height: ilmekY,
		boxSizing: 'border-box',
		borderRadius: '55% 45% 45% 55% / 60% 60% 40% 40%',
		background: 'radial-gradient(circle at 65% 35%,#fffaf2,#f8e2c7 50%,#ecc9a2)',
		border: `4.5px solid ${RENK.fiyonkKenar}`,
		// Yumuşak hacim: alt-arka tarafta sıcak gölge, üstte hafif parlak.
		boxShadow:
			'inset -10px -12px 20px rgba(170,112,62,0.20), inset 8px 8px 14px rgba(255,255,255,0.45)',
		transform: ayna ? 'scaleX(-1) rotate(-16deg)' : 'rotate(-16deg)',
	});
	return (
		<div
			style={{
				position: 'absolute',
				left: -126,
				top: -150,
				width: 252,
				height: 120,
				filter: 'drop-shadow(0 6px 6px rgba(89,0,28,0.3))',
				transform: yan ? 'rotateY(90deg)' : undefined,
			}}
		>
			<i style={ilmek(false)} />
			<i style={ilmek(true)} />
			{yan ? null : (
				<b
					style={{
						position: 'absolute',
						left: 99,
						bottom: 6,
						width: 54,
						height: 57,
						boxSizing: 'border-box',
						borderRadius: 21,
						background: 'radial-gradient(circle at 40% 30%,#f9e3c6,#f0d2ae 55%,#e6c197)',
						border: '4.5px solid #ddb98f',
					}}
				/>
			)}
		</div>
	);
};

export const kapakDonusumu = (k: KapakDurumu) =>
	`translate3d(${k.x}px,${KUTU.kapakY + k.y}px,${k.z}px) rotateZ(${k.rotZ}deg) rotateX(${k.rotX}deg)`;

const Kapak: React.FC<{durum: KapakDurumu}> = ({durum}) => (
	<div style={{position: 'absolute', transformStyle: 'preserve-3d', transform: kapakDonusumu(durum)}}>
		<div style={{...kapakUstAlt, transform: `rotateX(-90deg) translateZ(${KH / 2}px)`, background: '#5c0013'}} />
		<div
			style={{
				...kapakYuz,
				transform: `rotateY(180deg) translateZ(${YKK}px)`,
				background: `${serit('90deg', KK, '#e3c7a6', false)},#8a001d`,
			}}
		/>
		<div
			style={{
				...kapakYuz,
				transform: `rotateY(-90deg) translateZ(${YKK}px)`,
				background: `${serit('90deg', KK, '#e3c7a6', false)},#8a001d`,
			}}
		/>
		<div
			style={{
				...kapakYuz,
				transform: `rotateY(90deg) translateZ(${YKK}px)`,
				background: [
					'linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0) 6px)',
					serit('90deg', KK, RENK.kurdele),
					'linear-gradient(180deg,#bf0029,#92001f)',
				].join(','),
			}}
		/>
		<div
			style={{
				...kapakYuz,
				transform: `translateZ(${YKK}px)`,
				background: [
					// üst kenarda hafif parlama
					'linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0) 7px)',
					serit('90deg', KK, RENK.kurdele),
					'linear-gradient(180deg,#f0254f,#c4002a)',
				].join(','),
			}}
		/>
		<div
			style={{
				...kapakUstAlt,
				transform: `rotateX(90deg) translateZ(${KH / 2}px)`,
				background: [
					// ön ve sol kenarlarda hafif parlama
					'linear-gradient(0deg,rgba(255,255,255,0.20),rgba(255,255,255,0) 7px)',
					'linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0) 7px)',
					// fiyonğun kapağa düşen yumuşak gölgesi
					'radial-gradient(ellipse 34% 30% at 50% 52%,rgba(89,0,28,0.20),rgba(89,0,28,0.08) 55%,rgba(89,0,28,0) 100%)',
					serit('90deg', KK, RENK.kurdele),
					serit('0deg', KK, RENK.kurdele),
					'radial-gradient(circle at 30% 30%,#ff3a62,#d1002d 70%)',
				].join(','),
			}}
		/>
		<Fiyonk yan />
		<Fiyonk />
	</div>
);

// Tilkiye her karede eklenen, gözle görülmeyen sabit dönüş payı. Dönüş tam 0 olduğunda Chrome
// tilkiyi farklı (yeniden örneklemesiz) bir yoldan çiziyor ve Klip 3'ün salınımlı kareleriyle
// arasında keskinlik sıçraması oluşuyordu; bu pay tüm kareleri aynı çizim yoluna sokar.
const TILKI_DONUS_PAYI = 0.05;

const Tilki: React.FC<{durum: TilkiDurumu}> = ({durum}) => (
	<Img
		src={staticFile('logolar/jantifox-icon-color.svg')}
		style={{
			position: 'absolute',
			left: -144,
			top: -144,
			width: 288,
			height: 288,
			opacity: durum.opaklik,
			// Kutunun açısını geri alarak kameraya dönük durur.
			transform: `translateY(${durum.y}px) rotateY(${-KAMERA.rotY}deg) rotateX(${-KAMERA.rotX}deg) scale(${durum.olcek}) rotateZ(${durum.rotZ + TILKI_DONUS_PAYI}deg)`,
			filter: 'url(#jf-yama)',
		}}
	/>
);

export const Kutu3D: React.FC<{
	kapak: KapakDurumu | null;
	tilki: TilkiDurumu | null;
}> = ({kapak, tilki}) => {
	const kalkma = kapak ? Math.max(0, -kapak.y) : Infinity;
	const golge = Math.max(0, Math.min(1, 1 - kalkma / 60));
	return (
		<div
			style={{
				position: 'absolute',
				transformStyle: 'preserve-3d',
				transform: `rotateX(${KAMERA.rotX}deg) rotateY(${KAMERA.rotY}deg)`,
			}}
		>
			{/* Arka ve sol yüz yalnızca kutu açılınca içeriden görünür (iç duvarlar): kurdelesiz, düz renk */}
			<div style={{...yuz, transform: `rotateY(180deg) translateZ(${YK}px)`, background: '#6a0016'}} />
			<div style={{...yuz, transform: `rotateY(-90deg) translateZ(${YK}px)`, background: '#5c0013'}} />
			<div style={{...yuz, transform: `rotateX(-90deg) translateZ(${YK}px)`, background: '#4a000f'}} />
			{tilki ? <Tilki durum={tilki} /> : null}
			<div
				style={{
					...yuz,
					transform: `rotateY(90deg) translateZ(${YK}px)`,
					background: [
						'linear-gradient(90deg,rgba(255,255,255,0.07),rgba(255,255,255,0) 9px)',
						serit('90deg', K, RENK.kurdele),
						'linear-gradient(170deg,#a80022,#7c001a)',
					].join(','),
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: (K - KUTU.kurdele) / 2,
						top: 0,
						width: KUTU.kurdele,
						height: '100%',
						background: 'linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.2))',
					}}
				/>
				<KapakGolgesi opaklik={golge} />
			</div>
			<div
				style={{
					...yuz,
					transform: `translateZ(${YK}px)`,
					background: [
						'linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0) 10px)',
						'linear-gradient(165deg,#e3123f 0%,#d4002f 35%,#a8001f 100%)',
					].join(','),
					boxShadow: 'inset 0 -42px 60px rgba(0,0,0,0.12)',
				}}
			>
				<KapakGolgesi opaklik={golge} />
				<Img
					src={staticFile('logolar/jantifox-icon.svg')}
					style={{
						position: 'absolute',
						left: 63,
						top: 72,
						width: 234,
						height: 234,
						filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.12))',
					}}
				/>
			</div>
			{kapak ? <Kapak durum={kapak} /> : null}
		</div>
	);
};
