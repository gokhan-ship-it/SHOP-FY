import React from 'react';
import {Easing, interpolate, random} from 'remotion';
import {BOYUT, MERKEZ} from './sabitler';

// 26 parça konfeti. Kutunun ağzından yukarı ve yanlara yay çizerek saçılır,
// hava direnciyle yavaşlar, dönerek düşer ve söner. Kare 57'de hiç parça kalmaz.

type Sekil = 'daire' | 'yildiz' | 'kalp' | 'dikdortgen';

const SEKILLER: Sekil[] = ['daire', 'yildiz', 'kalp', 'dikdortgen'];
const RENKLER = ['#BC0027', '#FF501B', '#FFC94A', '#59001C', '#FBEAD6', '#FFFFFF'];
const KONTURLU = new Set(['#FBEAD6', '#FFFFFF']);

const ADET = 26;
const BASLA_EN_ERKEN = 7;
const BASLA_ARALIK = 4; // 7–11
const SON_KARE = 56; // bu karede hepsinin opaklığı 0
const SURUKLEME = 0.075; // 1/kare
const YERCEKIMI = 0.85; // px/kare²

type Parca = {
	sekil: Sekil;
	renk: string;
	basla: number;
	omur: number;
	x0: number;
	y0: number;
	vx: number;
	vy: number;
	boyut: number;
	rot0: number;
	donus: number;
	cevirme0: number;
	cevirmeHiz: number;
};

const PARCALAR: Parca[] = new Array(ADET).fill(true).map((_, i) => {
	const r = (ad: string) => random(`jfclub-konfeti-${i}-${ad}`);
	const basla = BASLA_EN_ERKEN + r('basla') * BASLA_ARALIK;
	const omur = Math.min(SON_KARE - basla, 38 + r('omur') * 8);
	// Yukarı açılan yelpaze: -162° (sol) … -18° (sağ); sırayla iki yana dağıt.
	// Yana gidenler daha uzağa uçar, dikey gidenler üst kenara varmadan döner.
	const taraf = i % 2 === 0 ? -1 : 1;
	const aci = ((-90 + taraf * (20 + r('aci') * 52)) * Math.PI) / 180;
	const mesafe = 230 + r('mesafe') * 130 + 100 * Math.abs(Math.cos(aci));
	const hiz = mesafe * SURUKLEME;
	return {
		sekil: SEKILLER[i % SEKILLER.length],
		renk: RENKLER[(i + Math.floor(i / SEKILLER.length)) % RENKLER.length],
		basla,
		omur,
		x0: BOYUT / 2 + (r('x0') - 0.5) * 70,
		y0: MERKEZ.agizY + (r('y0') - 0.5) * 16,
		vx: Math.cos(aci) * hiz,
		vy: Math.sin(aci) * hiz,
		boyut: 24 + r('boyut') * 10,
		rot0: r('rot0') * 360,
		donus: (r('donus') - 0.5) * 22,
		cevirme0: r('cevirme0') * Math.PI * 2,
		cevirmeHiz: 0.16 + r('cevirmeHiz') * 0.2,
	};
});

const YILDIZ = (() => {
	const n: string[] = [];
	for (let k = 0; k < 10; k++) {
		const a = -Math.PI / 2 + (k * Math.PI) / 5;
		const rr = k % 2 === 0 ? 0.5 : 0.21;
		n.push(`${(Math.cos(a) * rr).toFixed(4)},${(Math.sin(a) * rr).toFixed(4)}`);
	}
	return `M${n.join('L')}Z`;
})();

// -0.5…0.5 kutusuna sığan kalp.
const KALP =
	'M0,0.42 L-0.36,0.06 C-0.55,-0.13 -0.45,-0.42 -0.2,-0.42 C-0.07,-0.42 0,-0.31 0,-0.31 C0,-0.31 0.07,-0.42 0.2,-0.42 C0.45,-0.42 0.55,-0.13 0.36,0.06 Z';

const SekilCiz: React.FC<{sekil: Sekil; renk: string}> = ({sekil, renk}) => {
	const kontur = KONTURLU.has(renk)
		? {stroke: 'rgba(89,0,28,0.24)', strokeWidth: 0.07}
		: {};
	if (sekil === 'daire') {
		return <circle r={0.42} fill={renk} {...kontur} />;
	}
	if (sekil === 'yildiz') {
		return <path d={YILDIZ} fill={renk} strokeLinejoin="round" {...kontur} />;
	}
	if (sekil === 'kalp') {
		return <path d={KALP} fill={renk} {...kontur} />;
	}
	return <rect x={-0.17} y={-0.5} width={0.34} height={1} rx={0.08} fill={renk} {...kontur} />;
};

export const Konfeti: React.FC<{kare: number}> = ({kare}) => {
	return (
		<svg
			width={BOYUT}
			height={BOYUT}
			viewBox={`0 0 ${BOYUT} ${BOYUT}`}
			style={{position: 'absolute', left: 0, top: 0}}
		>
			{PARCALAR.map((p, i) => {
				const t = kare - p.basla;
				if (t <= 0 || t >= p.omur) {
					return null;
				}
				const e = Math.exp(-SURUKLEME * t);
				const terminal = YERCEKIMI / SURUKLEME;
				const x = p.x0 + (p.vx / SURUKLEME) * (1 - e);
				const y = p.y0 + (p.vy / SURUKLEME) * (1 - e) + terminal * (t - (1 - e) / SURUKLEME);
				const olcek = interpolate(t, [0, 6], [0.4, 1], {
					extrapolateRight: 'clamp',
					easing: Easing.out(Easing.quad),
				});
				const opaklik = interpolate(t, [p.omur * 0.55, p.omur], [1, 0], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: Easing.inOut(Easing.quad),
				});
				const rot = p.rot0 + p.donus * t;
				// Kâğıt gibi takla: daire dışındaki şekiller bir eksende basıklaşır.
				const cevir = p.sekil === 'daire' ? 1 : Math.cos(p.cevirme0 + p.cevirmeHiz * t);
				const sy = Math.sign(cevir || 1) * Math.max(0.18, Math.abs(cevir));
				return (
					<g
						key={i}
						opacity={opaklik}
						transform={`translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${(p.boyut * olcek).toFixed(3)},${(p.boyut * olcek * sy).toFixed(3)})`}
					>
						<SekilCiz sekil={p.sekil} renk={p.renk} />
					</g>
				);
			})}
		</svg>
	);
};
