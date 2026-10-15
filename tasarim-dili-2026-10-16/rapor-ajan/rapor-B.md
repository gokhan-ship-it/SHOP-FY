# Agent B report: brand-language conversion

Scope: 11 sections (all edited in `dil/tema/sections/`), patch file `dil/yamalar/B.tsv` (440 lines).
Helper scripts (not deliverables): `dil/b_kurallar.py` (patch rules), `dil/b_uret.py` (writes B.tsv and checks every old_value against the JSON).
No snippet or asset was edited. The only asset my sections reference, `assets/tt-ck-sahne.js`, has no color literals. The layout-level snippets that override my sections are covered under "Open issue" below.

Validation: every `{% schema %}` parses with `json.loads`. No used instance falls back to a schema default for a color, because the JSON holds every color setting, so schema-default changes only affect newly added sections. Each B.tsv old_value was checked against the JSON (exact string, case kept as stored). After stripping comments, no non-palette hex is left in any of the 11 files. The remaining rgba values are black or white shadows, backdrops, image scrims and shine strips, or `rgba(10,10,10,a)` / `rgba(20,20,20,.62)`.

## Per file

### tt-veri (no JSON colors; hard-coded)
- Root font `-apple-system, BlinkMacSystemFont, "SF Pro Text"...` -> `var(--font-body-family)`. Heading `.tt-veri-baslik` -> `var(--font-heading-family)`, 600 -> 700, letter-spacing -0.02em -> -1px (30px).
- Top label "Neden unutulmuyor?" #86868b -> #8A8A85 (small label on dark). Heading #f5f5f7 -> #FFFFFF. Subtitle #86868b -> #A3A39E.
- Row labels ("1. GÜN") #6e6e73 -> #8A8A85. Numbers #f5f5f7 -> #FFFFFF. Sentences #a1a1a6 -> #A3A39E. Footnote #6e6e73 -> #8A8A85.
- Dividers rgba(255,255,255,.14) -> #262624.

