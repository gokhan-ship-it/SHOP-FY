# Brand-language conversion rules (texttonext.com, Shopify theme)

Goal: change ONLY colors, typography (font family / weight / heading letter-spacing), button styling and heading color style.
Layouts, sizes, spacing, images, videos, TEXTS, line breaks, markup structure, JS behavior and functions stay exactly the same.
Never change any visible text string. Never change font sizes. Never change JS logic (only color literals inside JS if they are pure styling, and only if clearly safe).

## Palette (the ONLY allowed colors, apart from exceptions below)
| token | value | use |
|---|---|---|
| ink | #0A0A0A | main text, primary buttons, dark cards, icons on light |
| lime | #D6FF00 | the ONLY accent |
| surface | #F4F4F4 | light section background |
| white | #FFFFFF | cards on surface; primary text on dark |
| black | #000000 | full dark sections, mobile menu |
| dark-raised | #141414 | cards on dark |
| muted | #5C5C57 | secondary text on light |
| muted-strong | #8A8A85 | grey 2nd line of two-line headings >=24px; small labels on dark. NEVER for text <24px on light |
| muted-dark | #A3A39E | secondary text on dark |
| line | #D2D2CD | lines/borders on light |
| line-dark | #262624 | lines/borders on dark |

Transparency variants of palette colors (e.g. rgba(10,10,10,.8), rgba(255,255,255,.1)) are fine.

### Lime rules
- Lime only on small elements: badges, highlighted step circle, arrow circle, small frames, counter digits.
- Always ink text on lime. NEVER lime as a text color on a light background.
- Max 1–2 neon elements per screen. No big neon button, no big neon area.

## Font
- Single family Poppins (already set in theme settings: --font-heading-family / --font-body-family). Weights: body 400, medium 500, semibold 600, heading 700.
- In own sections replace hard-coded font-family values (Inter, -apple-system, BlinkMacSystemFont, "SF Pro ...", system-ui, Helvetica, Arial stacks) with
  `var(--font-heading-family)` for headings and `var(--font-body-family)` for everything else. Keep existing font-weight values unless they are heading text (then 700) – do not change sizes.
- No new font files, no Google Fonts.
- Heading letter-spacing (only on headings / titles in own sections): size >=28px -> -1px ; 20–27px -> -0.8px ; 16–19px -> -0.3px. For fluid sizes (clamp/vw) use the size at phone width 390px to decide; if a heading spans ranges you may use the rule for its largest common size. Body text letter-spacing untouched.
- Do NOT change any font-size. If you suspect Poppins (wider than Inter) will overflow/wrap badly somewhere, list it in your report – don't shrink.

## Buttons
- Primary: background #0A0A0A, text #FFFFFF, border-radius 999px, font-weight 600. All blue / green / mint buttons become primary (Single'ı seç / Couple'ı seç, Sepete ekle, Sepete ekle (0/2) bar, Satın Al, Gönder, HEMEN İNCELE …).
- Secondary: white background, ink text, 1px #D2D2CD border on light. On dark: white background, ink text (no border needed).
- Links: ink, underlined or with an arrow. No blue links.
- Focus ring: ink; white on dark.
- Don't change button paddings/heights/sizes; radius -> 999px is allowed for buttons.

## Two-line heading rule
- Remove accent color from the second part of headings (e.g. "Açılacağı Günü Sen Belirle." sage; "Sadece buluştuğunuzda açılır." and "Dört Adımda Öğrenin." burgundy; "sadece size ait" green; "5 saniyede deneyimle." red).
- Second part becomes #8A8A85 on BOTH light and dark backgrounds. First part: ink on light, white on dark.
- Gradient heading text (background-clip:text) becomes a flat color. Text and line breaks stay.

