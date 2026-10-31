import React from 'react';
import {Composition} from 'remotion';
import {Klip1Bekleme, Klip2Acilis, Klip3Acik} from './klipler';
import {BOYUT, FPS, KARE} from './sabitler';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Klip1Bekleme"
				component={Klip1Bekleme}
				durationInFrames={KARE.klip1}
				fps={FPS}
				width={BOYUT}
				height={BOYUT}
			/>
			<Composition
				id="Klip2Acilis"
				component={Klip2Acilis}
				durationInFrames={KARE.klip2}
				fps={FPS}
				width={BOYUT}
				height={BOYUT}
			/>
			<Composition
				id="Klip3Acik"
				component={Klip3Acik}
				durationInFrames={KARE.klip3}
				fps={FPS}
				width={BOYUT}
				height={BOYUT}
			/>
		</>
	);
};