### hediye-omru (all 5 instances use `palet: apple`, so the Liquid apple palette is what renders)
- Apple palette assigns: bg #f5f5f7 -> #F4F4F4. Rows stay #FFFFFF. Row border and track #d2d2d7 -> #D2D2CD. Image bg -> #F4F4F4.
- Text #1d1d1f -> #0A0A0A. Secondary, axis, hint and status #6e6e73 -> #5C5C57. Knob and bars #1d1d1f -> #0A0A0A. Empty bar #d2d2d7 -> #D2D2CD. Accent #0071e3 -> #0A0A0A.
- Expired red (#d70015): the bar and the status text used one variable, so I added `p_bitti_yazi`. Bar -> #0A0A0A, red status text -> #5C5C57. Only CSS references changed; JS untouched.
- Unused palettes (apple_gri, apple_siyah) were remapped to the dark tokens (#141414, #262624, #FFFFFF, #A3A39E). Their red/blue accents -> white.
- Heading `.ho-head`: added heading font and letter-spacing -0.8px (24px). Weight comes from the setting (700).
- Patches: `vurgu_rengi` -> #0A0A0A (blue on the hediye and couple pages; green #4ade80 elsewhere, where it is inert). On the couple page `vurgu_degrade` is on, so `vurgu_d1/d2/d3` red -> #0A0A0A, which makes the "Kilitlendi" bar flat ink. `vurgu_yazi` #ff453a -> #5C5C57 (red status text "Kilitlendi").
- Inert dark-scheme custom values (they only apply when palet=ozel) were mapped to palette tokens; noted in the TSV. Schema defaults (ozel dark scheme) were mapped the same way.

### avantaj-kartlari (all instances `palet: apple_koyu`)
- apple_koyu assigns: card #1d1d1f -> #141414. Titles #f5f5f7 -> #FFFFFF. Text #86868b -> #A3A39E.
- "+" and arrow buttons: rgba(255,255,255,.82) -> #FFFFFF, icon #1d1d1f -> #0A0A0A. Link and focus #8fcbb0 -> #FFFFFF. Card border rgba(.10) -> #262624.
- apple_acik palette remapped to the light tokens.
- Fonts: `.ak-bas` heading font, -0.8px (24). `.ak-kart-bas` heading font, 600 -> 700, -0.3px (19px). `.ak-pop-bas` heading font, -1px (28).
- Patches: block `ikon_renk` (#2cd784, #d3fb04, #bf5af2, #ff9f0a) -> #FFFFFF (single-color white icons). `pop_metin_rengi` #d7d7d7 -> #A3A39E. Inert custom values mapped. Schema defaults mapped. `bag_rengi` default #d6ff00 -> #FFFFFF, because lime is not used as link text.

### tt-couple-kapsul (dark section with a light stage)
- Heading accent `.tt-ck-vurgu` ("buluştuğunuzda"): `var(--ck-vurgu)` (green) -> hard-coded #8A8A85. The accent setting now drives only the active step chip.
- Heading: heading font, letter-spacing -1px (28px).
- Stage: gradient `linear-gradient(sahne1, sahne2)` -> flat `var(--ck-sahne1)`.
- Text: counter number #15181C -> #0A0A0A. Counter label, pill text and pill icon #6C757E / #30373E -> #5C5C57. Year and date labels #79828C / #5D666F -> #5C5C57.
- Icons: #39434E, #46515C, #2B3138 -> #0A0A0A.
- Lines: dashed placeholder #A9B2BC -> #D2D2CD. Timeline line green gradient -> flat #D2D2CD. Ticks #A8B1BA -> #D2D2CD.
- Shadows: rgba(20,28,36,a) / rgba(24,32,40,a) -> rgba(10,10,10,a).
- Patches:

  | setting | old | new | note |
  |---|---|---|---|
  | arkaplan | #181b1e | #000000 | section background |
  | hap_zemin | – | #141414 | pill background |
  | hap_kenar | – | #262624 | pill border |
  | hap_renk | – | #FFFFFF | pill text |
  | vurgu_renk | #9fd4bd | #D6FF00 | active step chip, ink text via adim_aktif_renk #0A0A0A |
  | alt_renk, kanit_renk | – | #A3A39E | |
  | yildiz_renk | – | #FFFFFF | stars |
  | sahne_renk_1 / _2 | – | #F4F4F4 | |
  | sayac_daire | #3e5e4a | #0A0A0A | counter circle, timeline dots, lock badge, delta text |
  | adim_renk | – | #8A8A85 | passive steps |

  Schema defaults were changed to match.

### hero-video-kapsul (collections: dark "yeni" layout; index: light "klasik" layout)
- `.hv-title`: heading font, letter-spacing -1px (28px). The yeni override -0.02em -> -1px.
- `.hv-vurgu` (heading accent, e.g. "sadece size ait"): `ticker_vurgu_rengi` (green) -> hard-coded #8A8A85.
- Ticker: strike line #8B939D -> #A3A39E. Green glow text-shadow -> white glow rgba(255,255,255,.4). "eskime" fade-to colour #3A4048 -> #5C5C57.
- Patches, dark instances:

  | setting | new |
  |---|---|
  | arkaplan #181B1E | #000000 |
  | ticker_zemin | #141414 |
  | ticker_kenarlik | #262624 |
  | ticker_rengi | #FFFFFF |
  | ticker_vurgu_rengi | #FFFFFF |
  | log_rengi, kanit_rengi | #A3A39E |
  | kanit_yildiz_rengi | #FFFFFF |
  | yildiz_rengi | #FFFFFF |
  | metin_rengi | #A3A39E |
  | video_arkaplan | #141414 |
  | video_kenarlik_rengi | #262624 |

- Patches, index (light): arkaplan #F5F5F7 -> #F4F4F4. Heading and stat text -> #0A0A0A. Text -> #5C5C57. Stars #f5a623 -> #0A0A0A. Video bg -> #0A0A0A. Schema defaults mapped to the dark scheme.

### video-slider-kapsul (dark)
- `.vs-head`: heading font, -0.8px (24). `.vs-card-title`: heading font, -0.3px (17px).
- Patches:

  | setting | old | new |
  |---|---|---|
  | alt_renk | – | #A3A39E |
  | cizgi_pasif | #3a3a3a | #262624 |
  | cta_yazi_rengi | #101010 | #0A0A0A |
  | oynat_renk | – | #0A0A0A |
  | d_metin_renk | #d5d5d5 | #A3A39E |
  | d_pasif_renk | #7b7b7b | #8A8A85 |
  | kart_arkaplan | #161616 | #141414 |
  | kart_kenarlik | #2a2a2a | #262624 |
  | metin_rengi | #c9c9c9 | #A3A39E |
  | nokta_renk | #4a4a4a | #5C5C57 |
  | sahne_arkaplan | #101010 | #141414 |

  The CTA is already white with ink text and a 999px radius (cta_yuvarlak=true). Its weight stays the JSON setting (700), because the 600 rule is for primary buttons.

### adim-yigin (both instances `palet: apple`, black panels)
- Apple assigns: heading #f5f5f7 -> #FFFFFF. Subtitle #86868b -> #A3A39E. Label #8fcbb0 -> #8A8A85. Card text #f5f5f7 -> #FFFFFF, card description #86868b -> #A3A39E. Badge text #000 -> #0A0A0A (badge stays lime).
- Fonts: `.ay-bas` heading font. `.ay-bas-metin` ("Couple Kapsülü" / "Single Zaman Kapsülü", 20px): setting weight 500 -> hard-coded 700, -0.8px. `.ay-vurgu` -1px (28). `.ay-kbas` heading font, -0.8px (24).
- Patches: `vurgu_1/2/3` and `vurgu_duz_renk` (red on couple, green on hediye) -> #8A8A85, so "Dört Adımda Öğrenin." is flat grey (the gradient has three identical stops). `num_d1/2/3` -> #D6FF00 and `num_degrade_yazi` -> #0A0A0A, so the "Adım N" badges are lime with ink text. Inert light custom values mapped.

### apple-slayt (couple page)
- `.as-bas`: heading font, setting weight 600 -> 700, -0.015em -> -1px (30px). `.as-kart-bas`: heading font, 600 -> 700, -0.8px (21px).
- Patches: `vurgu_1/2/3`, `vurgu_duz` (red) -> #8A8A85 for "en güzel alışkanlığı". zemin -> #F4F4F4. bas_renk, ok_renk and nokta_aktif -> #0A0A0A. alt_renk -> #5C5C57. kart_zemin #e8e8ed -> #FFFFFF. kart_alt_renk #e8e8ed -> #A3A39E (over the black scrim). nokta_pasif #c7c7cc -> #D2D2CD.
- The couple page actually renders this section black because of `snippets/tt-couple.liquid` (see Open issue).

### guclu-header (both instances `palet: ozel`, so JSON settings render)
- `.gh-bas`: heading font, -0.01em -> -0.8px (min(33px, 6vw) ≈ 23.4px at 390px). The unused Archivo branch font-family -> `var(--font-heading-family)`. Its Google Fonts `<link>` is left as is; it only loads when `baslik_font=archivo`, which is not set.
- Buttons: `.gh-dugme` ("Satın Al") 500 -> 600. `.gh-cam` ("Ürünü Öğren") 500 -> 600.
- apple_koyu and apple_acik palettes remapped. The koyu primary is a white button with ink text.
- Patches:
  - "Satın Al" primary: dugme_zemin #000 -> #0A0A0A.
  - "Ürünü Öğren" secondary: cam_kenar #d2d2d7 -> #D2D2CD, cam_yazi -> #0A0A0A, white background kept, pulse ring -> #0A0A0A.
  - Label #86868b -> #5C5C57 (14px on light, so not #8A8A85).
  - Heading -> #0A0A0A. alt and bilgi -> #5C5C57. Stars, rating and laurel -> #0A0A0A. Secondary text -> #0A0A0A, secondary border -> #D2D2CD.
  - `vurgu_1/2/3` and `vurgu_duz_renk` -> #8A8A85. This is the two-line rule for "Sadece buluştuğunuzda açılır." and "Açılacağı Günü Sen Belirle.".

### couple-bulusma
- `.cb-bas-vurgu` ("5 saniyede deneyimle."): the gradient background-clip was removed and replaced with flat `color: #8A8A85`. The text-fill is set too.
- `.cb-bas-yazi`: heading font, letter-spacing normal -> -1px (28px).
- 6 monospace stacks (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; timestamps, status line, hint, date, badge, result line) -> `var(--font-body-family)` (single-family rule).
- Patches: `vurgu_1/2/3` (red gradient) -> #0A0A0A. That gradient now only feeds the "next meeting" button background (primary ink, white text), the hint text, the slider ring and the meet glow, all now flat ink. "Baştan oynat" becomes ink outline and ink text.
- More patches: aksan and kalp #b21e3a -> #0A0A0A. Pendant ring -> #0A0A0A. zemin -> #F4F4F4. kenar -> #D2D2CD. metin -> #0A0A0A. ikincil, alt and sonuc_alt (#424245) -> #5C5C57. kilit_renk #f5f5f7 -> #F4F4F4.
- Schema defaults (dark scheme) mapped. The default button is white with ink text.

### mozaik-kartlar
- `.mk-head`: heading font, -0.8px (24). `.mk-pop-baslik`: heading font, -0.3px (24 × 0.8 = 19.2px). `.mk-ust` and `.mk-secim-baslik` (14.4px): heading font only.
- `.mk-cta` ("HEMEN İNCELE"): weight setting (700) -> 600.
- Patches: CTA bg #111111 -> #0A0A0A, white text. CTA hover bg and hover gradient (green, burgundy, lime #c2e800) -> #0A0A0A, hover text #FFFFFF.
- Review cards #f1f2f6 -> #F4F4F4. Media placeholder #e9e9ec -> #F4F4F4. Text #111111 -> #0A0A0A. #3d3d3d, #6b6b6b and #5f5f5f -> #5C5C57.
- Verified tick #1d9bf0 -> #0A0A0A. Close button bg #f0f0f2 -> #F4F4F4.
- Popup choice cards (purple #efeaff / #4c1d95 / #6f60a8): bg #F4F4F4, title and icon #0A0A0A, secondary #5C5C57. The schema presets and defaults were changed the same way.

## Non-palette colors kept
- Status reds: none kept. Every red was decorative or a heading accent, except hediye-omru "Kilitlendi" and expired text, which went to #5C5C57 as the special rule says.
- Black/white transparency only: image scrims (mozaik `.mk-scrim`, apple-slayt `perde_renk` #000 gradient, guclu-header `perde` white fade, adim-yigin edge fade to panel colour), modal backdrops (rgba(0,0,0,.62/.72)), drop shadows, and white shine strips on the couple-bulusma button and the tt-couple-kapsul light burst.

## Ambiguous decisions
1. **hediye-omru "Kilitlendi" text.** On the index and product pages the kapsul status text uses the accent, which was blue/green and becomes ink #0A0A0A at weight 600. On the couple page it uses `vurgu_yazi` (red), which becomes #5C5C57 per "red status text -> #5C5C57". The two pages differ slightly. If you want them identical, set `vurgu_yazi` to #0A0A0A instead.
2. **tt-couple-kapsul heading.** Only the accent word "buluştuğunuzda" turns grey; "açılır." stays white. Making the whole second line grey would need a markup change, so I didn't.
3. **adim-yigin first line.** The 20px "Couple Kapsülü" line was weight 500 from a setting and is now 700 (heading rule).
4. **hediye-omru unused palettes.** The apple_gri and apple_siyah palettes and the ozel schema defaults were mapped too, so switching palettes later stays on-brand.
5. **Background mapping.** guclu-header and mozaik section backgrounds are #FFFFFF; I kept them white ("already correct"). hediye-omru, couple-bulusma and apple-slayt go to #F4F4F4.
6. **Inactive dot.** video-slider inactive dot #4a4a4a -> #5C5C57. It is the nearest palette grey; #262624 would be almost invisible on black.

## Open issue (not my files; not edited)
`snippets/tt-couple.liquid` (couple page) and `snippets/tt-tekli.liquid` (single/hediye page) are rendered from `layout/theme.liquid`. They use `#MainContent.tt-*-page` (specificity 1,2,0) and **override my sections' typography and some colors**:

- **Heading and button tokens.** Both snippets set `--tt-f-h2-w: 600; --tt-f-h2-ls: -0.021em; --tt-f-h3-w: 600; --tt-f-h3-ls: -0.012em; --tt-btn-weight: 500`. These apply to `.vs-head`, `.ho-head`, `.ak-bas`, `.as-bas`, `.mk-head`, `.ay-bas-metin`, `.vs-card-title`, `.ak-kart-bas`, `.as-kart-bas` and `.ay-kbas`. On pages 11/12 my 700 weight and -1px / -0.8px spacing are overridden.
  - Suggested: h2 weight 700, ls -1px (clamp ≈ 33.5px at 390). h3 weight 700, ls -0.8px (21px). Button weight 600.
- **Color tokens (tt-couple).** `--tt-c-ink #1d1d1f, ink-2 #6e6e73, ink-3 #86868b, ink-dark #f5f5f7, ink-2-dark #a1a1a6, ink-3-dark #86868b`.
  - These colour `.ak-kart-metin`, `.vs-alt` and `.as-kart-alt` (#a1a1a6) and `.ho-alt` and `.mk-metin` (#6e6e73).
  - Suggested: #0A0A0A / #5C5C57 / #8A8A85 / #FFFFFF / #A3A39E / #8A8A85.
- **apple-slayt on the couple page.** tt-couple.liquid lines ~870-898 force `.as-kok` #000, `.as-bas` #f5f5f7, `.as-etiket`/`.as-alt` #a1a1a6, `.as-kart` #1c1c1e, inactive dots rgba(255,255,255,.28), active dot and focus #f5f5f7.
  - Suggested: #000000 / #FFFFFF / #A3A39E / #141414 / rgba(255,255,255,.28) / #FFFFFF. My JSON patches for apple-slayt describe the light, non-override state.
- **Blue CTA.** `[data-aln-cta]` sets #0071e3 and hover #0077ed (apple-local-nav, not mine; hidden on that page). It should become #0A0A0A.
- **Bank strip.** `snippets/tt-couple-banka.liquid` `.tt-banka-*` uses #86868b and #f5f5f7, and rgba(255,255,255,.12/.16) borders. Suggested: #A3A39E / #FFFFFF / #262624.

Whoever owns those layout snippets should apply these changes, or tell me and I'll do it.

## Possible Poppins overflow risks
- **guclu-header.** The heading is `white-space: nowrap` with JS fit-scaling. "Sadece buluştuğunuzda açılır." (1.1em) is long, so Poppins (wider than Inter) will scale down more. Font-size is not changed by me.
- **tt-couple-kapsul step row.** "Yükleyin · Buluşun · Biriktirin · Tekrarlayın" is designed to stay on one line at 360px (`clamp(10px, 2.7vw, 12px)`, nowrap chips, flex-wrap). In Poppins it may wrap to two lines on narrow phones. The pill "Couple Zaman Kapsülü" is also nowrap.
- **hero-video-kapsul ticker.** The pill is nowrap; the longest phrase sets its width, so the pill may get wider.
- **hediye-omru axis labels.** "1. Gün" and "6. Ay" are absolutely positioned and nowrap, and already sit close together, so they may touch.
- **couple-bulusma.** The monospace -> Poppins swap narrows the text, so there is no overflow risk there. The bildirim timestamp and status line keep the same font size.
- **mozaik and video-slider CTAs.** Letter-spacing is 1px plus Poppins, so buttons get slightly wider (the mozaik CTA is sticky).
- **apple-slayt heading.** 30px, 2 lines with balance; probably fine.