## Icons and stars
- Icons: ink on light, white on dark, thin stroke (don't change geometry).
- Multicolor icons (#BF5AF2, #FF9F0A, #2CD784, #D3FB04) become single-color.
- Verified blue tick #1D9BF0 -> ink (white on dark).
- Stars (#F5A623, #F59E0B, #E0A95A) -> ink; white on dark.

## Mapping (apply by context)
Dark text/backgrounds: #171717 #111111 #1D1D1F #15171C #16181D #0A1A1C #161617 #1C1C1C #121212 #242424 #15181C #16231C
 - as text -> #0A0A0A ; as full dark section background -> #000000 ; as card/box -> #0A0A0A
Cards on dark -> #141414: #161616 #1B1D1F #1D1D1F #2D2D2F #1C1C1E #181B1E #1C232B #101010 #2C2E33 #1F2C26 #4A4A4A
tt-baslik bar: #161617 at 72% -> #0A0A0A at 80% (keep blur).

Light backgrounds -> #F4F4F4: #F5F5F7 #F1F2F5 #F7F8FA #F1F2F6 #F7F7F8 #FAFAFA(as section bg) #F8F8F8 #F5F5F5 #F9F9F9 #F7F7F7 #ECEEF1 #E5E8EC #E9E9EC #EBEBEB (also similar near-white greys like #F3F3F3 #F0F0F0 #F7F9FD #F5F9FD used as backgrounds)
Cards on light stay #FFFFFF.

Secondary text on light -> #5C5C57 (heading 2nd lines -> #8A8A85): #6E6E73 #6B6F78 #6B7280 #4B4B4B #3D3D3D #575757 #666666 #777777 #999999 #8B8E95 #A3A6AD #86868B #7D858E #79828C #5D666F #30373E (and similar greys)
Secondary text on dark -> #A3A39E: #86868B #A1A1A6 #C9C9C9 #B8BEC6 #8B939D #BDBDB8 #E8E8E8 #DADADA
Small top labels on dark ("1. GÜN", "KARŞILAŞTIRMA") -> #8A8A85.

Lines/borders on light -> #D2D2CD: #D2D2D7 #E3E5E8 #E1E4E8 #E8E8ED #E3E3E6 #E5E5E5 #C9CED5 #E6E8EB #7D7D7D (#CCCCCC #D1D5DB too)
Lines/borders on dark -> #262624: #2A2A2C #2E2E30 #2E2E2C #FFFFFF at 10–14% #2A323C

Blues (#0071E3 #0A6CFF #0B61CD and others): button/chip bg -> #0A0A0A + white text; link/accent text -> #0A0A0A (white on dark); line/icon -> #0A0A0A; progress fill -> #0A0A0A.

Greens:
- button backgrounds (#3E5E4A #30614B #2E5E46 #1F4648) -> #0A0A0A
- small accent/badge backgrounds ("İkincisi yarı fiyatına", "%50", "2'li set", "Kampanyalı"; #3E5E4A #78F5AB #5CC98F #4FB883) -> #D6FF00 bg with #0A0A0A text
- light green backgrounds (#D3DDD2 #EEF6F1 #F0F7F3 #EDF7F0 #E8F3EC …) -> #F4F4F4
- frames/borders (#599176 #8FCBB0 #9FC4B0 #9FD4BD) -> #D6FF00 on dark, #0A0A0A on light
- green text (#3C4E40 #30614B #1A7F37 …) -> #0A0A0A (white on dark)

Reds / burgundy (#C60303 #B21E3A #FF453A #9E2B2B #E0364A #4A0C16):
- in headings -> two-line rule
- icon/decoration -> #0A0A0A (white on dark)
- STATUS reds stay (price discount, stock warning, form error). LIST every kept status red (file + selector + reason) in your report.

Other: purple #BF5AF2, oranges #FF9F0A #F5A623, grey-blues #6C757E #39434E #2B3138 #46515C #A8B1BA #B9BEC5 #E6E8EB -> ink / white / #5C5C57 / #D2D2CD by context.
#D3FB04 and #D6FF02 -> #D6FF00.
Image overlay darkening gradients (black->transparent over photos/videos) STAY. Decorative colored gradients become flat.
Pure #000000 and #FFFFFF stay as they are where already correct.

## Special per-section rules
- tt-baslik: background #0A0A0A at 80% (keep blur), white icons. Blue "Ürünü Öğren" button -> white bg, ink text, fully rounded.
- tt-nasil-calisir floating button: bg #0A0A0A, white text, 2px #D6FF00 border.
- Wheel card (in tt-secim-kartlari and tt-cok-satanlar, snippet ttn-cark-kart): card #0A0A0A, title white, subtext #A3A39E; "Çevir" button #D6FF00 bg + ink text; wheel icon slices #D6FF00, #FFFFFF, #8A8A85, #141414; center white.
- ttn-cark-genel (wheel popup): slices alternate #0A0A0A, #D6FF00, #F4F4F4, #8A8A85; slice text readable (ink on lime and light, white on dark); buttons primary style.
- tt-secim-kartlari: selected Single/Couple card ink bg + white text, unselected white bg + #D2D2CD border; "İkincisi yarı fiyatına" badge lime+ink; set box: green dashed line + green text -> #0A0A0A, "%50" badge lime+ink; progress bars filled #0A0A0A empty #D2D2CD; info band stays ink, icon white; "Sepete ekle (0/2)" bar primary style; chips: selected ink + white text, unselected white + #D2D2CD border. DO NOT TOUCH the "Nasıl çalışır" card or its sheet (snippets tt-sc-nk-kart.liquid, tt-sc-nk-pencere.liquid and their CSS rules, selectors containing "nk").
- tt-cok-satanlar: "Tümü" chip and scroll arrows ink; "2'li set" badge lime+ink; ranking badges white bg, ink text, #D2D2CD border; blue links -> ink.
- tt-catal-karsilastirma: bg #000000, cards #141414; Single/Couple buttons white bg + ink text; blue "Single Kapsül / Couple Kapsül" text -> white.
- hediye-omru: bg #F4F4F4, row cards white, bars #0A0A0A, "Kilitlendi" bar #0A0A0A, slider knob ink; red status text -> #5C5C57.
- avantaj-kartlari / "Her adımı kolaylaştırdık": cards #141414, icons white, "+" buttons white bg with ink.
- couple-bulusma and guclu-header: two-line heading rule; "Satın Al" primary; "Ürünü Öğren" secondary.
- adim-yigin / apple-slayt: "Adım N" labels lime with ink (small badge), titles white, descriptions #A3A39E.
- tt-veri: numbers white, small labels #8A8A85, descriptions #A3A39E; no green / blue.
- Comparison section ("Biz de seçerken zorlanıyoruz", ai_gen_block_8237de9 Product comparison): Hediye and Couple buttons white bg with ink text.
- mozaik-kartlar: "HEMEN İNCELE" primary; review card backgrounds #F4F4F4.
- newsletter: bg #000000, input #141414, submit button white with ink arrow.
- urun-alt-cta: link ink with an arrow.
- main-product: "Sepete ekle" primary; quantity and material selectors: selected one gets an ink border; "Boyutlar" and "Cihaz uyumluluğu" secondary; stars ink.
- product-recommendations, main-search, main-cart, cart drawer: prices ink, discount badge lime + ink, buttons primary.
- Popups (taksit, Boyutlar, cihaz uyumluluğu, avantaj, variant selector, cookie): titles ink Poppins 700, primary/secondary buttons, no blue or green.
- Mobile menu: color and font only.

## Do NOT touch
Product images, gallery frames, videos, UGC videos, logos; GemPages files (gp-*); unused sections; checkout; texts; JS behavior.

## Section settings stored in JSON (templates/*.json, sections/*.json)
Many colors are section/block settings in JSON. DO NOT edit JSON files directly. Instead append patch lines to your patch file
(`dil/yamalar/<AGENT>.tsv`), tab separated, one per setting:
`file<TAB>section_key<TAB>path<TAB>old_value<TAB>new_value<TAB>note`
- file: e.g. templates/index.json ; section_key: key inside "sections" ; path: dot path inside the section object, e.g. `settings.bg_color` or `blocks.<blockKey>.settings.title_color` (nested theme blocks: `blocks.<k>.blocks.<k2>.settings.x`).
- old_value must equal the current value exactly (case-sensitive as stored).
Use `python3 dil/ayar_renkleri.py <section-type>` to list current color settings (columns: file, key, type, path, value). The list of sections actually rendered on the 20 audited pages is `dil/kullanilan.json` ([file, key, type, pages]) – only patch those (skip disabled/unused ones).
Also check: if a section setting has a schema default that's a non-palette color, the JSON value wins when present; if the JSON has no value the schema default is used – then change the schema "default" in the liquid file.

## Where things are
Working copy (git-tracked, edit in place): `dil/tema/` (relative to scratchpad `/tmp/claude-0/-home-user-SHOP-FY/d49b80ec-3b1c-593f-b1ad-d3ce90ee2f2d/scratchpad/`). Before screenshots + per-section computed colors of the 20 pages: `site/cikti/telefon/`, `site/cikti/bolumler/`, `site/cikti/veri/*.json`, report `site/cikti/bolumler.md`.
Live preview of the original: https://texttonext.com/?preview_theme_id=189124936000 (read-only; you may look with Playwright: NODE_PATH=/opt/node22/lib/node_modules, executablePath /opt/pw-browsers/chromium).
