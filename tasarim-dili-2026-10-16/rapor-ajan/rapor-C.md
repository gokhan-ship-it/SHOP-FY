# Agent C report: _blocks theme blocks and product-page sections

Scope: 12 theme blocks (`blocks/ai_gen_block_*.liquid`) and 10 sections. `sections/_blocks.liquid` does not exist. No snippet or asset is referenced only by my files (`alert`, `button`, `heading-content`, `highlighted-text`, `icon`, `icon-guarantee`, `section-heading` and `section-variables` are shared, so I left them alone). `assets/taksit-tablosu.js` has no color literals and is unchanged. `sections/empty-space.liquid` and `sections/faq.liquid` have no hard-coded colors (faq only has the `color_overlay` default #ffffff, which is already in the palette), so neither file changed.

## How heading letter-spacing is applied
Most heading sizes come from settings, so I used inline Liquid that chooses the value from the **phone** size setting:
`{%- assign tt_ls = <mobile size> -%}{%- if tt_ls >= 28 -%}-1px{%- elsif tt_ls >= 20 -%}-0.8px{%- elsif tt_ls >= 16 -%}-0.3px{%- else -%}normal{%- endif -%}`.
That one value is used at every breakpoint, as the "largest common size / phone size" rule allows. Where the size is fixed, I wrote the value directly.

## Per file (old -> new, context)

### blocks/ai_gen_block_8237de9.liquid (Product comparison, "Biz de seçerken zorlanıyoruz")
- Hard-coded `apple_koyu` palette (dark; used by the couple page and by event JCVwEz through the schema default):
  - Background #000000 stays.
  - Label #86868b -> #8a8a85 (small top label on dark).
  - Title #f5f5f7 -> #ffffff. Subtitle #86868b -> #a3a39e. Product title #f5f5f7 -> #ffffff.
  - Image card, image area and feature cards #1d1d1f -> #141414. Card text -> #ffffff. Card border rgba(255,255,255,.10) stays.
  - **Buttons:** blue #0071e3 / #0077ed -> white #ffffff with ink #0a0a0a text and white border. Hover is #f4f4f4.
- Hard-coded `apple_acik` palette (light; used by the hediye page):
  - Background #f5f5f7 -> #f4f4f4. Label and subtitle #6e6e73 -> #5c5c57. Title and product title #1d1d1f -> #0a0a0a.
  - Cards stay #ffffff. Card border #e8e8ed -> #d2d2cd. Card text -> #0a0a0a.
  - **Buttons:** blue -> white #ffffff, ink text, 1px-setting (2px) #d2d2cd border. Hover bg #f4f4f4.
- Title letter-spacing: normal -> phone-size rule (24px -> -0.8px).
- Product title: weight 600 -> 700, letter-spacing -> rule (18px -> -0.3px).
- Button: weight 500 -> 600, border-radius setting -> 999px.
- Focus outline: was the button color, which would be invisible white-on-light. It is now `c_bas` (heading color: ink on light, white on dark). This also covers the Hediye and Couple gradient focus outlines.
- Schema defaults:
  - section #fafafa -> #f4f4f4; category and subtitle #666666 -> #5c5c57; texts #171717 -> #0a0a0a; card border #e5e5e5 -> #d2d2cd; image backgrounds #f9f9f9 -> #f4f4f4.
  - Buttons: #171717 / #ffffff -> #ffffff bg, #0a0a0a text, #d2d2cd border, hover #f4f4f4.
  - Hediye gradient (green #8fcbb0 / #599176 / #30614b) and Couple gradient (red #c60303 / #b21e3a / #4a0c16) -> flat #ffffff, with `*_yazi` text -> #0a0a0a.
  - Hover gradient -> flat #f4f4f4.

### blocks/ai_gen_block_066567d.liquid (dark highlight slider; disabled everywhere)
- Accent #0071e3 -> #ffffff. The accent drives labels, the button background and the progress bar.
- Button text default #ffffff -> #0a0a0a, in both the CSS fallback and the schema.
- Gradient #8fcbb0 / #599176 / #30614b -> flat #ffffff.
- Card #1a1a1a -> #141414.
- Button radius 24px -> 999px.
- Heading 48px/32px gets letter-spacing -1px; card heading 36px/28px gets -1px.

### blocks/ai_gen_block_241956a.liquid (Apple slider, light)
- Defaults: card #f5f5f7 -> #f4f4f4; category #6e6e73 -> #5c5c57; headline, arrow icon and plus icon #1d1d1f -> #0a0a0a; arrow bg #e8e8ed -> #f4f4f4.
- Title and card headline letter-spacing: -0.02em -> rule.

### blocks/ai_gen_block_2ca4111.liquid ("Ürünü yakından tanıyın" cards)
- Defaults: heading, title and badge #171717 -> #0a0a0a; card #f9f9f9 -> #ffffff; border #e5e5e5 -> #d2d2cd; description #666666 -> #5c5c57.
- Heading (42/32/28px) gets letter-spacing -1px. Card title (22px) gets -0.8px.

### blocks/ai_gen_block_33582c8.liquid ("Nasıl Çalışır?" steps)
- Heading and step titles: weight 600 -> 700, plus the letter-spacing rule. The heading's phone size is `heading_size × 0.7`. The Apple-mode title's -0.01em is replaced by the rule.
- Defaults: text #000000 -> #0a0a0a; subheading #666666 -> #5c5c57; badge bg and image bg #f5f5f5 -> #f4f4f4; dots #000000 / #cccccc -> #0a0a0a / #d2d2cd.

### blocks/ai_gen_block_86e922a.liquid (Whoop carousel)
- Heading and card title weights now hard-coded to 700. They were range settings.
- Heading letter-spacing was a setting (-2 → -0.02em); it is now the rule. Card title gets the rule too.
- Defaults: #171717 -> #0a0a0a; card #f5f5f5 -> #f4f4f4; inactive dot #d1d5db -> #d2d2cd.

### blocks/ai_gen_block_9d9a4ce.liquid (collection hero card; disabled)
- Primary button: pink #D4A5A5 / #C89595 -> #0A0A0A, weight 500 -> 600, radius -> 999px.
- Secondary button: bg transparent -> #ffffff; border #D4A5A5 / #C89595 -> #D2D2CD; hover bg #F5F5F7 -> #F4F4F4.
- Card #F5F5F7 -> #F4F4F4. Title #1D1D1F -> #0A0A0A. Subtitle #6E6E73 -> #5C5C57.
- Placeholder #e8e8ed -> #f4f4f4. Empty-state text #666 -> #5c5c57.
- Title letter-spacing -> rule.

### blocks/ai_gen_block_b099ce2.liquid (premium carousel)
- Heading font: font_picker (Inter) -> `var(--font-heading-family)`; style normal; weight 700; letter-spacing rule.
- Card title: weight 700 plus the rule.
- Defaults: heading, arrow icon and active dot #171717 -> #0a0a0a; description #666666 -> #5c5c57; card #f0f0f0 -> #f4f4f4 (also the inline placeholder style); inactive dot #cccccc -> #d2d2cd.
- The card image overlay `linear-gradient(rgba(0,0,0,.7) -> 0)` and the white text over it stay (image-darkening overlay).

### blocks/ai_gen_block_ba31aeb.liquid (card slider)
- Defaults: section #f5f5f7 -> #f4f4f4; headlines and active dot #1d1d1f -> #0a0a0a; all #86868b labels, subtitles and descriptions -> #5c5c57; borders and dots #d2d2d7 -> #d2d2cd; placeholder #f5f5f7 -> #f4f4f4.
- Title and card headline letter-spacing -> rule.

### blocks/ai_gen_block_c4e4fad.liquid (Apple text, "Kısaca **Dijital…**")
- Body font_picker -> `var(--font-body-family)`. The body weight setting and body letter-spacing setting are kept.
- Inner h1–h6: font_picker -> `var(--font-heading-family)`, weight 700, letter-spacing rule.
- Defaults: text #86868b -> #5c5c57; bold #1d1d1f -> #0a0a0a.

### blocks/ai_gen_block_d0a0e86.liquid (event hero)
- Defaults: background #F7F2E7 (warm beige) -> #F4F4F4; badge bg #f5f5f5 -> #ffffff; texts #171717 -> #0a0a0a.
- Heading letter-spacing -> rule.

### blocks/ai_gen_block_fcecf20.liquid (hero category card)
- Heading: font_picker -> `var(--font-heading-family)`, weight 700, letter-spacing rule. Removed `heading_font | font_face` so the Inter font file is no longer loaded.
- Buttons: weight 600, radius 999px. Secondary bg transparent -> #ffffff.
- Defaults: blue #0071e3 -> primary #0a0a0a; secondary text #0a0a0a, border #d2d2cd; bg #f5f5f7 -> #f4f4f4; body #6e6e73 -> #5c5c57; empty image #e8e8ed -> #f4f4f4.
- **Note:** this block reads `section.settings.*`, not `block.settings.*`. Inside a `_blocks` section that means the block's own JSON values and schema defaults are never used, and the colors render blank. This is an existing bug and I did not change its behavior. JSON patches were written anyway.

### sections/accordion-cards.liquid
- CSS fallbacks and defaults: #171717 -> #0a0a0a (heading, title, icon); #4b4b4b -> #5c5c57; #e5e5e5 -> #d2d2cd; bg #f7f7f8 -> #f4f4f4.
- Letter-spacing rule on the heading (head_m) and on the question titles (15px -> normal).

### sections/feature-highlights.liquid
- Same mapping as accordion-cards (#171717, #4b4b4b, #f7f7f8).
- Heading letter-spacing: the rule replaces the desktop -0.01em (22px -> -0.8px).
- Title (16–17px, 700) gets the rule.

### sections/device-compat-bar.liquid ("Cihaz uyumluluğu")
- **Button is now secondary:** bg #ebebeb -> #ffffff, text #0a0a0a, #d2d2cd outline, radius -> 999px. The `btn_border` checkbox is off in JSON, so the outline is drawn as `box-shadow: inset 0 0 0 1px` to keep the button height the same. When the checkbox is on, the real border is used as before.
- Popup title: ink, Poppins via `var(--font-heading-family)`, 700, letter-spacing rule (19px -> -0.3px).
- Popup body #4b4b4b -> #5c5c57. Close button #f2f2f2 / #171717 -> #f4f4f4 / #0a0a0a.
- Borders #e8e8e8 -> #d2d2cd. Brand, text and middle colors -> #0a0a0a.

### sections/taksit-tablosu.liquid (taksit popup and price row)
- Popup title: weight 600 -> 700, `var(--font-heading-family)`, -.021em -> -0.8px (22px).
- Defaults:
  - Text #1D1D1F -> #0A0A0A.
  - Secondary #6E6E73 and footnote #86868B -> #5C5C57. #8A8A85 is not allowed below 24px on light.
  - Line #ECECEE -> #D2D2CD. Close bg #F2F2F4 -> #F4F4F4.
  - Discount band: green text #1A7F37 -> #0A0A0A; light green bg #EDF7F0 -> #F4F4F4.
  - Info and price-row bg #F5F5F7 -> #F4F4F4.
  - Focus ring #0071E3 -> #0A0A0A.
- Dark-mode (`karanlik_mod`) variables:
  - #1C1C1E -> #0A0A0A; #2C2C2E -> #141414; #F5F5F7 -> #FFFFFF; #A1A1A6 and #8E8E93 -> #A3A39E; #3A3A3C -> #262624.
  - Green badge #16301D / #6EE08A and its rgba -> #141414 / #FFFFFF and white rgba.
  - Added `--tk-odak: #FFFFFF` so the focus ring is white on dark.
- Close hover rgba(128,128,128,.28) -> rgba(138,138,133,.28) (#8a8a85 based).
- Diagnostic box (only shown when `tani` is on): #111 -> #0a0a0a; `-apple-system,system-ui` -> `var(--font-body-family)`.

### sections/help-drawer.liquid
- Block schema defaults: text #fafafa -> #ffffff; bg #1f1f1f -> #0a0a0a; highlight #ffddbf -> #d6ff00. The highlight is only used when "highlighted text" is on, and it is "none" on every block.

### sections/urun-alt-cta.liquid
- Heading: 28px, weight 500 -> 700, -0.02em -> -1px.
- Link is ink and keeps its existing arrow and hover underline. The default and patch value change from #0071E3 to #0A0A0A.
- Defaults: bg #F5F5F7 -> #F4F4F4; label #86868B -> #5C5C57 (11px on light); title #1D1D1F -> #0A0A0A; description #6E6E73 -> #5C5C57.

### sections/ugc-video-gallery.liquid (UI only, videos untouched)
- `apple` palette (dark, the one in use):
  - Heading #f5f5f7 -> #ffffff. Rating and caption #86868b -> #a3a39e.
  - Card #1d1d1f -> #141414. The placeholder gradient (#1d1d1f -> #2c2c2e) becomes flat #141414.
  - Scrollbar thumb #f5f5f7 -> #ffffff.
  - Stars are white (new `c_yildiz`); empty star #262624.
- `apple_acik` palette:
  - Background #f5f5f7 -> #f4f4f4. Heading #1d1d1f -> #0a0a0a. Secondary #6e6e73 -> #5c5c57.
  - Card and placeholder #e8e8ed (gradient) -> flat #ffffff.
  - Track rgba(10,10,10,.12). Thumb #0a0a0a.
- Custom palette: card #eeeeee -> #f4f4f4; placeholder gradient -> flat #f4f4f4; thumb fallback #0a0a0a.
- Stars: fill from the setting (or white on dark). Empty star #e0e0e0 -> #d2d2cd. Default star #f5a623 -> #0a0a0a.
- Heading letter-spacing -> rule (24px -> -0.8px), on the base rule and in site-typography mode.
- Kept: the video dialog #000, the black rgba backdrop and close button, and the play-icon rgba(0,0,0,.45) and #fff (video overlay UI).

### sections/sayfa-zemini.liquid
- Default #F8F8F8 -> #F4F4F4.

## Patch file: `dil/yamalar/C.tsv`
- **551 lines.** Every old_value was checked against the current JSON (0 mismatches, no duplicate paths). No nested theme blocks exist in these sections, so all paths are `settings.x` or `blocks.<k>.settings.x`.
- Covers all `_blocks` sections listed in kullanilan.json, including `templates/collection.couple-urunler.json` and the `product.*` `_blocks` keys, which have no color settings. It also covers urun-alt-cta (4 collection templates and 2 product templates), sayfa-zemini (3 collections), and the product templates' taksit, device-compat-bar, feature-highlights, accordion-cards, faq, help-drawer and ugc sections.
- **Disabled blocks are included.** Most `_blocks` blocks are disabled. I patched them anyway so the ~511 `_blocks` values are consistent if they are re-enabled. The note column ends in "disabled" for these lines, so they can be filtered out.
- The rendered `_blocks` blocks are:
  - index fcecf20_PrEE9R
  - couple page 8237de9_MjAnkx
  - hediye page 8237de9_4JTHXp
  - event page: 33582c8_BaDJkB (dark), 8237de9_JCVwEz, c4e4fad_ntV88y, d0a0e86_D486G3, 2ca4111_Y7yMMP
- Per-instance logic:
  - **33582c8:** the instances with bg #0d0d0d are dark: bg -> #000000, card #4a4a4a -> #141414, subheading #dadada -> #a3a39e, text #e8e8e8 -> #ffffff, dots -> #ffffff / #5c5c57, image bg -> #141414. The light instances map to ink, #5c5c57 and #d2d2cd.
  - **2ca4111:** on grey sections (#ececec, #e2e2e2 -> #f4f4f4) cards go #f9f9f9 -> #ffffff. On white sections cards go -> #f4f4f4.
  - **8237de9 button border:** #ffffff for the koyu palette, #d2d2cd otherwise.
  - **Hediye page (4JTHXp):** buttons #000000 -> #ffffff bg, #0a0a0a text, #d2d2cd border. The hover was green #30614b and is now #f4f4f4. Its hover gradient (on) becomes flat #f4f4f4.
  - **Couple page (MjAnkx):** text #1d1d1f -> #0a0a0a; hover #e8e8ed -> #f4f4f4.
- `ugc scrollbar_thumb_gradient`: lime/yellow gradient -> a flat ink gradient string. It is not used by the active `apple` palette.
- help-drawer `color_highlight` (#ffddbf, #e7e7e7) -> #d6ff00. It is unused because highlighted_text is "none".

## Non-palette colors kept, and why
- **Status reds:** none in my files.
- Black or white rgba shadows, backdrops and image/video overlays, kept as overlay or shadow:
  - b099ce2 card gradient overlay
  - 066567d image overlay gradient
  - ugc dialog backdrop, close button and play-icon circle
  - box-shadows in 2ca4111, 33582c8, 86e922a, 9d9a4ce, d0a0e86, device-compat-bar and taksit
- Placeholder or dialog white rgba(255,255,255,.95), and white-alpha controls on dark (066567d arrows and progress track).
- taksit `.tt-tk-ind-kod`: `ui-monospace, SFMono-Regular, Menlo, monospace` is kept for the discount code chip. It is a deliberate monospace for code, not a body or heading stack. Change it to `var(--font-body-family)` if strictness is preferred.
- Hex values remain only inside Liquid comments (d0a0e86 doc, urun-alt-cta header comment, ugc palette comment). They do not render.

## Ambiguous decisions (please review)
1. **Mixed-weight headings not changed to 700.** feature-highlights ("Uzun yıllar **sizinle kalması için tasarlandı**.") and accordion-cards use weight 400 with `<strong>` at 700 as a deliberate emphasis split. I kept 400/700 and only fixed color and letter-spacing. If headings must be fully 700, set `.fh-heading` / `.ac-heading` to `font-weight: 700`. The two-line grey rule would then be the only way to show emphasis.
2. **Heading weights forced to 700 where they were settings or lower.** This applies to 86e922a heading and card title, b099ce2 heading and card title, 33582c8 heading and titles (600), 8237de9 product titles (600), urun-alt-cta (500) and taksit title (600). The weight settings in those blocks are now ignored.
3. **Button radius forced to 999px where it was a setting.** This applies to 8237de9, 9d9a4ce, fcecf20 and the device-compat-bar button.
4. **device-compat-bar outline:** the secondary outline is drawn even though the `btn_border` checkbox is off (as an inset shadow, so the size is unchanged).
5. **Taksit popup:** "Ürün fiyatı" secondary text (#6e6e73) and the "Toplam…" footnotes (#86868b) both became #5c5c57, so the two text levels are now the same color.
6. **Discount band** (taksit, price row, collection strip) was green text on light green. It is now ink on #f4f4f4 rather than a lime badge, because the band is a wide strip and lime is for small elements only.
7. **86e922a description_color #171717 -> #0a0a0a.** I kept it ink rather than secondary grey because the original was ink.
8. **FAQ:** the dark card #171717 -> #0a0a0a (card/box on a white page). The heading, typography and button come from shared theme CSS and snippets (`heading-content`, `button`), which I did not touch.
9. **feature-highlights and help-drawer icons** come from the shared `icon-guarantee` snippet. The leaf icon's light-grey fill is in that snippet, not my files. It should become single-color when the owner of that snippet edits it.
10. **Theme-level text inherited by my sections** (e.g. faq heading tracking via the `tracking-heading` class) belongs to shared CSS and is not changed here.

## Poppins overflow risks (sizes unchanged)
- **8237de9 comparison:** 2-column feature cards at 15px (13px in compact mode). Poppins is wider, so cards may grow a line. The Hediye/Couple and Dijital/Fiziksel buttons are fine. The 24px title "Biz de Seçerken Zorlanıyoruz." may wrap to 2 lines at 390px.
- **9d9a4ce and fcecf20** buttons are `white-space: nowrap` (and fcecf20 has min-width 200px). Long labels plus Poppins plus weight 600 could overflow on narrow phones (9d9a4ce has two side-by-side buttons with `flex-wrap: nowrap`).
- **device-compat-bar:** iOS and Android labels plus the "Cihaz uyumluluğu →" button share one row at 390px, so the button text may wrap.
- **taksit popup:** the right-hand "Toplam 2.594,35 TL" and "+195,35 TL vade farkı" rows were already tuned for 375–430px (see the in-file comments). Poppins may push them to two lines on screens 400px wide or narrower.
- **33582c8 step titles (20px, now 700) and the urun-alt-cta 28px heading (now 700)** are wider than before.
- **c4e4fad Apple text** is ~20px with bold runs. It is long-form, so wrapping is fine but the text gets taller.
