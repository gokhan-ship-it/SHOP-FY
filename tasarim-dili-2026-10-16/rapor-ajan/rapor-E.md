# Agent E report: layout override snippets, icons, focus ring, neon count, wheel fallbacks

All edits were made in place in `dil/tema`. Nothing was committed, pushed or uploaded. No JSON template or section-group file was edited, and no patch file was needed.
Validation: `{% %}` / `{{ }}` and block tags are balanced in every touched file. The schema JSON of tt-baslik, tt-cok-satanlar and tt-secim-kartlari parses with json.loads. Their schemas were not changed.

## Layout-rendered snippets checked (from layout/theme.liquid)
These snippets have no colour, font-family or heading styling, so they were left as they are: tt-couple-izgara, tt-couple-eksen, tt-couple-cubuk, tt-couple-koleksiyon, tt-koleksiyon-kart, tt-sepet-cekmece and tt-serit-ortala.
- tt-tekli-gorunum: only the video lightbox (rgba(0,0,0,.92) backdrop, #000 player, white close button and white focus ring). This is overlay UI, so it was kept.
- css-variables and tt-urun-hap: agent D already did these.
- The `tt-couple-urun` section group is only rendered on product.zaman-kapsulu-couple, which is not one of the audited pages, so it was not touched.

## snippets/tt-couple.liquid (couple page, #MainContent.tt-couple-page, specificity 1,2,0)
- Type tokens:
  - h1: weight 600 -> 700, letter-spacing -0.022em -> -1px (38/52px).
  - h2: weight 600 -> 700, -0.021em -> -1px (clamp 30–36px, about 33.5px at 390; 40px on desktop).
  - h3: weight 600 -> 700, -0.012em -> -0.8px (21px; 26px on desktop).
  - `--tt-btn-weight`: 500 -> 600 (.mk-cta).
  - Eyebrow (600) and body-lg (600) are not headings and were kept.
- Colour tokens:
  - Light: `--tt-c-ink` #1d1d1f -> #0a0a0a, `-2` #6e6e73 -> #5c5c57, `-3` #86868b -> #8a8a85.
  - Dark: `--tt-c-ink-dark` #f5f5f7 -> #ffffff, `-2-dark` #a1a1a6 -> #a3a39e, `-3-dark` #86868b -> #8a8a85.
  - The tokens are used for .ak-kart-metin, .vs-alt, .as-kart-alt, uc-desc and uc-eyebrow (on dark) and for .ho-alt and .mk-metin (on light).
- apple-slayt black block:
  - `.as-kok` #000 kept.
  - `.as-bas` #f5f5f7 -> #ffffff.
  - `.as-etiket` and `.as-alt` #a1a1a6 -> #a3a39e.
  - `.as-kart` #1c1c1e -> #141414.
  - Active dot #f5f5f7 -> #ffffff. Inactive dot rgba(255,255,255,.28) kept.
  - Arrow and dot focus #f5f5f7 -> #ffffff.
  - `.as-bas-vurgu` (grey #8A8A85 second line, from agent B's settings) is not targeted, so it stays #8A8A85.
- `[data-aln-cta]` (apple-local-nav CTA on the dark bar):
  - Blue #0071e3 -> #ffffff background with `color:#0a0a0a`.
  - Hover #0077ed -> #f4f4f4.
  - The gradient and animation are still switched off. The shine is unchanged.
  - The Liquid comments describing it were updated.

## snippets/tt-tekli.liquid (hediye/single page)
- The same type tokens as tt-couple: h1/h2 700 / -1px, h3 700 / -0.8px, button weight 500 -> 600.
- It has no colour tokens.
- Result: agent B's 700 weights and px letter-spacing on .vs-head, .ho-head, .ak-bas, .as-bas, .mk-head, .ay-bas-metin, .ak-kart-bas, .as-kart-bas, .ay-kbas and similar are no longer undone on pages 11/12.

## snippets/tt-aln-mavi.liquid (couple and tekli pages)
- Main CTA and split solid button (`[data-aln-link].is-dolu`): #0071e3 -> #ffffff + `color:#0a0a0a`, hover #0077ed -> #f4f4f4.
- Split outline button (`.is-cizgi`): border and text #2997ff -> #ffffff.
  - Hover: #0071e3 fill with white text -> #ffffff fill and border, text #0a0a0a.
- This now matches agent A's white CTA in apple-local-nav. A Liquid comment explains the change; the old explanatory comment is left as history.

## snippets/tt-couple-banka.liquid (bank strip in the dark "Ödeme kolaylıkları" popup)
- Top border rgba(255,255,255,.12) -> #262624.
- Title #86868b -> #a3a39e.
- Chip border rgba(255,255,255,.16) -> #262624.
- Chip text #f5f5f7 -> #ffffff.
- The logo pill (#fff) was kept.

## snippets/tt-yapilandirma.liquid (strip on collection and product cards)
- `.tt-kol-bilgi .tt-kol-metin` #1d1d1f -> #0a0a0a.
- `.tt-kol-saat` #6e6e73 -> #5c5c57.
- Info-strip border rgba(0,0,0,.07) -> rgba(10,10,10,.07).
- `--color-foreground` fallback `17 17 17` -> `10 10 10` (×2, fallback only).
- The other colours come from theme settings, which are already #0a0a0a / #f4f4f4 in settings_data (Aşama 1). Their non-palette schema defaults in config/settings_schema.json (#edf7f0, #1a7f37, #f5f5f7) are inert because the data values win, so they were not changed.
- The price `.tt-kart-yeni` (700 / -.02em) is not a heading and was kept.

## snippets/icon-guarantee.liquid
- None of the icons had a hard-coded hex. The grey "second tone" comes from theme.css `.icon .fill { fill: rgb(var(--color-foreground)/.1) }`. That rule painted the leaf (organic), shield and droplet icons on the product pages with a light-grey fill, and the help-drawer icons too.
- Decision: the icons are now single-colour thin-stroke line icons. The 56 tint shapes (`class="fill"`) get an inline `style="fill: none"`. The stroke stays `currentColor` (ink on light, white on dark). Geometry is unchanged, and a Liquid comment explains the change.
  - Alternative, if a soft tint is preferred: `style="fill: currentColor; fill-opacity: .1"`.
- No other shared icon snippet has hard-coded non-palette fills. gp-* and tt-sc-nk-* were excluded; tt-couple-akis is already #0a0a0a.

## sections/tt-baslik.liquid (focus only)
- Added a white focus ring (2px solid #ffffff, offset 3px). It is only output when the background is dark (Liquid `color_brightness < 128`):
  - `.tth-menu-<sid> a:focus-visible` for the black drawer (menu_zemin)
  - `.tth-<sid> a:focus-visible, button:focus-visible` for the dark bar (zemin #0a0a0a): menu button, logo, search, cart and CTA
- On a light background the theme's ink ring still applies. Nothing else was changed.

## Neon count
- **sections/tt-cok-satanlar.liquid:**
  - `.tt-cs-rozet` base: lime/ink -> #0a0a0a background + #ffffff text (Kadın, Erkek, custom texts).
  - New modifier `.tt-cs-rozet--set`: #d6ff00 + #0a0a0a.
  - The markup adds the modifier with `{% if kat == 'couple' %}`. This is the same `kat` (block `kategori`) that picks the default badge text ("2'li set"). No text changed.
- **tt-secim-kartlari, Couple mode.** Lime is kept only on `.tt-sc-rozet` ("İkincisi yarı fiyatına") and `.tt-sc-slot-rozet` ("%50"). Other items:
  - `--tt-sc-rozet-zemin` #d6ff00 -> #0a0a0a (assets/tt-secim-kartlari.css). The breakdown chip `.tt-sc-kir[data-sc-indirimli] .tt-sc-kir-etiket` and the savings badge `.tt-sc-tasarruf` text -> #ffffff. The tag icon uses currentColor, so it is white too.
  - `.tt-sc-setkart-rozet` ("2'li set" on the set cards, several per screen; sections/tt-secim-kartlari.liquid): #D6FF00/#0A0A0A -> #0A0A0A/#FFFFFF.
  - nk card and sheet rules were not touched.

## snippets/ttn-cark-svg.liquid
- Fallbacks:
  - Slice fallback `#1F4648` -> `#141414` (×2).
  - Dark label `#0A1A1C` -> `#0A0A0A`.
  - Ring and hub `var(--ttn-halka, #F2F2F2)` -> `#FFFFFF` (×2). The spec asks for a white centre.
- Label contrast threshold `color_brightness > 140` -> `> 120`.
  - With the old threshold, #8A8A85 (brightness about 137) got white text. Now it gets ink.
  - Lime, white and #F4F4F4 slices get ink. #141414 and #0A0A0A get white.
  - The big wheel is also overridden by agent A's `.ttn-cark-carkim` CSS with the same result. The mini wheel draws no labels.
- The doc comment was updated.

## rapor-D "Açık konular"
- Every item with exact values has been applied: tt-couple, tt-aln-mavi, tt-couple-banka and tt-yapilandirma.
- `settings_data color_shadow #a8e8e2` has no exact replacement value and is Aşama-1 / settings JSON, so it was not edited. Suggestion: #000000, or ink, at the same opacity.

## Kept non-palette colours
- Black and white overlay UI in the video lightboxes (tt-couple .tt-vid-*, tt-tekli-gorunum): rgba(0,0,0,.92), rgba(255,255,255,.16).
- Inactive apple-slayt dots rgba(255,255,255,.28) (white transparency).
- No status reds in my files.

## Notes / open
- tt-uk-kart "Kampanya" badge (`.tt-uk-rozet--kampanya`, lime) on collection grids was not in my brief and is unchanged. If several cards with it are visible at once, it may also break the 1–2 neon rule.
- The aln shine streak (white 45%) is still nearly invisible on the white CTA (agent A item 4). It was left unchanged.
- Poppins risk: none new. Only weights and letter-spacing changed. The h2 at 700 / -1px on pages 11/12 is a bit wider than at 600, and `text-wrap: balance` is already set.
