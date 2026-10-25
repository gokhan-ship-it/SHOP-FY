import { Config } from "@remotion/cli/config";

// Ürün fotoğrafları ve ses "assets" klasöründen okunur.
Config.setPublicDir("./assets");

// Yüksek kalite, renkleri doğru (saf beyaz) tutan MP4 ayarları.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCrf(16);
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
