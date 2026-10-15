# Agent A report

All edits are in `dil/tema`, made in place. Nothing was committed, pushed or uploaded.
The section-setting patches are in `dil/yamalar/A.tsv`: 350 lines. Every old_value was checked against the current JSON and all 350 match.
Every schema block was parsed with json.loads and all parse. `{% %}` and `{{ }}` are balanced in every edited section.

## Patch file (A.tsv) summary
- Only (file, key) pairs listed in `kullanilan.json` were patched.
- **tt-baslik** (9 instances):
  - zemin #161617 -> #0a0a0a
  - kenar_rengi and menu_ayirac #2e2e30 -> #262624
  - rozet_zemin #0071e3 -> #d6ff00 and rozet_yazi -> #0a0a0a (small cart counter)
  - The "Ürünü Öğren"/"Satın Al" button: dugme_zemin -> #ffffff, dugme_yazi -> #0a0a0a, dugme_hover #0077ed -> #f4f4f4
  - cizgi_kenar and cizgi_yazi #2997ff -> #ffffff (outline split button on the dark bar)
  - menu_alt_yazi #a1a1a6 -> #a3a39e
  - **zemin_saydam 72 -> 80.** This is a number setting, not a colour; the patch stores it as the number 72 -> 80.
- **apple-local-nav** (every instance has `aktif: false`, so none is visible now; patched anyway):
  - Dark bars:
    - zemin -> #0a0a0a
    - border lines -> #262624
    - CTA gradient colours 1/2/3 all -> #ffffff. This makes the gradient flat white, without touching the `cta_degrade` checkbox.
    - The button is white with #0a0a0a text, hover #f4f4f4.
    - The red couple page and the green hediye page instances get the same white treatment.
    - Cart badge is lime with ink text.
    - The outline button is white.
  - Light bars (product pages, zemin #ffffff):
    - CTA gradient all -> #0a0a0a, button ink with white text, hover #262624
    - Lines -> #d2d2cd
    - Name text -> #0a0a0a
    - Outline button: #d2d2cd border with ink text
- **tt-catal-karsilastirma** (index):
  - c_cta and c_name -> #ffffff
  - c_btn_text -> #0a0a0a
  - c_text -> #ffffff
  - c_muted -> #a3a39e
  - c_surface -> #141414
  - c_line -> #262624
  - c_pill_bg -> #262624
  - c_bg and c_media stay #000000
- **tt-cok-satanlar** (index):
  - zemin -> #f4f4f4
  - koyu, fiyat, kod, vurgu and rozet_zemin -> #0a0a0a
  - gri, etiket and eski -> #5c5c57
  - kenar and ayrac -> #d2d2cd
  - Wheel settings: see the wheel item below.
- **tt-secim-kartlari** (4 collection templates):
  - koyu, yesil, halka_yesil and all `setler_*` text and rozet colours -> #0a0a0a
  - kenar, setler_ayrac and setler_ind_kenar -> #d2d2cd
  - gri and setler_etiket/eski -> #5c5c57
  - gri_koyu -> #a3a39e
  - ayrac_koyu -> #262624
  - yesil_acik -> #ffffff (ring, band icon and focus ring on dark)
  - yesil_zemin -> #f4f4f4
  - uyari is kept.
- **Wheel** (tt-secim-kartlari ×4 and tt-cok-satanlar):
  - cark_kart_zemin #d3ddd2 -> #0a0a0a
  - cark_vurgu #78f5ab -> #d6ff00
  - cark_koyu -> #0a0a0a
  - cark_alt_yazi #3c4e40 -> #a3a39e
  - cark_halka #f2f2f2 -> #ffffff
  - cark_dilim_renkleri -> `#D6FF00,#FFFFFF,#8A8A85,#141414` repeated twice
- **tt-nasil-calisir**:
  - dugme_zemin #16181D -> #0A0A0A
  - dugme_cerceve #9FC4B0 -> #D6FF00
  - panel_zemin -> #F4F4F4
  - ortu -> #0A0A0A
  - tutamac and kart_kenar -> #D2D2CD
  - etiket_zemin #E3EEE7 -> #D6FF00 (small badge) with etiket_renk -> #0A0A0A
  - baslik_renk -> #0A0A0A
  - alt_renk -> #5C5C57
  - kapat_zemin -> #FFFFFF (it sits on the #F4F4F4 panel)
  - Icon box and arrow backgrounds -> #F4F4F4
  - Icon colour and both couple rings -> #0A0A0A (single-colour icon)
- **ttn-cark-genel**: bar_zemin #0A1A1C -> #0A0A0A, bar_vurgu #78F5AB -> #D6FF00 (lime counter digits on dark).
- **`tt_nc_fark` (catal inside tt-nasil-calisir-grup.json)** has no colour values in its JSON, so it uses the schema and liquid defaults. Those defaults were changed; see below.

## Per file

### sections/tt-baslik.liquid
- Schema defaults only:
  - zemin #161617 -> #0a0a0a; zemin_saydam default 72 -> 80
  - kenar #2e2e30 -> #262624
  - Cart badge #0071e3/#fff -> #d6ff00/#0a0a0a
  - Button #0071e3/#fff -> #ffffff/#0a0a0a, hover #0077ed -> #f4f4f4
  - Outline button #2997ff -> #ffffff
  - menu_alt_yazi -> #a3a39e
  - menu_ayirac -> #262624
- The CSS already had radius 999px, weight 600 and `font-family: inherit`.
- The blur is kept.

### sections/apple-local-nav.liquid
- Schema defaults:
  - zemin #161617 -> #0a0a0a
  - kenar and menu_ayirac -> #262624
  - Gradient colours 1/2/3 (green) -> #ffffff
  - Button #30614b/#fff -> #ffffff/#0a0a0a, hover #3b7359 -> #f4f4f4
  - Outline button #599176/#8fcbb0 -> #ffffff
  - rozet_yazi #000000 -> #0a0a0a (rozet_zemin was already #d6ff00)

### sections/tt-nasil-calisir.liquid and assets/tt-nasil-calisir.css
- Section:
  - Liquid fallback for the overlay #0A0C0E / rgba(10,12,14,.55) -> #0A0A0A / rgba(10,10,10,.55)
  - All schema defaults mapped the same way as the patch.
- CSS:
  - Fallback variables mapped to the same values.
  - Floating button: ink background, white text, 2px lime border. Its icon circle is lime with an ink icon. Text weight 500 -> 600.
  - Floating button focus ring: lime -> ink.
  - Panel title `.tt-nc-baslik`: Poppins heading variable, weight 500 -> 700, letter-spacing -.01em -> -0.8px (21px).
  - Close icon #4A4F4B -> #0A0A0A.
  - Card hover border: lime -> ink, because a frame on a light surface must be ink.
  - Comparison overlay background rgba(10,12,14,.92) -> rgba(10,10,10,.92).
  - `.tt-nc-fark-devam` button:
    - fallback colours #0071e3/#fff -> #fff/#0A0A0A, so it follows the catal CTA as before
    - radius 12px -> 999px, weight 500 -> 600

### sections/tt-catal-karsilastirma.liquid
- Liquid `default:` fallbacks and schema defaults mapped the same way as the patch values.
- Title:
  - `font-family: var(--font-heading-family)`
  - letter-spacing -0.01em -> -0.8px (24px on phone)
  - -1px from 768px up, where it is 28px and then 32px
- Single/Couple buttons:
  - white background with ink text, through c_cta/c_btn_text
  - radius 10px -> 999px, weight 500 -> 600
- The highlighted answer row also uses c_cta, so it is now white text on dark (it was blue).
- One comment that mentioned "#0071e3" was updated.

### sections/ttn-cark-genel.liquid
- Bar defaults: #0A1A1C -> #0A0A0A and #78F5AB -> #D6FF00. Nothing else in this file has colour.

### assets/ttn-cark.css (wheel card snippet ttn-cark-kart; the snippet itself has no colours)
- Fallback variables:
  - card #0a0a0a
  - accent #d6ff00
  - koyu #0a0a0a
  - sub text #a3a39e
  - ring and hub #ffffff
- **New variable `--ttn-yazi: #ffffff`** for card text and focus rings. Before, the card text used `--ttn-koyu`, which is now ink and would have been ink on an ink card.
- "Çevir" button: lime with ink text, weight 500 -> 600.
- Pointer #5cc98f -> #d6ff00.
- Hub "ttn" text #0a1a1c -> #0a0a0a.
- Coupon icon circle: koyu -> #141414 (lime icon), so it is visible on the ink card.
- Bar fallbacks -> #0a0a0a / #d6ff00.
- **Big (opened) wheel**: new CSS rules under `.ttn-cark-carkim` change the slices.
  - The mini icon keeps #D6FF00 / #FFFFFF / #8A8A85 / #141414.
  - The big wheel shows #D6FF00 / #F4F4F4 / #8A8A85 / #0A0A0A, as the spec asks for.
  - Slice labels: ink on lime, #F4F4F4 and #8A8A85; white on #0A0A0A. The snippet's brightness rule would have put white on #8A8A85, which reads badly.
  - The winning slice stays the accent colour with ink text. Specificity was checked so the winner still overrides the new rules.
- The old contrast comment block was rewritten.

### assets/ttn-cark.js
- Only the confetti colour literal changed: `['#78F5AB','#1F4648','#5CC98F','#D3DDD2']` -> `['#D6FF00','#FFFFFF','#8A8A85','#F4F4F4']`. Logic is untouched.
- Wheel slice colours do not live in the JS. They come from section settings, through `snippets/ttn-cark-svg.liquid`.

### sections/tt-secim-kartlari.liquid
- Main heading:
  - `font-family: var(--font-heading-family)`
  - letter-spacing -0.02em -> -1px when the size is 28px or more, -0.8px from 20px, otherwise -0.3px. This is a Liquid condition on bas_boyut_m, which is currently 28.
- "Kampanyalı Couple Setler" and "Kendi setini oluşturmak ister misin?" (18px): heading family, weight 600 -> 700, letter-spacing -0.3px.
- "2'li set" badge (`.tt-sc-setkart-rozet`): setting colour with white text -> #D6FF00 with #0A0A0A text.
- "Tükendi" overlay rgba(21,23,28,.86) -> rgba(10,10,10,.86).
- Schema defaults mapped the same way as the patch, including the wheel settings.

### assets/tt-secim-kartlari.css (rules before the "NASIL CALISIR?" KARTI header only)
- The nk card and np sheet rules were not touched; the diff confirms no change from that block on. `tt-sc-nk-kart.liquid` and `tt-sc-nk-pencere.liquid` are untouched.
- Variables:
  - koyu #15171c -> #0a0a0a
  - kenar #e1e4e8 -> #d2d2cd
  - gri #6b6f78 -> #5c5c57
  - gri-koyu -> #a3a39e
  - cizgi #eceef1 -> #d2d2cd
  - ayrac-koyu -> #262624
  - yesil and halka-yesil -> #0a0a0a
  - yesil-acik -> #ffffff
  - yesil-zemin -> #f4f4f4
  - rozet-zemin #e3f1ea -> #d6ff00 (the "%50" chip and savings badge, ink text through yesil)
  - kutu-zemin -> #f4f4f4 with kutu-yazi #0a0a0a
  - kutu-zemin-koyu #1f2c26 -> #141414 with kutu-yazi-koyu -> #ffffff
- "İkincisi yarı fiyatına" badge and the "%50" slot badge: green with white text -> #d6ff00 with #0a0a0a text.
- Progress bar empty #e5e8ec -> #d2d2cd; filled is ink.
- Empty-slot dashed border #c9ced5 -> #d2d2cd. The discount slot has an ink dashed line, ink text and a #f4f4f4 background.
- Breakdown chip without discount #eceef1/#686c75 -> #f4f4f4/#5c5c57.
- Struck-through price #73767e -> #5c5c57 (2 places).
- "Sepete ekle (0/2)" bar button: ink, white text, radius 999, weight 500 -> 600.
- Headings set to `var(--font-heading-family)`, weight 700:

  | Element | Size | Weight | Letter-spacing |
  |---|---|---|---|
  | `.tt-sc-baslik` | 21px fallback | 500 -> 700 | -0.8px |
  | Card titles `.tt-sc-ad` ("Single"/"Couple") | 20px | 500 -> 700 | -0.8px |
  | Variant popup title | 17px | 500 -> 700 | -0.3px |
  | `.tt-sc-nasil-baslik` | 20px | 500 -> 700 | -0.8px |

- "Nasıl çalışır?" opener in the cards (`.tt-sc-nasil-ac`; it is not an nk selector, and `nasil_goster` is currently off):
  - border #c3c8ce -> #d2d2cd
  - icon background and text #11161c -> #0a0a0a
  - On the selected card: #262d35 -> #141414 background with a #262624 border; the mint icon background #9fd4bd -> #ffffff with ink icon
- tt-sc-nasil dialog:
  - handle #d8dce1 -> #d2d2cd
  - close button and image backgrounds #f6f7f9 -> #f4f4f4
  - step numbers #11161c -> #0a0a0a
  - confirm button weight 500 -> 600
- Selected and unselected cards and chips already followed the spec once the variables changed (ink with white text / white with #d2d2cd border).

### sections/tt-cok-satanlar.liquid
- Editor placeholder text #6e6e73 -> #5c5c57.
- Heading: heading font family; letter-spacing by size (24px -> -0.8px; desktop 30px -> -1px).
- Image background #f1f2f5 -> #f4f4f4.
- Category badge `.tt-cs-rozet` ("2'li set", "Kadın" and so on): setting colour with white text -> #d6ff00 with #0a0a0a text.
- Scroll arrows: white with ink icon -> ink background, ink border, white icon.
- "Tümü" chip, ranking badge text, link line and dots become ink through the `rozet_zemin` and `vurgu` settings. The ranking badge is white with a #d2d2cd border.
- Schema defaults mapped the same way as the patch.

### assets/tt-uk-kart.css
- Variables:
  - koyu -> #0a0a0a
  - gri and soluk -> #5c5c57 (#8b8e95 was below the minimum for small text)
  - yesil -> #0a0a0a: the added/selected button is ink with white, and the selected card frame is ink
  - image background #f1f2f5 -> #f4f4f4
  - inactive dot #b9bec5 -> #d2d2cd
- "Kampanya" badge: green with white text -> #d6ff00 with #0a0a0a text.

### Snippets
- `tt-sc-ikon`, `tt-sc-karo`, `tt-sc-nasil`, `ttn-cark-kart`, `tt-uk-kart`, `tt-nc-ikon` and `tt-para` contain no colour or font literals, so none were edited.
- `ttn-cark-svg.liquid` is not on my list. It has fallbacks `#1F4648`, `#F2F2F2` and the label colour `#0A1A1C`. I did not edit it; the wheel CSS overrides the label colours, and the fallbacks only apply when a setting is empty.

### JS
- `tt-secim-kartlari.js`, `tt-uk-kart.js` and `tt-cs-carousel.js` contain no colour literals, so they were not edited.

## Non-palette colours deliberately kept
- `--tt-sc-uyari` / setting `uyari` **#b42318** in assets/tt-secim-kartlari.css (`.tt-sc .tt-sc-cubuk-uyari`). It is a status red: a cart bar warning or error. It is not patched and its schema default is kept.
- tt-cok-satanlar `.tt-cs-uyari`: #c2410c border, #fff7ed background, #9a3412 text. This warning only shows in the theme editor (`request.design_mode`) and is never seen by shoppers.
- Overlay and shadow colours based on black (rgb(0 0 0 / .06–.45), drop-shadow) and white shine streaks (rgba(255,255,255,.45)) are kept.
- Old contrast comments in tt-secim-kartlari.css (around lines 582–590, 710 and 882) still mention old hex values. They are comments only.

## Ambiguous decisions / open issues
1. **Wheel slices.** The spec gives different sets for the "wheel icon" and the "ttn-cark-genel popup". ttn-cark-genel itself draws no wheel; it only holds the config and the bottom bar. The real "popup" is the wheel that opens inside the same card.
   - Both wheels are drawn from one setting, so the setting holds the icon set.
   - The opened wheel is recoloured to the popup set with CSS (`.ttn-cark-carkim` nth-child rules).
   - Drawback: the CSS assumes the repeating 4-colour order. If someone edits `cark_dilim_renkleri` later, the big wheel only partly follows the setting.
   - `ttn-spin-wheel.liquid` is not mine and not on the used list, but it shares ttn-cark.css. It now gets white card text and focus rings, and its old green card colours would look wrong if it were ever enabled.
2. **Neon count.** In tt-cok-satanlar every card's category badge is now lime, because the markup can't tell "2'li set" apart from "Kadın" without a markup change. Together with the lime "Çevir" button and lime wheel slices, more than 2 lime elements can be on screen. In tt-secim-kartlari Couple mode, these can also appear together: the "İkincisi yarı fiyatına" badge, "2'li set" badges, the "%50" slot badge, the breakdown chip and savings badge, plus the wheel. If that is too much, set `.tt-cs-rozet` back to ink with white text and keep lime only for the slot "%50".
3. **Cart counter badges** in tt-baslik and apple-local-nav: lime with ink text (blue before). Lime is allowed for counters, but white with ink text is an alternative if the bar already has a lime element.
4. **Shine animation** on the tt-baslik and apple-local-nav CTA: a white 45% streak is now almost invisible on the white button. I kept it unchanged so behaviour does not change; it could be set to rgba(10,10,10,.08).
5. **tt-nasil-calisir small badge** (lock label in the panel): set to lime with ink text, the spec's badge rule. White would be the quieter alternative.
6. **Catal pill background**: #2D2D2F is on the "cards on dark -> #141414" list, but the pill sits on a #141414 card and would vanish. I used #262624 (line-dark) instead.
7. **apple-local-nav**: every instance is currently `aktif: false`, so these patches have no visible effect now. Its bar opacity (72/84) was left as it is. The 80% rule was only applied to tt-baslik.
8. **Light-bar CTA** (product pages, "Ürünü Öğren"): made ink with white text rather than secondary. The CTA has border:0 and a forced transparent border in gradient mode, so a white secondary button would vanish on a white bar.
9. **Card titles** ("Single"/"Couple" 20px, panel and dialog titles) were treated as headings (700 plus letter-spacing). These were kept at their existing weight: small card titles ≤15px (`.tt-nc-kart-bas`, `.tt-sc-set-baslik`), the wheel card title (14px/500) and the coupon title (15px/600). Menu links in tt-baslik keep their current weight and -0.02em ("mobile menu: colour and font only").

## Possible Poppins overflow risks (Poppins is wider than Inter; no sizes were changed)
- `.tt-sc-rozet` "İkincisi yarı fiyatına" (11px, nowrap, max-width card-16px) could get clipped on 320–360px phones.
- `.tt-sc-ad` "Single"/"Couple" at 20px/700, with 22px of right padding for the radio.
- "Kendi setini oluşturmak ister misin?" at 18px/700 will probably wrap to 2 lines at 390px.
- `.tt-cs-ust` label "COUPLE ZAMAN KAPSÜLÜ": its clamp size was measured for Inter at 0.04em spacing. With Poppins it may be cut off with an ellipsis on the narrowest cards (360px).
- Prices in the set and cok-satanlar cards ("2.898 TL 3.399 TL") wrap sooner. The container query spacing already allows for wrapping.
- tt-nasil-calisir floating button "Nasıl çalışır?" (nowrap, now 600) gets a little wider.
- Catal title at 24px/700 with `text-wrap: balance` is fine. Pills are nowrap (11px).
- tt-baslik and apple-local-nav CTA "Ürünü Öğren" (nowrap, 14px/600): the bar width is fixed, so check that it does not crowd the logo on 320px.
