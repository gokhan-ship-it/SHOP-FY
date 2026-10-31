// Sahnenin bir karedeki tam durumu. Üç klip de aynı <Sahne> bileşenini bu durumla çizer;
// böylece geçiş karelerinde (Klip1 0 = Klip2 0, Klip2 59 = Klip3 0) DOM birebir aynı olur.

export type KapakDurumu = {
	x: number;
	y: number;
	z: number;
	rotZ: number;
	rotX: number;
};

export type TilkiDurumu = {
	y: number;
	olcek: number;
	rotZ: number;
	opaklik: number;
};

export type SahneDurumu = {
	// Kutu grubu (gövde + kapak): ekran düzleminde öteleme/dönme, alttan esneme.
	kutu: {y: number; rot: number; sx: number; sy: number};
	// null: kapak sahnede yok (uçup kadrajdan çıktı).
	kapak: KapakDurumu | null;
	zemin: {olcek: number; opaklik: number};
	parlama: {opaklik: number; olcek: number};
	isin: {opaklik: number; olcek: number; aci: number};
	// null: tilki çizilmez (kutunun içinde, görünmez).
	tilki: TilkiDurumu | null;
	// Klip 2'nin karesi; null: konfeti yok.
	konfetiKare: number | null;
};

export const DINLENME: SahneDurumu = {
	kutu: {y: 0, rot: 0, sx: 1, sy: 1},
	kapak: {x: 0, y: 0, z: 0, rotZ: 0, rotX: 0},
	zemin: {olcek: 1, opaklik: 1},
	parlama: {opaklik: 0, olcek: 1},
	isin: {opaklik: 0, olcek: 1, aci: 0},
	tilki: null,
	konfetiKare: null,
};
