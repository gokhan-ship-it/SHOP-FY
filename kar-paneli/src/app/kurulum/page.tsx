import Link from "next/link";
import { Card, Label, Note, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { env, mask } from "@/lib/config";
import { getSetting } from "@/lib/settings";
import { saveMetaAction, saveShopifyAction } from "../actions";

export const dynamic = "force-dynamic";

function Step({ n, title, done, children, id }: { n: number; title: string; done: boolean; children: React.ReactNode; id: string }) {
  return (
    <Card id={id}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-[var(--s3)] text-white" : "bg-surface-2 text-ink"}`}>{done ? "✓" : n}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default async function Kurulum({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const domain = env("SHOPIFY_STORE_DOMAIN") || "52ae29-e0.myshopify.com";
  const shopifyDone = !!(env("SHOPIFY_CLIENT_ID") && env("SHOPIFY_CLIENT_SECRET") && getSetting("shopify_magaza_adi"));
  const metaDone = !!env("META_ACCESS_TOKEN");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Kurulum" sub="Anahtarlar yalnızca bu Mac'teki .env dosyasına yazılır; hiçbir yere gönderilmez, kayıtlara yazılmaz." />
      <Flash q={q} />

      <Step n={1} id="shopify" title="Shopify bağlantısı (yalnızca okuma)" done={shopifyDone}>
        <details open={!shopifyDone} className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-accent">Uygulamayı nasıl oluştururum?</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-2">
            <li>
              Shopify yönetim paneline girin (Text To Next mağazası açık olsun, JantiFox değil). Sol altta <b>Ayarlar → Uygulamalar → Uygulama geliştir</b>, ardından <b>Dev Dashboard&apos;da uygulama oluştur</b>.
            </li>
            <li>
              <b>Create app</b>&apos;e basın, adı <b>TTN Kâr Paneli</b> olsun.
            </li>
            <li>
              <b>Access → Scopes → Select scopes</b>: <code>read_orders</code>, <code>read_products</code>, <code>read_reports</code> işaretleyin. Mümkünse <code>read_all_orders</code>&apos;ı da ekleyin (eski siparişler için). En altta <b>Release</b>.
            </li>
            <li>
              Uygulamanın ana sayfasında <b>Install app</b> → <code>52ae29-e0</code> mağazasını seçin → <b>Install</b>.
            </li>
            <li>
              <b>Settings</b> sayfasındaki <b>Client ID</b> ve <b>Client secret</b>&apos;ı aşağıya yapıştırın.
            </li>
          </ol>
        </details>
        <form action={saveShopifyAction} className="space-y-3">
          <label className="block">
            <Label hint="Text To Next">Mağaza adresi</Label>
            <input name="domain" required className="field" defaultValue={domain} />
          </label>
          <label className="block">
            <Label>Client ID</Label>
            <input name="clientId" required className="field" defaultValue={env("SHOPIFY_CLIENT_ID")} autoComplete="off" />
          </label>
          <label className="block">
            <Label hint={env("SHOPIFY_CLIENT_SECRET") ? `kayıtlı: ${mask(env("SHOPIFY_CLIENT_SECRET"))} — değiştirmek için yeni değeri yazın` : undefined}>Client secret</Label>
            <input name="clientSecret" type="password" required={!env("SHOPIFY_CLIENT_SECRET")} className="field" autoComplete="off" />
          </label>
          <button className="btn-primary">Kaydet ve bağlantıyı dene</button>
          <p className="text-xs text-muted">Panel önce mağaza adresini doğrular. Adres tutmazsa hiçbir veri çekilmez. Bağlantı tutunca sipariş geçmişinin tamamı arka planda çekilir (birkaç dakika sürebilir).</p>
        </form>
      </Step>

      <Step n={2} id="meta" title="Meta reklam bağlantısı (yalnızca ads_read)" done={metaDone}>
        <details open={!metaDone} className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-accent">Salt okunur anahtarı nasıl alırım?</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-2">
            <li>
              <b>developers.facebook.com</b>&apos;a kendi Facebook hesabınızla girin. Sağ üstte <b>Uygulamalarım → Uygulama oluştur</b>.
            </li>
            <li>
              Kullanım amacında <b>Diğer</b>, uygulama türünde <b>İşletme</b>&apos;yi seçin. Ad: <b>TTN Kâr Paneli</b>. İşletme portföyü sorarsa “Text To Next Teknoloji A.Ş” seçebilir ya da boş bırakabilirsiniz.
            </li>
            <li>
              Uygulama açılınca sol menüde <b>Uygulama ayarları → Temel</b>: <b>Uygulama Kimliği</b> ve <b>Uygulama Gizli Anahtarı</b>&apos;nı (Göster&apos;e basarak) aşağıya yapıştırın.
            </li>
            <li>
              Üst menüde <b>Araçlar → Graph API Gezgini</b>. Sağda <b>Meta Uygulaması</b> olarak “TTN Kâr Paneli”, <b>Kullanıcı veya Sayfa</b> olarak “Kullanıcı Erişim Anahtarı” seçin.
            </li>
            <li>
              <b>İzinler</b> kutusuna <code>ads_read</code> yazıp ekleyin (başka izin eklemeyin). <b>Generate Access Token</b>&apos;a basın ve kendi hesabınızla onaylayın.
            </li>
            <li>Çıkan uzun metni (anahtar) kopyalayıp aşağıya yapıştırın. Panel onu 60 günlük anahtara kendisi çevirir; süre dolmadan 7 gün önce sizi uyarır.</li>
          </ol>
          <Note>Ajanstan ya da başka birinden hiçbir şey istenmez; anahtar sizin mevcut erişiminizle ve yalnızca okuma izniyle üretilir.</Note>
        </details>
        <form action={saveMetaAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <Label>Uygulama Kimliği</Label>
              <input name="appId" required={!env("META_APP_ID")} className="field" defaultValue={env("META_APP_ID")} autoComplete="off" />
            </label>
            <label>
              <Label hint={env("META_APP_SECRET") ? `kayıtlı: ${mask(env("META_APP_SECRET"))}` : undefined}>Uygulama Gizli Anahtarı</Label>
              <input name="appSecret" type="password" required={!env("META_APP_SECRET")} className="field" autoComplete="off" />
            </label>
          </div>
          <label className="block">
            <Label>Graph API Gezgini&apos;nden aldığınız anahtar</Label>
            <textarea name="token" required rows={3} className="field font-mono text-xs" autoComplete="off" />
          </label>
          <button className="btn-primary">Anahtarı 60 günlüğe çevir ve kaydet</button>
          <p className="text-xs text-muted">Veri yalnızca Text To Next reklam hesabından (act_426980502817664) çekilir. Diğer hesaplar için Ayarlar ekranından izin verebilirsiniz.</p>
        </form>
        <div className="mt-4">
          <Note tone="warn">
            Geliştirici sitesi “You cannot access this service” diyorsa: reklam harcamasını{" "}
            <Link href="/saglik#meta-rapor" className="font-medium underline">
              Ayarlar → Meta raporu yükle
            </Link>{" "}
            bölümünden Reklam Yöneticisi raporuyla girebilirsiniz.
          </Note>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-ink-2">Kalıcı çözüm (isteğe bağlı): süresi dolmayan anahtar</summary>
          <div className="mt-2 space-y-2 text-sm text-ink-2">
            <p>Reklam hesabının sahibi eski ajansın “Wolfy” portföyü. Hesap, sizin “Text To Next Teknoloji A.Ş” portföyünüze partner olarak paylaşılırsa kendi portföyünüzde bir “Sistem Kullanıcısı” açıp süresi dolmayan, salt okunur bir anahtar alabilirsiniz.</p>
            <p>Bu bir paylaşım işlemidir; kimseden şifre ya da anahtar istenmez. İsterseniz adımları ayrıca anlatabilirim.</p>
          </div>
        </details>
      </Step>

      <Step n={3} id="yedek" title="Yedek klasörü" done={!!getSetting("yedek_klasoru")}>
        <p className="text-sm text-ink-2">
          Varsayılan olarak iCloud Drive → TTN-Kar-Yedek kullanılır. Değiştirmek için{" "}
          <Link href="/saglik#yedek" className="text-accent underline">
            Ayarlar → Yedek
          </Link>
          .
        </p>
      </Step>

      <div className="flex justify-end">
        <Link href="/" className="btn-primary">
          Panele git →
        </Link>
      </div>
    </div>
  );
}
