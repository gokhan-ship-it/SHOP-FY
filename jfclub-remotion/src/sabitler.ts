// Ortak ölçüler ve renkler. Referans sahne 240 px'te çizildi; burada her şey × 3 (720 px).

export const BOYUT = 720;
export const FPS = 30;
export const ZEMIN = '#FBEAD6';

export const KARE = {
	klip1: 72,
	klip2: 60,
	klip3: 90,
} as const;

// Kamera: taslakta rotateX(-21°) rotateY(-33°), perspektif 760 px, ölçek 0,86.
export const KAMERA = {
	rotX: -21,
	rotY: -33,
	perspektif: 760 * 3,
	perspektifOrijinY: -40 * 3,
	olcek: 0.86,
} as const;

// Sahne merkezleri (720 ölçeğinde, piksel).
export const MERKEZ = {
	kutuY: 138 * 3, // 414
	isikY: 66 * 3, // 198 · parlama ve ışın huzmelerinin merkezi
	zeminY: 216 * 3, // 648 · zemin gölgesinin merkezi
	agizY: 268, // kutu ağzının ekrandaki merkezi (konfetinin çıktığı yer)
} as const;

// Kutu ölçüleri (kutu-yerel birimler, perspektif ve 0,86 ölçekten önce).
export const KUTU = {
	kenar: 120 * 3, // 360
	kapakKenar: 132 * 3, // 396
	kapakYukseklik: 28 * 3, // 84
	kapakY: -74 * 3, // -222 · kapağın gövdeye oturduğu yer
	kurdele: 18 * 3, // 54 → ekranda ≈ 46 px
	kurdeleCizgi: 2,
} as const;

export const RENK = {
	kurdele: '#F8E2C7',
	kurdeleKenar: 'rgba(89,0,28,0.16)',
	fiyonkKenar: '#E2BF97',
	bordo: '#59001C',
	altin: '#FFC94A',
} as const;

// Işın huzmeleri: 16 huzme, 22,5° periyot, 22,5°/sn dönüş (= 0,75°/kare).
export const ISIN = {
	periyot: 22.5,
	genislik: 7,
	hizKare: 22.5 / FPS,
	// Klip 2'nin son karesindeki açı; Klip 3 buradan devam eder.
	klip2SonAci: (22.5 / FPS) * (60 - 1),
} as const;

// Tilki (kutu-yerel birimler). Taslak: translateY(-88px), salınımda -95px.
export const TILKI = {
	boy: 96 * 3, // 288 → ekranda ≈ 248-258 px
	sonY: -88 * 3, // -264
	salinimY: -7 * 3, // -21 → ekranda ≈ 18 px yukarı
	salinimRot: -4,
} as const;
