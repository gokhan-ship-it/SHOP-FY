# tt-footer-yasal.liquid'den mock HTML uretir: ayni <style>, ayni isaretleme (Liquid elle acildi).
import re, json, sys, html
liq = open(sys.argv[1]).read()
stil = re.search(r'<style>.*?</style>', liq, re.S).group(0).replace('{{ sid }}', 'mock')
menu = [("Sözleşmeler ve Politikalar", "/pages/sozlesmeler-ve-politikalar"), ("Mesafeli Satış Sözleşmesi", "/policies/terms-of-service"),
        ("Ön Bilgilendirme Formu", "/pages/on-bilgilendirme-formu"), ("İade ve Cayma Politikası", "/policies/refund-policy"),
        ("Kargo ve Teslimat", "/policies/shipping-policy"), ("Gizlilik Politikası (KVKK)", "/policies/privacy-policy"),
        ("Çerez Politikası", "/pages/cerez-politikasi"), ("Uygulama Kullanım Koşulları", "/pages/uygulama-kullanim-kosullari")]
telif = "© 2026 Text To Next Mücevherat Sanayi ve Ticaret Ltd. Şti."
li = lambda t, u: f'<li><a href="{u}">{html.escape(t)}</a></li>'
A = f'''<div class="ttf-mock"><div class="page-width page-width--narrow"><div class="ttf-a-ust"><p class="ttf-etiket" id="ttf-etiket-mock">Yasal</p>
<nav aria-labelledby="ttf-etiket-mock"><ul class="ttf-a-liste">{''.join(li(t,u) for t,u in menu)}{li("İletişim","/pages/iletisim")}</ul></nav></div>
<div class="ttf-a-alt"><p class="ttf-telif">{telif}</p></div></div></div>'''
B = f'''<div class="ttf-mock"><div class="page-width page-width--narrow"><div class="ttf-b"><nav aria-label="Yasal"><ul class="ttf-b-liste">{''.join(li(t,u) for t,u in menu)}</ul></nav>
<p class="ttf-telif">{telif}</p></div></div></div>'''
json.dump({'A': stil + A, 'B': stil + B}, open(sys.argv[2], 'w'), ensure_ascii=False)
print('ok', len(A), len(B))
