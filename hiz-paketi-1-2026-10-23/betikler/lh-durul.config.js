// Lighthouse varsayilan mobil ayarlari; tek fark: sayfa durulana kadar daha uzun beklenir
// (ag ve islemci 5 sn sessiz kalmali, yukleme sonrasi 5 sn ek bekleme).
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    pauseAfterLoadMs: 5000,
    networkQuietThresholdMs: 5000,
    cpuQuietThresholdMs: 5000,
    maxWaitForLoad: 90000,
    skipAudits: ['screenshot-thumbnails', 'final-screenshot']
  }
};
