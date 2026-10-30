import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {DINLENME, SahneDurumu} from './durum';
import {Sahne} from './Sahne';
import {ISIN, TILKI} from './sabitler';

// Tüm hareketler kare bazlı: useCurrentFrame + interpolate. CSS animasyonu/transition yok.
// Değerler kutu-yerel birimlerde (taslak × 3); ekrandaki karşılıkları × 0,86 (BRIEF tabloları).

const SABIT = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1); // CSS ease-in-out
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1); // CSS ease-out

const ara = (
	kare: number,
	kareler: number[],
	degerler: number[],
	easing: (t: number) => number = EASE_IN_OUT,
) => interpolate(kare, kareler, degerler, {...SABIT, easing});

// ---------- Klip 1 · Bekleme (72 kare, döngü) ----------
// Kare 0–33 ve 53–71 dinlenme: Klip 1 kare 0 = Klip 2 kare 0, 71 → 0 kesintisiz.

export const klip1Durumu = (f: number): SahneDurumu => {
	const kutuK = [33, 36, 40, 45, 49, 53];
	const kapakK = [33, 37, 42, 46, 52];
	return {
		...DINLENME,
		kutu: {
			// ekranda 18 / 26 / 15 / 8 px yukarı
			y: ara(f, kutuK, [0, -21, -30, -18, -9, 0]),
			rot: ara(f, kutuK, [0, -7, 6, -5, 3, 0]),
			sx: 1,
			sy: 1,
		},
		kapak: {
			x: 0,
			// ekranda 26 / 15 / 23 px ek kalkış
			y: ara(f, kapakK, [0, -30, -18, -27, 0]),
			z: 0,
			rotZ: ara(f, kapakK, [0, -4, 5, -3, 0]),
			rotX: 0,
		},
		zemin: {
			olcek: ara(f, [33, 40, 53], [1, 0.82, 1]),
			opaklik: ara(f, [33, 40, 53], [1, 0.7, 1]),
		},
	};
};

// ---------- Klip 2 · Açılış (60 kare) ----------

const klip2Kapak = (f: number) => {
	if (f >= 30) {
		return null; // kare 30'da kadrajın tamamen dışında
	}
	const k = [0, 8, 30];
	// 0–8: hızlı kalkış, tepede yavaşlar · 8–30: dönerek sol üste hızlanarak uçar
	const once = (d: number[]) => (f <= 8 ? ara(f, k.slice(0, 2), d.slice(0, 2), Easing.out(Easing.cubic)) : ara(f, k.slice(1), d.slice(1), Easing.in(Easing.quad)));
	return {
		x: once([0, 0, -810]),
		y: once([0, -138, -798]),
		z: once([0, 0, 120]),
		rotZ: once([0, -10, -48]),
		rotX: once([0, 0, 55]),
	};
};

const klip2Tilki = (f: number) => {
	if (f <= 8) {
		return null; // kare 8'de kutunun içinde, görünmez
	}
	const kareler = [8, 26, 32, 38];
	const segment = (degerler: number[]) => {
		if (f <= 26) {
			return ara(f, kareler.slice(0, 2), degerler.slice(0, 2), Easing.out(Easing.cubic));
		}
		return ara(f, kareler.slice(1), degerler.slice(1), EASE_IN_OUT);
	};
	return {
		// tepe (26): son konumdan ≈ 19 px yukarı, %106 (BRIEF ≈ 21 px; 40 px güvenli kenar korunsun diye
		// 2 px az) · kare 32: ≈ 15 px aşağı, %98 · kare 38: yerinde
		y: segment([24, -285, -246, TILKI.sonY]),
		olcek: segment([0.7, 1.06, 0.98, 1]),
		rotZ: 0,
		opaklik: ara(f, [8, 12], [0, 1], Easing.linear),
	};
};

export const klip2Durumu = (f: number): SahneDurumu => ({
	kutu: {
		y: 0,
		rot: 0,
		sx: ara(f, [0, 5, 10, 16], [1, 1.08, 0.96, 1]),
		sy: ara(f, [0, 5, 10, 16], [1, 0.88, 1.06, 1]),
	},
	kapak: klip2Kapak(f),
	zemin: {olcek: 1, opaklik: 1},
	parlama: {
		opaklik: ara(f, [6, 17, 33], [0, 1, 0.75], EASE_OUT),
		olcek: ara(f, [6, 17, 33], [0.4, 1.1, 1], EASE_OUT),
	},
	isin: {
		opaklik: ara(f, [8, 29], [0, 1], EASE_OUT),
		olcek: ara(f, [8, 29], [0.3, 1], EASE_OUT),
		aci: ISIN.hizKare * f,
	},
	tilki: klip2Tilki(f),
	konfetiKare: f >= 7 && f <= 56 ? f : null,
});

// ---------- Klip 3 · Açık döngü (90 kare) ----------
// Klip 3 kare 0 = Klip 2 kare 59. Işınlar 3 sn'de 67,5° (= 3 periyot) döner → döngü kesintisiz.

export const klip3Durumu = (f: number): SahneDurumu => {
	const salinim = (1 - Math.cos((2 * Math.PI * f) / 90)) / 2; // durağandan başlar
	return {
		kutu: {y: 0, rot: 0, sx: 1, sy: 1},
		kapak: null,
		zemin: {olcek: 1, opaklik: 1},
		parlama: {opaklik: 0.75, olcek: 1},
		isin: {opaklik: 1, olcek: 1, aci: ISIN.klip2SonAci + ISIN.hizKare * f},
		tilki: {
			y: TILKI.sonY + TILKI.salinimY * salinim,
			olcek: 1,
			rotZ: TILKI.salinimRot * salinim,
			opaklik: 1,
		},
		konfetiKare: null,
	};
};

export const Klip1Bekleme: React.FC = () => <Sahne durum={klip1Durumu(useCurrentFrame())} />;
export const Klip2Acilis: React.FC = () => <Sahne durum={klip2Durumu(useCurrentFrame())} />;
export const Klip3Acik: React.FC = () => <Sahne durum={klip3Durumu(useCurrentFrame())} />;
