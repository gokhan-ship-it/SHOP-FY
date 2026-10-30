import React from 'react';
import {AbsoluteFill} from 'remotion';
import {SahneDurumu} from './durum';
import {Konfeti} from './Konfeti';
import {Kutu3D} from './Kutu';
import {BOYUT, ISIN, KAMERA, MERKEZ, RENK, ZEMIN} from './sabitler';

// Işın, parlama ve konfeti kenara yaklaşırken tamamen söner: kenardan 32 px içeride sıfır,
// içeri doğru yumuşakça açılır. İki eksen ayrı katmanla çarpılır.
const kenarMaskesi = (yon: 'right' | 'bottom') =>
	`linear-gradient(to ${yon},transparent 0px,transparent 32px,rgba(0,0,0,0.15) 60px,rgba(0,0,0,0.45) 88px,rgba(0,0,0,0.78) 114px,#000 140px,#000 ${BOYUT - 140}px,rgba(0,0,0,0.78) ${BOYUT - 114}px,rgba(0,0,0,0.45) ${BOYUT - 88}px,rgba(0,0,0,0.15) ${BOYUT - 60}px,transparent ${BOYUT - 32}px,transparent ${BOYUT}px)`;

const KenarMaskeli: React.FC<{children: React.ReactNode}> = ({children}) => (
	<AbsoluteFill style={{maskImage: kenarMaskesi('right'), WebkitMaskImage: kenarMaskesi('right')}}>
		<AbsoluteFill style={{maskImage: kenarMaskesi('bottom'), WebkitMaskImage: kenarMaskesi('bottom')}}>
			{children}
		</AbsoluteFill>
	</AbsoluteFill>
);

const isinDeseni = (aci: number) => {
	const c1 = 'rgba(255,201,74,0.55)';
	const c0 = 'rgba(255,201,74,0)';
	const y = 0.8; // huzme kenarı yumuşatma (derece)
	return `repeating-conic-gradient(from ${aci}deg,${c0} 0deg,${c1} ${y}deg,${c1} ${ISIN.genislik - y}deg,${c0} ${ISIN.genislik}deg,${c0} ${ISIN.periyot}deg)`;
};

// Merkezden dışa sönme (taslak: #000 %18 → saydam %66, 1020 px öğede 130 → 476 px).
// İlk 90 px'te de söner: huzmeler merkezde birleşip tilkinin gözlük boşluklarında titreşmesin.
const ISIN_MASKESI =
	'radial-gradient(circle at center,rgba(0,0,0,0) 0px,#000 90px,#000 130px,rgba(0,0,0,0) 476px)';

// Tilkinin beyaz "yama" konturu (≈ 6 px) ve altındaki yumuşak bordo gölge.
const Filtreler: React.FC = () => (
	<svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
		<defs>
			<filter
				id="jf-yama"
				x="-30%"
				y="-30%"
				width="160%"
				height="160%"
				colorInterpolationFilters="sRGB"
			>
				{/* 3 px genişlet + bulanıklaştır + eşikle: köşeleri yuvarlak ≈ 6,5 px kontur. Eşik orta
				    alfada (≈ 0,12) ve yumuşak tutuldu; 8 bit alfada noktalanma olmaz. */}
				<feMorphology in="SourceAlpha" operator="dilate" radius="3" result="genis" />
				<feGaussianBlur in="genis" stdDeviation="3" result="bulanik" />
				<feComponentTransfer in="bulanik" result="kontur">
					<feFuncA type="linear" slope="8" intercept="-0.474" />
				</feComponentTransfer>
				<feFlood floodColor="#ffffff" result="beyaz" />
				<feComposite in="beyaz" in2="kontur" operator="in" result="yama" />
				<feGaussianBlur in="kontur" stdDeviation="9" result="golgeBulanik" />
				<feOffset in="golgeBulanik" dy="18" result="golgeKayik" />
				<feFlood floodColor={RENK.bordo} floodOpacity="0.25" result="bordo" />
				<feComposite in="bordo" in2="golgeKayik" operator="in" result="golge" />
				<feMerge>
					<feMergeNode in="golge" />
					<feMergeNode in="yama" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
	</svg>
);

export const Sahne: React.FC<{durum: SahneDurumu}> = ({durum}) => {
	const {kutu, kapak, zemin, parlama, isin, tilki, konfetiKare} = durum;
	return (
		<AbsoluteFill style={{backgroundColor: ZEMIN, overflow: 'hidden'}}>
			<Filtreler />
			{parlama.opaklik > 0 || isin.opaklik > 0 ? (
				<KenarMaskeli>
					{parlama.opaklik > 0 ? (
						<div
							style={{
								position: 'absolute',
								left: BOYUT / 2 - 300,
								top: MERKEZ.isikY - 300,
								width: 600,
								height: 600,
								borderRadius: '50%',
								opacity: parlama.opaklik,
								transform: `scale(${parlama.olcek})`,
								background:
									'radial-gradient(circle at center,rgba(255,255,255,0.95) 0px,rgba(255,250,240,0.78) 70px,rgba(255,236,200,0.4) 191px,rgba(255,236,200,0.16) 245px,rgba(255,236,200,0) 297px)',
							}}
						/>
					) : null}
					{isin.opaklik > 0 ? (
						<div
							style={{
								position: 'absolute',
								left: BOYUT / 2 - 510,
								top: MERKEZ.isikY - 510,
								width: 1020,
								height: 1020,
								borderRadius: '50%',
								opacity: isin.opaklik,
								transform: `scale(${isin.olcek})`,
								background: isinDeseni(isin.aci),
								maskImage: ISIN_MASKESI,
								WebkitMaskImage: ISIN_MASKESI,
							}}
						/>
					) : null}
				</KenarMaskeli>
			) : null}
			{/* Zemin gölgesi: bordo, en koyu yerde %28 */}
			<div
				style={{
					position: 'absolute',
					left: BOYUT / 2 - 240,
					top: MERKEZ.zeminY - 36,
					width: 480,
					height: 72,
					borderRadius: '50%',
					opacity: zemin.opaklik,
					transform: `scale(${zemin.olcek})`,
					background:
						'radial-gradient(closest-side,rgba(89,0,28,0.28),rgba(89,0,28,0.22) 30%,rgba(89,0,28,0.12) 58%,rgba(89,0,28,0.04) 82%,rgba(89,0,28,0))',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: BOYUT / 2,
					top: MERKEZ.kutuY,
					width: 0,
					height: 0,
					perspective: KAMERA.perspektif,
					perspectiveOrigin: `50% ${KAMERA.perspektifOrijinY}px`,
					transform: `scale(${KAMERA.olcek})`,
				}}
			>
				<div
					style={{
						position: 'absolute',
						transformStyle: 'preserve-3d',
						// Dönme ekseni kutunun ortası; esneme kutunun tabanından (y = 200).
						transform: `translateY(${kutu.y}px) rotate(${kutu.rot}deg) translateY(200px) scale(${kutu.sx},${kutu.sy}) translateY(-200px)`,
					}}
				>
					<Kutu3D kapak={kapak} tilki={tilki} />
				</div>
			</div>
			{konfetiKare !== null ? (
				<KenarMaskeli>
					<Konfeti kare={konfetiKare} />
				</KenarMaskeli>
			) : null}
		</AbsoluteFill>
	);
};
