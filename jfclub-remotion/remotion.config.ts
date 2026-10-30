// Remotion CLI ayarları (Studio ve render için ortak).
// Klip bazlı CRF değerleri scripts/render.sh içinde verilir.
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setMuted(true);
Config.setX264Preset('veryslow');
