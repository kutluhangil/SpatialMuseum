# Dijital Emzirme Müzesi — WebXR ile Yeniden İnşa Planı

> **Durum:** Taslak v3 — 22 Eylül: mekân müzeden gerçekçi bir üniversite dersliğine çevrildi (kullanıcı ve ad aynı; bkz. `docs/decisions/0005-derslik.md`). Tek açık kritik konu hastane ağı (bkz. §18.3 ve §20)
> **Tarih:** 21 Eylül 2026 (v2: aynı gün, yanıtlardan sonra)
> **Kullanım bağlamı:** Hastane lohusa servisi; gözlükleri hastane satın alacak; yalnız eğitim amaçlı, veri toplama yok
> **Hedef cihazlar:** Meta Quest 3S / 3 (satın alma hedefi), Quest 2 (yalnız test cihazı, en kötü durum), masaüstü tarayıcı (demo ve editör)
> **Yaklaşım:** Web-first WebXR, veri odaklı müze, tek kod tabanı, Claude Code ile faz faz uygulama
> **Güven etiketleri:** `[Certain]` kaynağı olan / kesin — `[Likely]` güçlü çıkarım — `[Guessing]` cihazda veya sahada doğrulanacak

> 🆕 **v2'de değişenler**
> - Hastane bağlamı: yatak modu ve hemşire modu (§7.3)
> - Türkiye'nin resmi Quest ülkesi olmamasının sonuçları (§1.7, §18)
> - Satın alma önerisi: Quest 3S / 3, Quest 2 değil (§18.2)
> - Hastane bilgi işlemine sorulacaklar (§18.3) ve hemşire prosedürü taslağı (§18.4)
> - Çevrimdışı mod "büyük olasılıkla gerekli"ye çıktı; Faz 1'e spike eklendi
> - Veri kaydı (Faz 11) kapsam dışı
> - Onay kilometre taşı: Faz 3 sonunda yönetime gösterilebilir demo

---

## 0. Tek sayfada özet

| Karar | Seçim |
|---|---|
| Ne inşa ediyoruz | Gerçekçi bir üniversite dersliğinde, perde ve tahtada ilerleyen bir emzirme dersi; Spatial'ın "medya as" mantığının sahipliği bizde olan sürümü |
| Motor | Vite + React + TypeScript + React Three Fiber + `@react-three/xr` v6 |
| İçerik | Tek gerçek kaynak: `content/museum.json` v2 (derslik, ders bölümleri ve adımları, duvar baskıları) + medya dosyaları |
| Editör | `/edit` rotası — yalnız geliştirme modunda, senin Mac'inde. Kaydet → JSON diske yazılır → commit'i sen atarsın |
| Yayın | Cloudflare Pages (site) + Cloudflare R2 (video ve görseller) |
| Gözlük | İlk günden Quest Browser'da link ile. Hastanede varsayılan teslimat: tarayıcı + yer imi. APK opsiyonel (PWA/TWA) |
| Kullanım | Lohusa servisi, hemşire eşliğinde; yatak modu ve hemşire modu (§7.3) |
| Çevrimdışı | Hastane ağına bağlı: Faz 1'de spike, hastane bilgi işlem yanıtına göre büyük olasılıkla gerekli (Faz 10) |
| Veri | Toplanmıyor (21 Eylül kararı); Faz 11 kapsam dışı |
| Süre | Faz 0–9 (4b dahil) için ~19–28 iş günü; Faz 10 gerekirse +2–3 gün `[Guessing]` |

> 🎯 **Tek cümle:** İçeriği bize ait bir dosyada tutan, Quest'te linkle girilen bir sanal derslikte anneye perde ve tahtada ilerleyen bir emzirme dersi veriyoruz.

---

## 1. Önce rahatsız edici gerçekler

1. `[Certain]` **Spatial'daki müze artık yok.** Spatial, Creator platformunun Free ve Pro katmanlarını 27 Temmuz 2026'da kapattı; bu katmanların 3D dünya barındırması bitti ve yüklenen dosyalar o tarihten sonra kalıcı olarak silindi (Enterprise katmanı etkilenmedi). Elimizde yalnızca sizin yerel kopyalarınız var. Hangi videonun hangi duvarda durduğu bilgisi sıfırdan kurulacak. Eski müzenin ekran görüntüleri, ekran kaydı ya da makalenin yöntem bölümündeki müze tarifi bu yüzden şu an en değerli materyal.

2. `[Likely]` **"APK'yı en sona bırakalım" planı yanlış sırada.** VR'a özgü sorunlar (yazı okunurluğu, video netliği, kare hızı, baş dönmesi) yalnızca gözlükte görünür. WebXR sürümü Quest Browser'da linkle açılır, APK gerekmez. Bu planda her faz bir **gözlük kapısı** ile kapanır.

3. **APK, çevrimdışı demek değil.**
   - `[Likely]` Quest'te Android WebView WebXR desteklemiyor; Cordova/Capacitor ile paketlenen WebXR uygulamalarının VR'a giremediği birden çok geliştirici tarafından raporlanıyor.
   - `[Certain]` Meta'nın resmi yolu PWA paketlemesi: araç, canlı bir URL'deki manifest'ten APK üretir ve uygulama tarayıcı motoruyla o siteyi açar.
   - Sonuç: Çevrimdışı zorunluysa ya servis worker önbelleği (Quest'te doğrulanmalı, `[Guessing]`) ya da aynı içeriği okuyan native bir görüntüleyici gerekir (bkz. §3.3).

4. `[Certain]` **Videoları ev sunucusundan Cloudflare Tunnel ile yayınlayamayız.** Cloudflare'in politikasına göre Tunnel'ın public hostname trafiği Free/Pro/Business planlarda video kısıtına tabi; Cloudflare dışında barındırılan video ve büyük dosyalar kısıtlı, R2/Stream'de barındırılanlar serbest. Karar: videolar R2'ye.

5. `[Likely]` **Eski duvar yazıları VR için büyük olasılıkla fazla uzun.** VR okunurluk çalışmaları rahat okuma için ~41±14 dmm açısal boyut raporluyor (2 m'den bakınca ~8 cm harf). Paneller kısa ve büyük olmalı; uzun metin "odak modunda" yakına açılmalı. Bu bir içerik kısaltma işi ve eşinin uzmanlığını ister.

6. `[Likely]` **Quest 2 yolun sonunda.** Quest 2 ve Pro için özellik güncellemeleri Aralık 2026'da, kritik hata/güvenlik güncellemeleri Aralık 2027'de bitiyor. Quest 2 tarayıcısında WebXR kontrolcülerinin tanınmadığı açık hata raporları da var. Birincil hedef Quest 3/3S.

7. `[Certain]` **Türkiye, Meta Quest'in resmi olarak desteklediği ülkelerden biri değil.** Meta mağazasının gönderim yaptığı ülke listesinde Türkiye yok; Meta'nın topluluk yöneticisi de Türkiye'nin desteklenmeyen ülke olduğunu açıkça yazıyor. Sonuçları:
   - `[Likely]` Gözlükler ithalatçı ya da pazar yeri satıcılarından alınır; garanti ve servis Meta'dan değil satıcıdan gelir.
   - `[Likely]` Meta'nın kurumsal cihaz yönetimi (HMS: kiosk modu, toplu kurulum) kayıt sırasında desteklenen bir ülke seçilmesini istiyor; Türkiye'deki bir hastane için büyük olasılıkla kullanılamaz. HMS'e dayanan üçüncü taraf yönetim araçları da aynı engele takılır.
   - `[Likely]` Horizon OS'ta Türkçe arayüz yok: kurulum, güvenlik sınırı ve izin ekranları İngilizce. Bu ekranları hemşire yönetir; anne yalnızca bizim Türkçe arayüzümüzü görür.
   - Artı yanı: WebXR yaklaşımı mağazaya hiç ihtiyaç duymaz; Quest Browser her gözlükte yerleşik.

8. `[Likely]` **Lohusa servisindeki anne çoğu zaman yatakta, yarı oturur pozisyonda** (özellikle sezaryen sonrası). "Oturarak" tasarım yetmez → **yatak modu**: anne müzede yürümez, eserler sırayla onun bakış yönüne gelir (§7.3).

---

## 2. Spatial nasıl çalışıyordu — ve biz ne alıyoruz

> ℹ️ `[Certain]` Spatial'ın creator tarafı kapandığı için canlı inceleme yapılamadı. Aşağıdaki mantık; Spatial'ın kapanış duyurusu, Creator Toolkit dokümantasyonu ve Spatial'ı derslerde kullanan üniversite eğitim sayfalarından çıkarıldı.

| Spatial kavramı | Nasıl çalışıyordu | Bizdeki karşılığı | Karar |
|---|---|---|---|
| Space / World | Hazır şablon ortam (galeri vb.) ya da Unity tabanlı Creator Toolkit ile özel sahne; Spatial'ın sunucularında barındırılır | `museum.json` içindeki odalar + prosedürel mimari | Al, sahiplen |
| Çerçeve (frame) | Duvardaki boş çerçeveye tıklayıp görsel/video yükleme; "Replace" ile değiştirme | Duvara bağlı **eser** (exhibit): video, görsel, metin paneli | Al |
| "+" ile içerik ekleme | Görsel, video, 3D model, not ekleme | Editörde medya kütüphanesinden duvara sürükle-bırak | Al ve geliştir (hizalama, okunurluk uyarısı) |
| Portal | Balon görünümlü geçiş; hub'dan alt galerilere ışınlama | Kapılar + rehberli turda "Sonraki durak" | Dönüştür |
| Avatar ve çok oyunculu | Avatarlar, sesli/yazılı sohbet | Yok (tek kişilik deneyim). Hemşire gözetimi için Quest'in yerleşik yansıtması (casting) | Bırak |
| Web'de gezinme | Fareyle sürükleyerek bak, zemine tıklayarak yürü | Aynısı + WASD | Al |
| Platformlar | Web, mobil, VR (Quest uygulaması) | Web + Quest Browser (WebXR) + PWA APK | Al |
| Barındırma | Spatial'ın bulutu → kapanınca her şey gitti | Cloudflare Pages + R2; yerleşim git'te | Değiştir |

**Özet:** Spatial bir "dünya barındırma + medya çerçevesi" platformuydu. Sizin müzeniz muhtemelen bir galeri şablonu üzerine çerçevelere video/görsel yüklenerek kuruldu `[Guessing]`. Bizim sistem aynı zihinsel modeli (**oda → duvar → eser**) korur; çok oyunculu sosyal katmanı atar, yerine müzeye özgü olanları koyar: rehberli tur, okunurluk denetimi, tek-video kuralı, opsiyonel araştırma verisi.

---

## 3. Seçenek analizi

### 3.1 Karşılaştırma

| Seçenek | Web'de önizleme | Quest'te çalışma | APK / çevrimdışı | Video | Editör ve Claude Code uyumu | Kilitlenme riski | Karar |
|---|---|---|---|---|---|---|---|
| **A. R3F + `@react-three/xr` (WebXR)** | ✅ aynı kod | ✅ Quest Browser | ⚠️ PWA/TWA (internet ister), çevrimdışı ek iş | ✅ tarayıcının donanım çözücüsü | ✅ React ile editör doğal; Claude Code için ideal | ✅ açık standart | **Seçildi** |
| **B. Meta IWSDK (WebXR)** | ✅ IWER emülasyonu | ✅ Quest'e optimize | ⚠️ A ile aynı | ✅ | ⚠️ ECS paradigması, React değil. ✅ Yerleşik MCP sunucusu | ⚠️ Meta'ya bağlı (MIT lisanslı) | **Yedek** |
| **C. Unity + Meta XR SDK** | ⚠️ WebGL + üçüncü parti WebXR eklentisi | ✅ native | ✅ native APK, çevrimdışı | ✅ | ❌ C# ve Unity Editör; Claude Code ile zahmetli | ⚠️ lisans politikası değişkenliği | Yalnız çevrimdışı şartsa |
| **D. Godot 4** | ⚠️ | ✅ OpenXR | ✅ | ❌ çekirdekte yalnız Ogg Theora; H.264 yok, URL'den akış yok | ⚠️ | ✅ | **Elendi** |
| **E. Meta Spatial SDK (Kotlin)** | ❌ web önizleme yok | ✅ | ✅ | ✅ Android panelleri | ⚠️ Kotlin/Android + masaüstü Spatial Editor | ⚠️ yalnız Quest | Native yedek |
| **F. Hazır platform (FrameVR, VIVERSE)** | ✅ | ✅ | ❌ | ⚠️ FrameVR ücretsiz planda 512 MB video | ✅ kodsuz ama tasarım ve veri kontrolü yok | ❌ Spatial dersi | Önerilmez |

Etiketler: Godot video kısıtı `[Certain]` (resmi doküman). FrameVR 512 MB `[Certain]` (fiyat sayfası). IWSDK özellikleri ve MCP sunucusu `[Certain]` (Meta dokümanı). Unity'nin Claude Code ile zahmeti `[Likely]`.

### 3.2 Neden A (R3F) — ve ne zaman B'ye geçeriz

- `[Likely]` **Bu projenin kalbi editör.** Duvara sürükle-bırak, hizalama, özellik paneli... React DOM ile R3F aynı state'i paylaşır: panel Tailwind ile, 3D görünüm R3F ile yazılır. IWSDK'da editör arayüzü ayrı bir dünyada kalır.
- `[Likely]` React/TypeScript zaten ana yığının; öğrenme maliyeti sıfıra yakın.
- `[Certain]` `@react-three/xr` v6 teleport, işaretçi olayları, el takibi ve Meta'nın IWER emülatörünü içeriyor; v6.6 ile IWER sentetik ortam modülü ve tarayıcının kendi "VR'a gir" arayüzünü gösterebilmesini sağlayan *offer session* geldi. Masaüstünde gözlüksüz VR testi mümkün.
- `[Certain]` IWSDK'nın gerçek avantajları: konfor özellikli hazır teleport/kaydırma/dönüş, UIKitML uzamsal arayüz, Havok fizik ve AI kodlama asistanlarının canlı sahneyi incelemesini sağlayan yerleşik MCP sunucusu.
- **Geçiş kuralı:** Faz 0 gözlük testinde teleport, konfor veya performans tatmin etmezse IWSDK'ya geçilir. Maliyet düşük; çünkü `museum.json`, medya hattı ve yayın motordan bağımsız.
- Not: Babylon.js ve A-Frame de olgun WebXR motorları; React ve editör uyumu nedeniyle R3F önde.

### 3.3 Karar ağacı: hastane ağı, APK ve çevrimdışı

```
Hastane ağı gözlüklere izin veriyor mu?  (hastane bilgi işlemine sorulacak, §18.3)
│
├── Evet; giriş sayfası (captive portal) yok, video trafiği engellenmiyor
│     └── WebXR linki (Quest Browser yer imi), ek kurulum yok          ← VARSAYILAN
│
├── Evet ama giriş sayfası var ya da trafik kısıtlı
│     └── Faz 10: medya gözlüğe bir kez indirilir, müze ağsız çalışır
│
└── Hayır ya da belirsiz
      ├── Faz 10 Quest'te uçak modunda tam tur geçti → tarayıcı + çevrimdışı mod
      └── geçmedi → native görüntüleyici (Unity / Meta Spatial SDK)
                    medya APK'nın içinde; aynı museum.json'u okur, editör web'de kalır
```

- `[Likely]` Servis worker normal bir tarayıcı sekmesinde de çalışır; çevrimdışı mod için APK gerekmez.
- `[Likely]` Türkiye'de mağaza ve kurumsal yönetim olmadığı için APK, her gözlükte geliştirici modu açılarak yüklenmek zorunda. Tek kazancı Kitaplık'ta ikon olduğundan hastane teslimatının varsayılanı tarayıcı + yer imi; APK (Faz 9) opsiyonel.
- `[Likely]` Spatial da internet gerektiriyordu; yani önceki çalışmada bağlantı vardı. Ama tek seferlik bir araştırma oturumu ile her gün, her vardiya çalışması gereken bir hastane hizmeti aynı şey değil: çevrimdışı mod bu yüzden "opsiyonel"den "büyük olasılıkla gerekli"ye çıktı.

### 3.4 APK hakkında bilinenler

- `[Certain]` Meta, PWA'ları Bubblewrap tabanlı bir araçla Horizon Store paketine çeviriyor. Paket dijital olarak imzalanmalı; web sitesiyle paket arasındaki bağ Digital Asset Links ile doğrulanıyor ve doğrulama başarısızsa immersive PWA açılmıyor.
- `[Certain]` Mart 2026'da açılan bir hata kaydında (meta-quest/bubblewrap #24) immersive modda paketlenen uygulama Quest 2 + Browser v144'te boş ekranda kalıyor; aynı paket 2D modda çalışıyor ve kullanıcı panelden VR'a girebiliyor. **Plan:** Önce immersive dene; sorun olursa 2D mod + "Müzeye gir" butonu.
- `[Certain]` Immersive PWA'da uygulama ikonuna tıklamak, WebXR oturumu için kullanıcı eylemi sayılıyor; sayfa yüklenir yüklenmez `requestSession('immersive-vr')` çağrılabiliyor.
- `[Likely]` Mağaza yayını gerekmez, Türkiye'de zaten pratik değil: APK geliştirici modunda `adb install` ile yüklenir. Hastane bilgi işlemi geliştirici modunu güvenlik açısından sorgulayabilir; bu da tarayıcı yolunu öne çıkaran bir neden daha.

---

## 4. Mimari

```
┌──────────────────────────── Geliştirme (Mac) ─────────────────────────────┐
│                                                                            │
│  /edit (yalnız dev) ──kaydet──► content/museum.json            (git'te)    │
│     │                                                                      │
│     └──medya sürükle──► content/media/raw/ ──npm run media:build──┐        │
│                                                                   ▼        │
│  npm run build (viewer; museum.json pakete gömülür)    content/media/dist/ │
└────────┬──────────────────────────────────────────────────────┬────────────┘
         │ wrangler pages deploy                                 │ npm run media:upload
         ▼                                                       ▼
  Cloudflare Pages (muze.<alan-adı>) ──CORS'lu istek──► Cloudflare R2 (medya.<alan-adı>)
         │
         ├──► Masaüstü tarayıcı : WASD + fareyle bak + zemine tıkla-yürü
         ├──► Telefon (bonus)   : dokun-yürü
         └──► Quest Browser     : WebXR — teleport, odak modu, rehberli tur
                  └──► PWA APK (Faz 9): aynı siteyi açan kabuk
```

> 💡 **Spatial'dan çıkan asıl ders — taşınabilir çekirdek:** İçerik (odalar, yerleşim, metinler, medya) motordan bağımsız bir dosyada durur. WebXR bir gün yetersiz kalırsa ya da native bir APK gerekirse, yeni görüntüleyici aynı `museum.json`'u okur. Müze bir platformla birlikte bir daha kaybolmaz.

**Çalışma zamanı kuralları**

- `museum.json` build sırasında pakete gömülür (`import`). İçerik değişikliği = yeniden deploy (yarım dakika). Kazanç: çalışma anında ek istek yok, şema hatası build'i kırar.
- Medya adresi = `VITE_MEDIA_BASE_URL` + manifest anahtarı. Geliştirmede yerel klasör, yayında R2.
- `/edit` rotası `import.meta.env.DEV` koşuluyla dinamik import edilir; production paketine girmez.
- Tek görüntüleyici üç girdi modunu destekler: masaüstü, dokunmatik, XR. Mod algılama `navigator.xr.isSessionSupported('immersive-vr')` ile.

---

## 5. Teknoloji yığını

| Katman | Seçim | Neden |
|---|---|---|
| Build/dev | Vite + React + TypeScript (strict) | 3D tek sayfa uygulaması; Next.js'in SSR ve rota avantajı burada işe yaramaz, R3F zaten istemci tarafında çalışır `[Likely]` |
| 3D çekirdek | `three`, `@react-three/fiber`, `@react-three/drei` | Ekosistem; drei `<Text>` (troika) Türkçe glifleri doğrudan TTF'ten üretir |
| XR | `@react-three/xr` v6 | Teleport, işaretçi olayları, el takibi, IWER emülatörü |
| VR arayüz | `@react-three/uikit` | Flexbox düzenli VR menüleri. Türkçe karakterler için özel MSDF font üretilecek (§8.3) |
| State | `zustand` + `zundo` | Basit store; `zundo` ile editörde geri al/ileri al |
| Şema | `zod` | `museum.json` doğrulaması: editör kaydetmeden önce, build öncesi ve testte |
| Rota | `wouter` | İki rota (`/`, `/edit`) için yeterli, küçük |
| 2D arayüz | Tailwind CSS | Editör panelleri ve masaüstü üst katmanı |
| Medya | ffmpeg (Homebrew), `sharp`, KTX2 araçları (`toktx` veya `gltf-transform`) | Video kodlama, poster, görsel sıkıştırma |
| Test | `vitest`, Playwright | Şema ve duvar matematiği birim testleri; masaüstü duman testi |
| Yayın | `wrangler` (Pages + R2), `rclone` | Site deploy'u, toplu medya yükleme |
| APK | Meta'nın Bubblewrap fork'u, `vite-plugin-pwa` | PWA manifest'i, opsiyonel servis worker, TWA paketi |

> ⚠️ **Sürüm uyumu:** R3F, drei, xr ve uikit'in birbiriyle uyumlu sürümleri Faz 0'da `package.json`'da tam sürüm olarak sabitlenir. Bu plana sürüm numarası yazılmadı; kurulum günü güncel uyumlu set seçilir.

---

## 6. Veri modeli

> **v3 notu:** Güncel şema `src/schema/museum.ts` (`version: 2`), göç `src/schema/migrate.ts`. v2'de `lesson` (bölümler + sıralı adımlar: video perdede, not tahtada), `room.classroom` ve `spawn.posture` eklendi; `tourStop`, `mood`, `decor` ve varak çerçeve kalktı. Aşağıdaki v1 örnekleri tarihsel.

### 6.1 Koordinat kuralları

- Birim metre, Y yukarı. Odalar XZ düzleminde dikdörtgen: `rect.x`, `rect.z` en küçük köşe.
- Duvar isimleri: `north` (z = rect.z), `south` (z = rect.z + depth), `west` (x = rect.x), `east` (x = rect.x + width).
- Her duvarın yerel çerçevesi: `u` = oda içinden duvara bakarken **sol uçtan** sağa doğru metre, `v` = zeminden yükseklik. `wallFrame(room, side)` → `{ origin, uDir, normal, length }` tek bir yardımcıda hesaplanır ve birim testle korunur.
- Duvarlar tek yüzlü, iç tarafa bakan düzlemler. Bitişik iki odanın ortak duvarı sırt sırta iki düzlemdir; arka yüz ayıklandığı için titreşme (z-fighting) olmaz. Kapı boşluğu her iki düzlemde de kesilir, boşluğa 15 cm derinlikte kasa (pervaz) eklenir.

### 6.2 Şema (`src/schema/museum.ts`)

```ts
import { z } from 'zod'

const Localized = z.object({ tr: z.string().min(1), en: z.string().optional() })
const WallSide = z.enum(['north', 'east', 'south', 'west'])

const Door = z.object({
  wall: WallSide,
  offset: z.number(),          // metres from the wall's left end, seen from inside
  width: z.number().default(1.4),
  to: z.string().optional(),   // target room id, used by wayfinding
})

const Placement = z.object({
  wall: WallSide,
  u: z.number(),               // horizontal centre along the wall
  v: z.number().default(1.5),  // vertical centre above the floor
  width: z.number().positive(),
  depthOffset: z.number().default(0.02), // lifts frames off the wall plane so they never z-fight
})

const Base = z.object({
  id: z.string(),
  roomId: z.string(),
  placement: Placement,
  tourStop: z.number().int().optional(),  // order in the guided tour; absent = free-roam only
  label: z.object({ title: Localized, body: Localized.optional() }).optional(),
})

const VideoExhibit = Base.extend({
  type: z.literal('video'),
  src: z.string(),             // media key, resolved against VITE_MEDIA_BASE_URL
  poster: z.string(),
  aspect: z.number().default(16 / 9),
  subtitles: z.array(z.object({ lang: z.string(), src: z.string() })).default([]),
  autoplayOnApproach: z.boolean().default(true),
  approachRadius: z.number().default(2.2),
  loop: z.boolean().default(false),
})

const ImageExhibit = Base.extend({
  type: z.literal('image'),
  src: z.string(),
  aspect: z.number(),
  frame: z.enum(['none', 'thin', 'passepartout']).default('thin'),
})

const TextPanel = Base.extend({
  type: z.literal('text'),
  variant: z.enum(['roomIntro', 'fact', 'quote', 'label']),
  title: Localized.optional(),
  body: Localized,
  fontSize: z.number().optional(), // metres; the editor warns when this falls under the legibility floor
})

const Exhibit = z.discriminatedUnion('type', [VideoExhibit, ImageExhibit, TextPanel])

const Room = z.object({
  id: z.string(),
  name: Localized,
  rect: z.object({ x: z.number(), z: z.number(), width: z.number(), depth: z.number() }),
  height: z.number().default(3.6),
  wallTone: z.enum(['onsut', 'adacayi', 'alacakaranlik']).default('onsut'),
  doors: z.array(Door).default([]),
})

export const MuseumSchema = z.object({
  version: z.literal(1),
  title: Localized,
  spawn: z.object({
    roomId: z.string(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    yaw: z.number(),
  }),
  rooms: z.array(Room).min(1),
  exhibits: z.array(Exhibit),
})

export type Museum = z.infer<typeof MuseumSchema>
```

Şemaya ek doğrulamalar (`superRefine`): her `exhibit.roomId` var olan bir odayı göstermeli; `door.to` var olan bir oda olmalı; aynı duvardaki eserler çakışmamalı; eser kapı boşluğuna taşmamalı; `tourStop` değerleri tekrarsız olmalı.

### 6.3 Örnek `content/museum.json`

```json
{
  "version": 1,
  "title": { "tr": "Dijital Emzirme Müzesi", "en": "Digital Breastfeeding Museum" },
  "spawn": { "roomId": "lobi", "position": [0, 0, 1.5], "yaw": 0 },
  "rooms": [
    {
      "id": "lobi",
      "name": { "tr": "Karşılama" },
      "rect": { "x": -4, "z": -3, "width": 8, "depth": 6 },
      "doors": [{ "wall": "north", "offset": 4, "width": 1.6, "to": "salon-1" }]
    },
    {
      "id": "salon-1",
      "name": { "tr": "Emzirme pozisyonları" },
      "rect": { "x": -5, "z": -13, "width": 10, "depth": 10 },
      "wallTone": "adacayi",
      "doors": [{ "wall": "south", "offset": 5, "width": 1.6, "to": "lobi" }]
    }
  ],
  "exhibits": [
    {
      "id": "vid-pozisyonlar",
      "type": "video",
      "roomId": "salon-1",
      "placement": { "wall": "east", "u": 5, "v": 1.55, "width": 2.2 },
      "src": "videos/emzirme-pozisyonlari.4f2a9c1e.mp4",
      "poster": "posters/emzirme-pozisyonlari.4f2a9c1e.jpg",
      "subtitles": [{ "lang": "tr", "src": "subs/emzirme-pozisyonlari.tr.vtt" }],
      "tourStop": 1,
      "label": {
        "title": { "tr": "Emzirme pozisyonları" },
        "body": { "tr": "Beşik, çapraz beşik, futbol topu ve yan yatarak emzirme." }
      }
    }
  ]
}
```

> ℹ️ Oda isimleri ve metinler örnektir. Gerçek bölümler eşinin içeriğinden ve (varsa) makalede tarif edilen müze yapısından gelecek.

---

## 7. Deneyim tasarımı

### 7.1 Annenin yolculuğu

1. Hemşire gözlüğü yatağın başına getirir, sistem ekranlarını (İngilizce) kendisi geçer, müzeyi Quest Browser yer iminden açar ve hemşire menüsünden modu seçer: **yatak**, **oturarak** ya da **ayakta**.
2. Anne dersliğin ikinci sırasında **oturarak** başlar; tahtada kısa bir "nasıl kullanılır" notu vardır (yatak modunda yalnız "Sonraki" tuşu anlatılır).
3. Ders adımları **Sonraki / Önceki** ile ilerler (masadaki düğmeler, A/X ve B/Y, masaüstünde N/Boşluk ve B): videolar perdede kendiliğinden başlar, notlar tahtada belirir. **Yatak modu** aynı adımları anneye getirir.
4. İsteyen teleportla kalkıp duvardaki baskılara ve panodaki bilgi kartlarına yakından bakabilir; ders kaldığı yerden sürer.
5. Bitişte "teşekkürler" alanı. Hemşire **Yeni anne** ile her şeyi lobiye ve varsayılanlara döndürür; uygulama kimseye ait bilgi tutmaz.

> 💡 `[Likely]` Rehberli tur ve yatak modu her anneye aynı temel içeriği aynı sırayla gösterir: eğitimin standardı hemşireden hemşireye değişmez. Kontrolcüye alışık olmayan, yorgun bir kullanıcı için de kullanım tek tuşa iner.

### 7.2 Kontroller

| Eylem | Masaüstü | Telefon (bonus) | VR — kontrolcü | VR — el takibi |
|---|---|---|---|---|
| Bakınma | Fareyle sürükle / pointer lock | Parmakla sürükle | Baş hareketi | Baş hareketi |
| Yürüme | WASD / oklar, zemine tıkla | Zemine dokun | Başparmak çubuğu ileri → teleport yayı | Çimdikle işaretleyip teleport `[Guessing]` |
| Dönme | Fare | Parmak | Çubuk sağ/sol → 45° anlık dönüş | Vücutla dön |
| Eserle etkileşim | Tıkla | Dokun | Tetik | Çimdik |
| Odak modundan çık | Esc | "Kapat" | B / Y ya da "Kapat" | "Kapat" butonu |
| Turda ilerle | N / Boşluk | "Sonraki" | A / X | "Sonraki" butonu |
| Yatak modunda ilerle | — | — | A / X ya da tetik | "Sonraki" butonu |

### 7.3 Konfor ve güvenlik (doğum sonrası kullanıcı)

- `[Likely]` **Oturarak-öncelikli tasarım:** Teleport varsayılan. Sürekli kayma (smooth locomotion) kapalı, ayarlardan açılır. Dönüş 45° anlık. Teleportta 200–300 ms kararma. Kullanıcının başlatmadığı hiçbir kamera hareketi yok.
- `[Likely]` **Oturma modu:** Eserler yerinde kalır; oyuncu kökü (XROrigin) ~40 cm yükseltilir. Oturan anne eserleri ayaktaki biri gibi görür.
- `[Guessing]` **Oturum uzunluğu:** 10–15 dakikalık bloklar, aralarda lobiye dönüş noktası. Kesin süre eşinin eğitim protokolünden gelir.
- **Operasyonel notlar (kod değil, protokol önerisi)** `[Likely]`: Gözlük takılıyken bebek kucakta tutulmamalı; anne yatakta sırtı desteklenmiş ya da sabit bir sandalyede olmalı; kullanıcılar arasında hijyen maskesi ve silme; hemşire Quest'in yansıtma özelliğiyle telefondan izleyebilir. Ayrıntılı taslak §18.4'te.

#### Yatak modu

- Başlangıçta anne bakışını rahat bir noktaya getirir ve tetiğe basar; uygulama o anki baş yönünü (yatay ve dikey açı) "sergi merkezi" olarak kaydeder. Gerekirse hemşire menüsünden yeniden ayarlanır.
- `[Likely]` Müze ortamı yerinde kalır; dünya eğdirilmez (ufkun eğilmesi mide bulantısını tetikler). Eserler, kaydedilen bakış yönünde ~1,8 m uzakta beliren bir sergi panelinde sırayla gösterilir: video, görsel ya da metin.
- Yürüme ve teleport yok. Kontroller: Sonraki / Önceki / Duraklat. İçerik ve sıra rehberli turla aynı (`tourStop`).
- Tavan tasarımı (ışıklık, §8.4) bu mod düşünülerek yapılır: yarı yatan annenin baktığı yer tavanın bir bölümüdür.

#### Hemşire modu

- Gizli menü: lobideki müze logosuna 3 saniye basılı tutup 4 haneli PIN girmek `[Guessing]` (anne yanlışlıkla açmasın diye).
- Seçenekler: kullanım modu (yatak / oturarak / ayakta), sergi merkezini yeniden ayarla, ses seviyesi, altyazı varsayılanı, **Yeni anne** (lobiye dön, tüm ayarları sıfırla).
- `[Guessing]` Pil göstergesi (tarayıcının pil API'si Quest'te destekleniyorsa).
- Kiosk modu olmadığı için (§1.7) anne Meta tuşuyla uygulamadan çıkabilir; hemşire yer iminden tek dokunuşla geri döner. Oturumlar kısa ve eşlikli olduğu için bu kabul edilebilir bir risk.

### 7.4 Okunurluk kuralları

**dmm** (distance-independent millimeter): 1 m uzaklıktaki 1 mm yükseklik. Formül: `dmm = (metin yüksekliği / mesafe) × 1000`.

| İzleme mesafesi | Gövde metni (≥ 35 dmm) | Başlık (≥ 70 dmm) |
|---|---|---|
| 1,5 m | ≥ 5,3 cm | ≥ 10,5 cm |
| 2,0 m | ≥ 7,0 cm | ≥ 14,0 cm |
| 2,5 m | ≥ 8,8 cm | ≥ 17,5 cm |

- `[Likely]` Eşikler, rahat okuma için ~41±14 dmm raporlayan VR çalışmalarına dayanıyor. Troika `fontSize` üzerinden uygulanır ve Faz 0'daki okunurluk test tablosuyla gerçek gözlükte kalibre edilir `[Guessing]`.
- `[Guessing]` **Metin uzunluğu:** Eser etiketi ≤ 40 kelime, oda giriş metni ≤ 80 kelime. Daha uzunu "Devamını oku" ile ~1 m'ye açılan odak panelinde gösterilir (müze etiket pratiğinin VR'a uyarlanmış hali).
- `[Likely]` **Kontrast** ≥ 7:1. Paletteki `murekkep` metin `onsut` zemin üzerinde ~11,6:1 (hesaplandı).
- `[Certain]` **Açı:** 60° ve üzeri döndürülmüş metin, mesafe ve fonttan bağımsız olarak çok daha büyük punto ister (Büttner ve ark., 2020). Paneller izleme noktasına dönük olur; köşe duvarlara metin konmaz.
- `[Likely]` **Yükseklik:** Eser merkezi 1,50 m (müzelerde yaygın 1,45–1,52 m aralığı).

### 7.5 Video davranışı

- `[Certain]` **Tek aktif video.** Meta'nın tarayıcı video dokümanı, yüksek çözünürlüklü oynatmada aynı anda tek video oynatılmasını öneriyor. `VideoManager` bunu merkezi olarak zorlar; yeni bir video başlarsa önceki duraklar.
- **Yaklaşınca oynat:** `approachRadius` içine girince ses yumuşakça açılır ve video başlar; uzaklaşınca duraklar ve kaldığı yeri hatırlar. Oynamayan videolar poster gösterir (çözücü yükü sıfır).
- **Odak modu:** Tetik/tıklama → video ~1,6 m öne, ~1,6 m genişliğe gelir; sahne %30'a kararır; kontroller: oynat/duraklat, −10 sn / +10 sn, altyazı, kapat.
- **Altyazı:** WebVTT yan dosyası, videonun altında 3D metin olarak; açılıp kapanabilir. Altyazısı olmayan videolar için gerekirse ffmpeg ile gömülü sürüm.
- **Konumsal ses:** `PositionalAudio` + medya elementi kaynağı; ses videonun duvarından gelir, uzaklaştıkça azalır.
- `[Certain]` **CORS zorunlu:** Başka bir alan adındaki (R2) video, CORS izni olmadan WebGL dokusu olarak kullanılamaz ve Web Audio'ya sessiz gelir. R2'de CORS kuralı + `<video crossOrigin="anonymous">` şart.
- `[Certain]` YouTube/Vimeo gömmeleri 3D dokuya dönüştürülemez; tüm videolar kendi barındırdığımız MP4 dosyaları olmalı.
- `[Certain]` Quest'te **WebXR Media Layers**, videoyu göz tamponundan geçirmeden doğrudan kompozitöre verir: daha net görüntü, daha az yük. `[Likely]` Katmanlar sahne derinliğiyle doğal biçimde karışmadığı için duvardaki videolar normal doku olarak kalır; katman yalnız odak modunda, ilerleyen iyileştirme olarak denenir (Faz 7).

---

## 8. Görsel tasarım dili

### 8.1 Konsept: "Süt yolu"

> **v3 notu:** Konsept derslik oldu (§8.4). Süt yolu, lobi ve oda planı kalktı; marka paleti (§8.2) ve tipografi (§8.3) metin kartlarında, tahtada ve düğmelerde sürer.

Gün ışığı alan, sakin bir galeri. Zeminde lobiden çıkıp odalara doğru yumuşakça dallanan altın rengi bir yol çizgisi var: süt kanallarının dallanmasına gönderme yapan ama anatomik olarak birebir olmayan bir yön bulma motifi. Rehberli turun durakları bu çizginin üzerinde numaralı disklerle işaretli (içerik gerçekten bir sıra olduğu için numara anlamlı). Cesaret tek yerde harcanır: süt yolu. Geri kalan her şey sessiz ve disiplinli.

**Kaçındığımız varsayılanlar**

- Krem zemin + terrakota vurgu (üretilmiş tasarımların en sık varsayılanı)
- Pembe/mavi "bebek" klişeleri
- Neon, holografik "metaverse" estetiği
- Her yüzeyde cam efektli paneller

### 8.2 Palet

| Token | Hex | Anlamı | Kullanım |
|---|---|---|---|
| `kolostrum` | `#D9A62E` | Kolostrumun altın sarısı | Süt yolu çizgisi, tur diskleri, aktif durumlar (asla metin rengi değil) |
| `onsut` | `#EEF3F6` | Ön sütün hafif mavimsi beyazı | Varsayılan duvar ve tüm metin panellerinin zemini |
| `murekkep` | `#1E3440` | Derin arduvaz mavisi | Tüm metinler (siyah yerine) |
| `adacayi` | `#8FA89A` | Adaçayı yeşili | Beslenme temalı oda duvarları |
| `alacakaranlik` | `#6F6A8A` | Gri-lavanta | Gece emzirmeleri / uyku temalı oda duvarları |
| `mese` | `#B08D64` | Meşe parke | Zemin dokusu yüklenemezse yedek renk |

> ⚠️ `adacayi` ve `alacakaranlik` üzerinde metin kontrastı 7:1'in altında kalıyor (~5,1:1 ve ~4,6:1, hesaplandı). Kural: metin her zaman `onsut` zeminli bir panelin üzerinde durur; renkli duvarlar yalnızca atmosfer içindir.

```ts
// src/design/tokens.ts
export const palette = {
  kolostrum: '#D9A62E',
  onsut: '#EEF3F6',
  murekkep: '#1E3440',
  adacayi: '#8FA89A',
  alacakaranlik: '#6F6A8A',
  mese: '#B08D64',
} as const

export type WallTone = 'onsut' | 'adacayi' | 'alacakaranlik'
```

```css
/* src/design/tokens.css — editor and desktop overlay */
:root {
  --kolostrum: #d9a62e;
  --onsut: #eef3f6;
  --murekkep: #1e3440;
  --adacayi: #8fa89a;
  --alacakaranlik: #6f6a8a;
  --mese: #b08d64;
}
```

### 8.3 Tipografi

- **Tek aile: Atkinson Hyperlegible Next** (400 / 600 / 700). Braille Institute'un düşük görme için tasarladığı, birbirine benzeyen harfleri (I / l / 1, O / 0) belirgin biçimde ayıran bir aile. VR'daki düşük efektif çözünürlükte tam olarak ihtiyaç duyulan özellik bu. `[Likely]` Türkçe glifleri kapsıyor; Faz 0'da `ĞÜŞİÖÇ ğüşıöç` test satırıyla doğrulanacak.
- **3D duvar metni:** drei `<Text>` (troika) + projeye gömülü TTF/WOFF dosyası `[Likely]`.
- **VR menüleri (uikit):** `[Certain]` uikit'in varsayılan fontu Inter; özel font için TTF, FontForge ile üst üste binen yollardan arındırılıp `msdf-bmfont` ile JSON + tek doku dosyasına çevriliyor (uikit tek doku dosyası destekliyor). Karakter seti: temel Latin + `ÇĞİÖŞÜçğıöşü` + rakamlar + `’“”–—…`.
- **Hiyerarşi** ağırlık ve boyutla kurulur; ikinci bir aile yok.

### 8.4 Işık ve malzeme (v3: derslik)

- Gerçekçi Türk üniversite dersliği, 9,6 × 8 m, tavan 3,2 m: kırık beyaz sıva, alt duvarda açık gri koruma boyası ve PVC ray, 60 × 60 asma tavan ve gömme LED paneller, bej benekli seramik zemin (Poly Haven `interior_tiles`, CC0, KTX2).
- Işık pişmiş (vertex rengi), düz ve eşit sınıf aydınlatması; pencere tarafı biraz daha aydınlık, pencerelerden zemine güneş lekesi. Gerçek zamanlı gölge yok.
- Önde tahta (sol) ve tavandan inen perde (sağ) yan yana, tavanda projeksiyon, öğretim üyesi masası, saat; 5 sıra iki kişilik masa, radyatörler, arka duvarda mantar pano. Bütün mobilya tek birleşik mesh (tek draw call).
- Baskılar sade siyah çerçevede, yan ve arka duvarlarda; spot ve ışık havuzu yok.
- `[Guessing]` Çok düşük seviyede oda tonu (ambiyans sesi). VR'da mutlak sessizlik "ölü" hissettiriyor.

### 8.5 Derslik planı (v3)

```
                     ön duvar (kuzey)
   ┌──────────────────────────────────────────────┐
   │ saat   [ tahta 4 m ]     [ perde 3,6 m ]      │
   │   [öğr. masası]                projeksiyon ↑   │
 p │   ▭▭ ▭▭        │        ▭▭ ▭▭                  │
 e │   ▭▭ ▭▭        │        ▭▭ ▭▭  ← başlangıç     │
 n │   ▭▭ ▭▭     koridor     ▭▭ ▭▭   (2. sıra)     │ baskılar
 c │   ▭▭ ▭▭        │        ▭▭ ▭▭                  │
 e │   ▭▭ ▭▭        │        ▭▭ ▭▭                  │
   │ baskı    [ mantar pano ]              kapı    │
   └──────────────────────────────────────────────┘
                     arka duvar (güney)
```

---

## 9. Editör

### 9.1 Yerleşim

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Emzirme Müzesi — Editör       Geri al   İleri al     Kaydedildi 14:32   Gezide aç │
├──────────────────┬───────────────────────────────────────────┬─────────────────┤
│ Odalar           │                                           │ Seçili eser     │
│  Lobi            │                                           │ Tür: Video      │
│  Salon 1         │                                           │ Başlık (TR)     │
│   Doğu duvarı    │              3D görünüm                   │ Genişlik 2,20 m │
│    • Video       │    (yörünge kamera ya da göz hizası)      │ Merkez  1,55 m  │
│   Kuzey duvarı   │                                           │ Yaklaşınca oynat│
│                  │                                           │ Tur durağı  1   │
├──────────────────┤                                           │                 │
│ Medya            │                                           │ Uyarı: etiket   │
│  [poster][poster]│                                           │ 2,1 m'den okun- │
│  [poster][görsel]│                                           │ mayabilir       │
└──────────────────┴───────────────────────────────────────────┴─────────────────┘
```

### 9.2 MVP özellikleri

- Medya kütüphanesinden (manifest'teki küçük resimler) **duvara sürükle-bırak**; ışın duvarı bulur, `u/v` hesaplanır, eser oluşur.
- Duvar düzleminde **kısıtlı taşıma**; en-boy oranı kilitli **yeniden boyutlandırma**.
- **Hizalama:** 5 cm ızgara; 1,50 m göz hizası çizgisine yapışma (±8 cm); komşu eserlerin kenar ve merkezlerine yapışma. Ok tuşları 1 cm, Shift + ok 10 cm.
- Çoğalt, sil, geri al / ileri al (`zundo`, 50 adım).
- **Özellik paneli** şemadan türetilir: yeni bir alan şemaya eklendiğinde panelde de görünür.
- **Kaydet (Cmd+S):** geliştirme sunucusuna POST → Zod doğrulaması → `content/museum.json` yazılır → görüntüleyici sekmesi HMR ile yenilenir. Taslak ayrıca `localStorage`'a otomatik kaydedilir.
- **"Göz hizasından bak":** seçili eserin izleme noktasına birinci şahıs kamerayla geç.
- **Canlı uyarılar** (§9.4).

### 9.3 Kaydetme uç noktası (yalnız geliştirme)

```ts
// vite/museumDevApi.ts
import type { Plugin } from 'vite'
import { writeFile } from 'node:fs/promises'
import { MuseumSchema } from '../src/schema/museum'

export function museumDevApi(): Plugin {
  return {
    name: 'museum-dev-api',
    apply: 'serve', // keeps the write endpoint out of every production build
    configureServer(server) {
      server.middlewares.use('/__api/museum', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        // Concatenate before decoding: Turkish characters are multi-byte and can straddle chunk boundaries.
        const raw = Buffer.concat(chunks).toString('utf8')

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          res.statusCode = 400
          return res.end('invalid json')
        }

        const result = MuseumSchema.safeParse(parsed)
        if (!result.success) {
          // Reject before touching disk so a half-broken editor state can never overwrite the source of truth.
          res.statusCode = 422
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(result.error.flatten()))
        }

        // Zod rebuilds objects in schema order, which keeps git diffs of museum.json small and readable.
        await writeFile('content/museum.json', JSON.stringify(result.data, null, 2) + '\n')
        res.setHeader('Content-Type', 'application/json')
        res.end('{"ok":true}')
      })
    },
  }
}
```

Medya yükleme için ikinci uç nokta (`/__api/media`) dosyayı `content/media/raw/` altına yazar; kodlama `npm run media:build` ile yapılır.

### 9.4 Canlı uyarılar

| Uyarı | Kural |
|---|---|
| Okunurluk | Metnin izleme noktasındaki açısal boyutu < §7.4 eşiği |
| Uzun metin | Etiket > 40 kelime, oda metni > 80 kelime |
| Eksik varlık | Videoda poster yok; altyazı yok (bilgi düzeyinde) |
| Büyük dosya | Video > 250 MB ya da bit hızı > 8 Mbit/s `[Guessing]` |
| Çakışma | Aynı duvardaki iki eserin dikdörtgenleri kesişiyor |
| Kapı | Eser kapı boşluğuna taşıyor (hata, kaydetmeyi engeller) |
| Tur | `tourStop` sırasında boşluk ya da tekrar |

### 9.5 Faz 4b — Oda editörü

Üstten 2D ızgara görünümü: oda ekle/boyutlandır (0,5 m adım), duvara kapı yerleştir, duvar tonunu seç, oda adını gir. Oda silinince içindeki eserler "yerleşmemiş" listesine düşer; kaybolmaz.

---

## 10. Medya hattı

### 10.1 Envanter (`content/inventory.csv`)

```csv
dosya,tur,sure_sn,cozunurluk,boyut_mb,dil,altyazi,kaynak_telif,kisi_onayi,hedef_oda,not
emzirme-pozisyonlari.mov,video,184,1920x1080,412,tr,yok,kendi-cekimimiz,var,salon-1,
```

`kaynak_telif` ve `kisi_onayi` sütunları boş geçilemez: web'de yayınlanacak her görüntünün hakkı ve görüntüdeki kişilerin onayı belli olmalı.

### 10.2 Video kodlama kuralları

- `[Certain]` Tüm Quest cihazlarında donanımsal video çözme var; H.264 her cihazda ve her masaüstü tarayıcıda çalışıyor. AV1, Quest 2 ve Pro'da donanımla çözülmüyor → **tek format: H.264 + AAC, MP4**.
- En fazla 1920 px genişlik (büyütme yapılmaz), kaynak kare hızı korunur, 2 saniyede bir anahtar kare, `+faststart` (oynatma dosyanın tamamı inmeden başlar).

```bash
ffmpeg -i "$IN" \
  -c:v libx264 -profile:v high -preset slow -crf 22 \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p \
  -force_key_frames "expr:gte(t,n_forced*2)" \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart "$OUT"

# poster from the 3rd second; the editor can pick another frame later
ffmpeg -ss 3 -i "$OUT" -frames:v 1 -vf "scale='min(1280,iw)':-2" -q:v 3 "$POSTER"
```

### 10.3 Görseller

- Uzun kenar en fazla 2048 px.
- `[Likely]` KTX2 sıkıştırma (fotoğraflar için ETC1S, yazı içeren infografikler için UASTC): GPU belleği birkaç kat azalır. 30 adet 2K görsel sıkıştırmasız GPU'da yüzlerce MB tutar; Quest'te bu, çökme ya da kare kaybı demek.

### 10.4 İsimlendirme ve önbellek

- Çıktı adı: `<slug>.<hash8>.<ext>` → dosya değişirse adı değişir; `Cache-Control: public, max-age=31536000, immutable` güvenle kullanılır.
- `content/media/manifest.json` (git'te): orijinal dosya → çıktı anahtarları, süre, en/boy, boyut. Medyanın kendisi git'e girmez.

### 10.5 R2 kurulumu

1. Cloudflare panelinde R2 bucket oluştur (ör. `emzirme-muzesi-media`).
2. Bucket'a özel alan adı bağla (`medya.<alan-adı>`). `[Likely]` `r2.dev` alt alan adı hız sınırlı ve üretim için önerilmiyor.
3. CORS kuralı (panelde bucket → Settings → CORS):

```json
[
  {
    "AllowedOrigins": ["https://muze.<alan-adı>", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 86400
  }
]
```

4. `rclone` ile R2'yi S3 uyumlu uzak depo olarak tanımla; `npm run media:upload` = `content/media/dist` → bucket senkronu.

**Bütçe örneği** `[Guessing]`: 20 video × 3 dk × ~4 Mbit/s ≈ 1,8 GB. `[Certain]` R2'nin ücretsiz katmanı aylık 10 GB depolama içeriyor ve dışarı veri çıkışı ücretsiz.

---

## 11. Performans bütçesi

| Metrik | Hedef | Ölçüm |
|---|---|---|
| Kare hızı | 72 fps sabit (Quest 3'te 90 denenir) `[Likely]` | OVR Metrics Tool HUD |
| Draw call | Oda başına < 100 `[Guessing]` | `renderer.info`, Spector.js |
| Görünen üçgen | < 300 bin `[Guessing]` | `renderer.info` |
| Doku belleği | Toplam < 256 MB; komşu olmayan odaların dokuları boşaltılır `[Guessing]` | Chrome DevTools (uzaktan) |
| Eş zamanlı video | 1 `[Certain]` | `VideoManager` |
| Lobiye ilk yükleme | < 8 sn, hastane Wi-Fi'ında `[Guessing]` | Ağ kısıtlama testi + sahada ölçüm |

**Teknikler:** Oda başına statik duvar geometrisi tek meshte birleştirilir; çerçeveler instancing ile çizilir; gerçek zamanlı gölge yok; sabit foveated rendering (three.js `WebXRManager.setFoveation`) `[Likely]`; odalar tembel yüklenir (bulunulan oda + komşular); oda boşaltılınca doku ve geometri `dispose` edilir; tüm metinler aynı font örneğini paylaşır.

---

## 12. Barındırma ve dağıtım

**Öneri:** Cloudflare Pages (statik site) + Cloudflare R2 (medya), aynı hesap, kendi alan adın altında iki alt alan adı.

**Neden ev sunucusu değil** (Docker + Cloudflare Tunnel düzenin başka projelerde doğru, burada değil):

1. `[Certain]` Video trafiği Tunnel üzerinden Cloudflare şartlarına takılıyor (§1.4).
2. `[Likely]` Ev elektriği veya interneti kesildiğinde, o sırada hastanede müzeyi kullanan annelerin oturumu da kesilir. Statik site sunucu gerektirmez; tek arıza noktasını ortadan kaldır.
3. `[Likely]` Cloudflare Pages'te tek dosya sınırı 25 MiB; videolar zaten Pages'e konamaz, R2 şart.

**Neden MVP'de Supabase yok:** Veritabanı gerektiren bir şey yok (içerik bir JSON dosyası). `[Likely]` Supabase'in ücretsiz projeleri bir hafta hareketsizlikte duraklatılıyor; düşük trafikli bir hastane aracında bu, "bir sabah müze açılmıyor" riski demek.

**Erişim seçenekleri:**

| Seçenek | Koruma | Gözlükte kolaylık |
|---|---|---|
| Herkese açık | Yok | En kolay |
| Listelenmemiş link + `noindex` + erişim kodu (varsayılan) | Caydırıcı; R2 adresleri bilen erişebilir | Kolay (4–6 haneli kod) |
| Cloudflare Access (e-posta tek kullanımlık kod) | Gerçek koruma `[Likely]` | Gözlükte e-posta kodu yazmak zahmetli |

---

## 13. Klasör yapısı

```
emzirme-muzesi/
├── CLAUDE.md
├── README.md
├── PLAN.md                         # bu dosya
├── content/
│   ├── museum.json                 # tek gerçek kaynak (git)
│   ├── inventory.csv               # medya envanteri (git)
│   └── media/
│       ├── manifest.json           # anahtar → çıktı eşlemesi (git)
│       ├── raw/                    # orijinaller (gitignore)
│       └── dist/                   # kodlanmış, hash'li çıktılar (gitignore)
├── docs/
│   ├── decisions/0001-stack.md
│   ├── device-log.md               # her gözlük kapısının notları
│   └── perf.md
├── public/
│   ├── fonts/                      # Atkinson Hyperlegible Next TTF + MSDF (uikit)
│   ├── textures/                   # *.ktx2
│   ├── manifest.webmanifest        # Faz 9
│   └── .well-known/assetlinks.json # Faz 9
├── scripts/
│   ├── media-build.ts
│   ├── media-upload.ts
│   └── validate-content.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── schema/                     # museum.ts, media.ts
│   ├── store/                      # museumStore.ts, editorStore.ts, settingsStore.ts
│   ├── scene/                      # Museum.tsx, Room.tsx, wallFrame.ts, WallBuilder.ts, Lighting.tsx, Wayfinding.tsx, props/
│   ├── exhibits/                   # VideoExhibit.tsx, ImageExhibit.tsx, TextPanel.tsx, Label.tsx, FocusPanel.tsx
│   ├── media/                      # VideoManager.ts, useVideoElement.ts, subtitles.ts, mediaUrl.ts
│   ├── locomotion/                 # DesktopControls.tsx, ClickToWalk.tsx, collision.ts, XRLocomotion.tsx, seatedMode.ts, bedMode.ts
│   ├── xr/                         # xrStore.ts, EnterVRButton.tsx, layers/MediaLayer.ts
│   ├── tour/                       # tour.ts, TourRunner.tsx
│   ├── ui/                         # desktop/ (HelpOverlay, RoomNav) + vr/ (Lobby, TourControls, Settings, NurseMenu)
│   ├── editor/                     # EditorApp.tsx, Viewport.tsx, MediaLibrary.tsx, Inspector.tsx, gizmos/, snapping.ts, warnings.ts, api.ts
│   ├── design/                     # tokens.ts, tokens.css, typography.ts, materials.ts
│   └── i18n/                       # tr.ts, en.ts
├── vite/
│   └── museumDevApi.ts
└── tests/
    ├── schema.test.ts
    ├── wallFrame.test.ts
    ├── snapping.test.ts
    └── e2e/smoke.spec.ts
```

---

## 14. Faz planı (Claude Code)

> 🔁 Her faz aynı döngüyle kapanır: Claude Code görevleri uygular → `npm run typecheck && npm run test && npm run build` yeşil → Kutluhan gözlük kapısını yapar, notları `docs/device-log.md`'ye yazar → commit'i Kutluhan atar.

> 🏥 **Onay kilometre taşı (Faz 3 sonu):** Gerçek içerikli 2 oda, geçici bir önizleme adresi (Cloudflare Pages önizlemesi) ve gözlükten 2 dakikalık ekran kaydı. `[Likely]` Müze web tabanlı olduğu için hastane yönetimi onu tek bir gözlük satın alınmadan dizüstü bilgisayarda ya da telefonda gezebilir; onay dosyası için en güçlü malzeme bu.

### Faz 0 — İskelet ve cihaz spike'ı (1–2 gün)

**Amaç:** Yığının Quest'te gerçekten çalıştığını ilk gün kanıtlamak.

**Görevler**
- Vite + React + TS iskeleti, strict `tsconfig`, ESLint + Prettier, `CLAUDE.md` (§21), `.gitignore` (`content/media/raw`, `content/media/dist`).
- R3F + drei + `@react-three/xr`; `src/xr/xrStore.ts`.
- Tek oda (zemin, 4 duvar, tavan) + tek yerel MP4 + tek metin paneli (Türkçe test satırı) + okunurluk test tablosu (2 m uzakta 30 / 40 / 50 / 70 dmm satırları).
- Masaüstü: pointer lock + WASD. VR: teleport + 45° anlık dönüş.
- Cihaz kurulumu (§16) ve `docs/decisions/0001-stack.md`.

```ts
// src/xr/xrStore.ts
import { createXRStore } from '@react-three/xr'

// Teleport is the comfort default for seated postpartum users; smooth locomotion stays opt-in.
export const xrStore = createXRStore({
  controller: { teleportPointer: true },
  hand: { teleportPointer: true },
})
```

`[Likely]` Bu, v6 API'sinin teleport kullanımı; Faz 0'da resmi "Teleport" eğitimiyle doğrulanır (sürüm farkı varsa kod ona uyarlanır).

**Kabul**
- [ ] Masaüstü Chrome ve Safari'de oda görünür, WASD ile gezilir.
- [ ] Quest Browser'da VR'a girilir; teleport ve anlık dönüş çalışır. Masaüstünde IWER emülatörüyle de denenir.
- [ ] `ĞÜŞİÖÇ ğüşıöç` hem troika hem uikit'te doğru görünür.
- [ ] 1080p video sesiyle oynar; OVR Metrics'te ≥ 72 fps.
- [ ] 2 m'den rahat okunan en küçük dmm satırı not edildi; §7.4 eşikleri güncellendi.
- [ ] Karar kaydı yazıldı: R3F ile devam mı, IWSDK'ya geçiş mi.

🥽 **Gözlük kapısı:** 5 dakikalık gezinti; baş dönmesi, okunurluk, ses. Mümkünse eşin de dener.

### Faz 1 — İçerik envanteri ve medya hattı (1–2 gün)

**Görevler**
- `content/inventory.csv`'yi eşinle tek oturumda doldur (§10.1).
- `scripts/media-build.ts`: `ffprobe` ile meta veri, ffmpeg kodlama (§10.2), poster, hash'li ad, KTX2 görseller, `content/media/manifest.json`.
- R2 bucket + özel alan adı + CORS (§10.5); `scripts/media-upload.ts` (rclone).
- `src/media/mediaUrl.ts`: manifest anahtarını `VITE_MEDIA_BASE_URL` ile tam adrese çevirir.
- **Çevrimdışı spike (yarım gün):** tek video + servis worker önbelleği; Quest'te uçak modunda oynatma denemesi; sonuç `docs/decisions/0002-offline.md`.

**Kabul**
- [ ] Tüm videolar H.264 / AAC / faststart; her birinin posteri var.
- [ ] `manifest.json` git'te, medya dosyaları git dışında.
- [ ] Masaüstünde R2'den oynatılan video konsolda CORS ya da "tainted canvas" hatası vermiyor; konumsal ses duyuluyor.
- [ ] Toplam boyut ve en büyük 5 dosyanın raporu çıkıyor.
- [ ] Çevrimdışı spike sonucu yazılı: Faz 10 servis worker ile mi, native görüntüleyiciyle mi yapılacak?

### Faz 2 — Şema ve prosedürel müze (2–3 gün)

**Görevler**
- Zod şeması + çapraz referans kuralları (§6.2); `scripts/validate-content.ts` (`npm run validate`).
- `wallFrame.ts` + `WallBuilder.ts`: kapı boşluklarına göre duvar segmentleri, kapı kasası, oda başına geometri birleştirme.
- `Room.tsx`, `Museum.tsx`; eserlerin temel çizimi (poster, görsel, metin paneli).
- Tembel oda yükleme (bulunulan oda + komşular); `museum.json` değişince HMR.

**Kabul**
- [ ] Örnek `museum.json` (lobi + 3 oda) doğru çiziliyor; kapılar iki taraftan da açık.
- [ ] Geçersiz JSON, hangi alanın neden hatalı olduğunu söyleyen bir mesajla build'i durduruyor.
- [ ] `wallFrame` ve segmentasyon birim testleri: 4 duvar yönü, kenardaki kapı, aynı duvarda iki kapı.
- [ ] Oda başına draw call < 100.

### Faz 3 — Gezinme, etkileşim, video davranışı (3 gün)

**Görevler**
- `DesktopControls` + `ClickToWalk`.
- `collision.ts`: oda dikdörtgenleri ve kapı boşluklarından 2D duvar segmentleri, 0,3 m yarıçaplı oyuncu, duvar boyunca kayma. Fizik motoru yok.
- XR teleport (yalnız zemin; duvara 0,4 m'den yakın hedef yok), anlık dönüş, oturma modu.
- `VideoManager`, yaklaşınca oynat, `FocusPanel`, WebVTT altyazı, konumsal ses.

```ts
// src/media/VideoManager.ts
// Quest Browser handles one high-resolution decode comfortably; a second concurrent
// stream is what drops frames, so every play request goes through this arbiter.
class VideoManager {
  private active: HTMLVideoElement | null = null

  async play(el: HTMLVideoElement) {
    if (this.active && this.active !== el) this.active.pause()
    this.active = el
    await el.play()
  }

  pause(el: HTMLVideoElement) {
    el.pause()
    if (this.active === el) this.active = null
  }
}

export const videoManager = new VideoManager()
```

**Kabul**
- [ ] Hiçbir modda duvardan geçilemiyor.
- [ ] Aynı anda iki video asla oynamıyor (birim test + elle deneme).
- [ ] Uzaklaşınca video duruyor, geri dönünce kaldığı yerden devam ediyor.
- [ ] Odak modu masaüstünde Esc, VR'da B/Y ya da "Kapat" ile kapanıyor; altyazı açılıp kapanıyor.

🥽 **Gözlük kapısı** (§16.3).

### Faz 4 — Editör MVP (3–5 gün) + Faz 4b — Oda editörü (2 gün)

**Görevler**
- `vite/museumDevApi.ts` (§9.3) + `/__api/media` uç noktası.
- `EditorApp` yerleşimi (§9.1), `MediaLibrary`, duvara sürükle-bırak, kısıtlı taşıma, boyutlandırma, `snapping.ts`.
- Şemadan türetilen `Inspector`, `zundo` ile geri al/ileri al, Cmd+S, `warnings.ts` (§9.4), "göz hizasından bak".
- 4b: §9.5.

**Kabul**
- [ ] Bir videoyu 30 saniyede duvara asıp kaydedebiliyorsun.
- [ ] Kaydedilen JSON Zod'dan geçiyor; git diff'i yalnız değişen eseri gösteriyor.
- [ ] Geri al 50 adım; sayfa yenilenince taslak kurtarılıyor.
- [ ] Okunurluk uyarısı doğru mesafede tetikleniyor (birim test).
- [ ] Production paketinde editör kodu yok (bundle analizinde `editor/` görünmüyor).
- [ ] (4b) Yeni oda ekleyip kapı açınca görüntüleyicide yürüyerek girilebiliyor.

### Faz 5 — Görsel dil ve atmosfer (2–3 gün)

**Görevler**
- `tokens.ts` / `tokens.css`, `typography.ts` (font yükleme, MSDF), `materials.ts` (KTX2), ışık önayarı.
- `Wayfinding.tsx`: süt yolu çizgisi odalardan ve kapılardan otomatik üretilir; tur diskleri.
- Lobi tasarımı, aksesuarlar, ambiyans sesi, masaüstü üst katmanı, yükleme ekranı.

**Kabul**
- [ ] Gözlükte 5 dakikalık gezide §11 bütçesi korunuyor.
- [ ] Tüm metin panelleri ≥ 7:1 kontrast.
- [ ] Eşin lobide 10 saniye içinde ne yapacağını anlıyor (gözlem testi).

### Faz 6 — Rehberli tur, yatak modu, hemşire modu, erişilebilirlik (3 gün)

**Görevler**
- `tour.ts`: `tourStop` sırası; izleme noktası = eserin 1,8 m önü, esere dönük.
- `TourRunner`: kararma → ışınlanma → otomatik oynatma; Sonraki / Önceki.
- `bedMode.ts` (§7.3): sergi merkezini kaydetme, bakış yönünde sergi paneli, Sonraki / Önceki / Duraklat.
- `NurseMenu` (§7.3): gizli menü + PIN, mod seçimi, sergi merkezini yeniden ayarlama, **Yeni anne** sıfırlaması.
- Ayarlar: metin boyutu +%25, sürekli kayma aç/kapa, altyazı varsayılanı, baskın el; yeniden merkezleme yardımı; i18n altyapısı.

**Kabul**
- [ ] Tur baştan sona yalnız A/X tuşuyla tamamlanıyor.
- [ ] Yarı yatar pozisyonda (sırt ~45°) yatak modundaki tüm eserler boyun zorlanmadan izlenebiliyor (eşinle test).
- [ ] Oturma modunda eser merkezleri göz hizasında.
- [ ] "Yeni anne" sonrası uygulama ilk açılış durumuyla birebir aynı.
- [ ] Ayarlar oturum boyunca korunuyor (`localStorage`, `try/catch` ile).

### Faz 7 — Performans ve WebXR katmanları (2 gün)

**Görevler**
- OVR Metrics + uzaktan DevTools profili; statik geometri birleştirme; foveation; framebuffer ölçeği; doku bütçesi.
- Odak modu için media layer denemesi (`src/xr/layers/MediaLayer.ts`); desteklenmiyorsa sessizce normal dokuya düşer.
- Quest 2 testi (cihaz varsa).

**Kabul**
- [ ] §11 hedefleri en ağır odada tutuyor; `docs/perf.md`'de ölçüm tablosu var.
- [ ] Media layer ya netlik farkı belgelenerek açık, ya da gerekçesiyle kapalı.

### Faz 8 — Yayın (1 gün)

**Görevler**
- Cloudflare Pages projesi, özel alan adı, `VITE_MEDIA_BASE_URL`, `_headers` (önbellek kuralları), `noindex`, opsiyonel erişim kodu ekranı, 404.
- Hastane ağında deneme: captive portal, engellenen alan adları, gerçek açılış süresi.

**Kabul**
- [ ] Quest Browser'da canlı adresle müze açılıyor ve yer imine ekleniyor.
- [ ] Soğuk açılış süresi ölçüldü (evde ve mümkünse hastanede).

### Faz 9 — APK: PWA/TWA (1–2 gün)

**Görevler:** §17.

**Kabul**
- [ ] APK, Kitaplık → Bilinmeyen Kaynaklar'da görünüyor; açılınca müze başlıyor (immersive ya da 2D + "Müzeye gir").
- [ ] İmza anahtarı ve parolaları iki ayrı yerde yedekli.

### Opsiyonel modüller

**Faz 10 — Çevrimdışı mod (2–3 gün; hastane ağına göre büyük olasılıkla gerekli).** `vite-plugin-pwa` / Workbox ile uygulama kabuğu önbelleği; lobide "Çevrimdışı hazırla" butonu tüm medyayı ilerleme çubuğuyla indirir; video için Range istekleri eklentisi; `navigator.storage.persist()`. Kabul: uçak modunda tam tur. Başarısızsa native görüntüleyici kararı (§3.3). `[Guessing]` Quest Browser'ın depolama kotası ve silme davranışı Faz 1 spike'ında ölçülür.

**Faz 11 — Araştırma veri kaydı: kapsam dışı.** 21 Eylül 2026 kararı: müze yalnız eğitim amaçlı ve uygulama hiçbir kullanım verisi toplamıyor. İleride bir çalışma planlanırsa bu faz v1'deki tasarımla (takma adlı katılımcı kodu, Cloudflare Worker + D1) geri eklenebilir.

**Faz 12 — Online editör (3–4 gün).** Editörün yayına taşınması, Cloudflare Access ile giriş, JSON'un sürüm geçmişiyle R2/D1'de saklanması — eşin içeriği kendisi düzenleyebilsin diye.

---

## 15. Ajan sistemi (9 ajan)

| # | Ajan | Sahip olduğu dosyalar | Kabul kriteri |
|---|---|---|---|
| 1 | Altyapı | `package.json`, `vite.config.ts`, `tsconfig*`, ESLint/Prettier, `CLAUDE.md`, `README.md`, `.gitignore` | `npm i && npm run dev` tek seferde çalışır; typecheck/test/build script'leri hazır |
| 2 | İçerik ve Şema | `src/schema/`, `src/store/museumStore.ts`, `content/museum.json`, `scripts/validate-content.ts`, `src/i18n/`, `tests/schema.test.ts` | Tüm çapraz referans kuralları testli; şema değişikliği `version` + migrasyon ister |
| 3 | Medya Hattı | `scripts/media-*.ts`, `content/inventory.csv`, `content/media/manifest.json`, `src/media/mediaUrl.ts` | Aynı girdi → aynı hash; CORS doğrulanmış |
| 4 | Sahne ve Mimari | `src/scene/`, `tests/wallFrame.test.ts` | Duvar/kapı matematiği testli; oda başına draw call bütçesi korunuyor |
| 5 | Eser ve Oynatma | `src/exhibits/`, `src/media/VideoManager.ts`, `src/media/useVideoElement.ts`, `src/media/subtitles.ts` | Tek-video kuralı testli; odak modu ve altyazı çalışıyor |
| 6 | Gezinme ve XR | `src/locomotion/`, `src/xr/`, `src/tour/`, `src/store/settingsStore.ts` | Duvardan geçilmiyor; teleport kuralları; tur yalnız A/X ile bitiyor |
| 7 | Editör | `src/editor/`, `src/store/editorStore.ts`, `vite/museumDevApi.ts`, `tests/snapping.test.ts` | 30 saniyede eser asma; production paketinde editör yok |
| 8 | Tasarım ve Arayüz | `src/design/`, `src/ui/`, `public/fonts/`, `public/textures/` | Kontrast ve okunurluk kuralları; palet dışı renk yok |
| 9 | QA, Performans ve Dağıtım | `tests/e2e/`, `docs/perf.md`, `docs/device-log.md`, `public/manifest.webmanifest`, `public/.well-known/`, Bubblewrap yapılandırması, `_headers` | §11 ölçümleri belgeli; APK açılıyor; deploy adımları yazılı |

Kural: Bir ajan, sahibi olmadığı bir dosyada değişiklik gerektiğini görürse değişikliği gerekçesiyle önerir; doğrudan uygulamaz.

---

## 16. Cihaz test protokolü (adım adım)

### 16.1 Bir kerelik kurulum

1. developers.meta.com/horizon adresinde Meta hesabınla giriş yap ve ücretsiz bir **geliştirici organizasyonu** oluştur. `[Certain]` Geliştirici modunu açmak için bir organizasyona üye olmak gerekiyor.
2. Telefonda Meta Horizon uygulaması → Cihazlar → gözlüğünü seç → Geliştirici modu → Aç. Gözlüğü yeniden başlat. `[Certain]` Geliştirici modu yardımcı mobil uygulamadan açılıyor (menü adları uygulama sürümüne göre değişebilir).
3. Mac'te: `brew install --cask android-platform-tools`
4. Gözlüğü USB-C kabloyla Mac'e bağla. Gözlükte "USB hata ayıklamaya izin ver" sorusu çıkar → "Bu bilgisayara her zaman izin ver" + Tamam.
5. Kontrol: `adb devices` → seri numarası yanında `device` yazmalı. `unauthorized` görürsen 4. adımı tekrarla.

### 16.2 Her test oturumu

1. `npm run dev` (Vite, 5173 portu).
2. `adb reverse tcp:5173 tcp:5173`
3. Gözlükte Quest Browser → `http://localhost:5173`. `[Likely]` localhost güvenli bağlam sayıldığı için WebXR sertifika uğraşı olmadan çalışır.
4. Uzaktan hata ayıklama: Mac'te Chrome → `chrome://inspect/#devices` → Quest Browser sekmesinin altındaki "inspect". Konsol ve performans paneli gözlükteki sayfayı gösterir. `[Certain]`
5. Performans: gözlüğe OVR Metrics Tool'u kur, FPS/GPU katmanını aç. `[Likely]`
6. Yansıtma: Meta Horizon uygulaması → Yansıt → telefon; ya da Meta Quest Developer Hub ile Mac'e yansıt ve kaydet.
7. Kablosuz (opsiyonel): USB bağlıyken `adb tcpip 5555` → kabloyu çıkar → `adb connect <gözlük-ip>:5555` → 2. adımı tekrarla.

### 16.3 Gözlük kapısı kontrol listesi (her faz)

- [ ] En kalabalık odada 2 dakika boyunca FPS katmanında 72'nin altına düşüş yok.
- [ ] 2 m'den tüm etiketler okunuyor.
- [ ] 5 dakika sonra baş dönmesi ya da göz yorgunluğu yok.
- [ ] Ses doğru yönden geliyor, uzaklaşınca azalıyor.
- [ ] Kontrolcü ve el takibiyle etkileşim çalışıyor.
- [ ] Notlar tarihle `docs/device-log.md`'ye yazıldı.

---

## 17. APK paketleme (Faz 9, adım adım)

1. `[Certain]` Site canlı ve HTTPS'li olmalı (Faz 8 tamamlanmış olmalı).
2. `public/manifest.webmanifest`: `name`, `short_name`, `start_url: "/?source=pwa"`, `display: "standalone"`, `background_color` ve `theme_color` (`onsut`), 192 ve 512 px ikonlar (+ maskable).
3. `[Certain]` PWA olarak açıldığı algılanınca sayfa yüklenir yüklenmez VR oturumu istenir (Meta dokümanındaki örnek bu algılamayı yapıyor). `@react-three/xr`'da karşılığı `xrStore.enterVR()`.
4. Meta'nın "Package a PWA for Meta Quest" dokümanını izleyerek Meta'nın Bubblewrap fork'unu kur (github.com/meta-quest/bubblewrap). `[Certain]` İlk çalıştırmada uygun JDK ve Android komut satırı araçlarını indirmesine izin ver.
5. Başlatma sorularında: hedef Meta Quest, uygulama modu **immersive**, Horizon Billing **hayır**, imza anahtarı **yeni oluştur**.
6. `[Certain]` Keystore dosyasını, takma adı ve parolaları iki güvenli yerde sakla: sonraki her güncelleme aynı anahtarla imzalanmak zorunda.
7. Anahtarın SHA-256 parmak izini `public/.well-known/assetlinks.json`'a yaz ve deploy et. `https://muze.<alan-adı>/.well-known/assetlinks.json` adresinin tarayıcıda açıldığını kontrol et.
8. Build → `adb install app-release-signed.apk` → gözlükte Kitaplık → Bilinmeyen Kaynaklar → uygulamayı aç.
9. Boş ekranda kalırsa (bilinen Quest 2 sorunu, §3.4): uygulama modunu **2D** yapıp yeniden paketle; 2D paneldeki "Müzeye gir" butonu VR'a geçirir.
10. (Opsiyonel) Horizon Store release channel ile test kullanıcılarına dağıtım. `[Certain]` Bu yolda VRC gereksinimleri (ör. açılış süresi) geçerli olur. Türkiye resmi Quest ülkesi olmadığından bu yol pratik değil `[Likely]`; yan yükleme yeterli.

> ⚠️ APK internet ister. Çevrimdışı kullanım gerekiyorsa Faz 10.

---

## 18. Uyum, etik ve hastane dağıtımı

### 18.1 Kontrol listesi

- [ ] **İçerik hakları:** Her videonun kaynağı ve lisansı `inventory.csv`'de. Üçüncü taraf videolar (kurumlar, YouTube kanalları) için yayın izni alınmış.
- [ ] **Kişi onayı:** Görüntüde tanınabilir anne veya bebek varsa web'de yayına onay var. Onay yalnız çalışma içi kullanımı kapsıyorsa erişim kodu ya da Cloudflare Access şart.
- [ ] **KVKK (6698 sayılı Kanun)** `[Likely]`: Uygulama kişisel veri toplamaz, saklamaz, göndermez; analitik ve üçüncü taraf izleyici yok. Hastane bilgi işlemine yazılı olarak böyle beyan edilebilir. Barındırma sağlayıcısının standart sunucu kayıtları ayrı bir konu; gerekirse bilgi işlemle netleştirilir.
- [ ] **Kurum onayları** `[Guessing]`: Yalnız eğitim amaçlı kullanımda araştırma etik kurulu gerekmeyebilir; ama hastane içi onaylar gerekir: yönetim (satın alma), enfeksiyon kontrol komitesi (ortak kullanılan gözlükler), bilgi işlem (ağ ve cihaz). Makaledeki Spatial müzesiyle yeni sürüm birebir aynı değil; ileride bir yayında anılırsa farklar belgelenmeli.
- [ ] **Erişilebilirlik:** Altyazı, ≥ 7:1 kontrast, oturma modu, metin boyutu ayarı.
- [ ] **Mağaza (yalnız yayımlanırsa):** Horizon Store VRC'leri. `[Guessing]` Emzirme görüntülerinin mağaza içerik incelemesinde nasıl değerlendirileceği belirsiz; tarayıcı ya da yan yükleme yolu bu riski ortadan kaldırır.
- [ ] **Hijyen ve güvenlik prosedürü:** §18.4 taslağı, enfeksiyon kontrol komitesinin onayıyla.
- [ ] **Garanti ve servis** `[Likely]`: Türkiye resmi Quest ülkesi olmadığı için garanti satıcıdan gelir. Satın alma şartnamesine yerel garanti, yedek cihaz, yedek yüz arayüzü ve kontrolcü yazılmalı.

### 18.2 Gözlük satın alma önerisi

| Model | Durum | Artı | Eksi | Öneri |
|---|---|---|---|---|
| **Quest 3S (128 GB)** | Güncel model; `[Certain]` Nisan 2026 zammıyla 349,99 $ | Quest 3 ile aynı işlemci (XR2 Gen 2) ve 8 GB RAM; pil ~2,5 saat `[Likely]` | `[Certain]` Fresnel lens, göz başına 1832×1920 (Quest 2 ile aynı çözünürlük) → metin daha az net | **Filo için varsayılan** |
| **Quest 3 (512 GB)** | Güncel model; `[Certain]` 599,99 $ | `[Certain]` Pancake lens, göz başına 2064×2208 → belirgin biçimde daha net metin `[Likely]` | Daha pahalı; pil ~2,2 saat `[Likely]` | Bütçe varsa; en azından geliştirme için 1 adet |
| **Quest 2** | `[Likely]` Yeni olarak satılmıyor; özellik güncellemeleri Aralık 2026'da, güvenlik güncellemeleri Aralık 2027'de bitiyor | Elde varsa test cihazı | Bilinen WebXR kontrolcü sorunu; `[Certain]` Meta'nın kurumsal yönetimi yalnız Quest 3/3S için | **Satın alınmamalı** |

- `[Likely]` 23–24 Eylül 2026'daki Connect'te satın alınabilir yeni bir Quest beklenmiyor; yeni oyun odaklı Quest 2027'nin ikinci yarısına işaret ediliyor. Beklemeye değmez.
- `[Certain]` Örnek veri noktası: Haziran 2026'da MediaMarkt Türkiye'de bir pazar yeri satıcısı Quest 3S 128 GB'yi 3 × 8.333 TL taksitle listeliyordu. Kur ve ithalat nedeniyle fiyatlar dolar fiyatının belirgin üstünde; satın alma öncesi güncel teklif alınmalı.
- Geliştirme ve test, hedef filonun en zayıf cihazında (Quest 3S) yapılır; §7.4 okunurluk eşikleri o cihazda kalibre edilir.

### 18.3 Hastane bilgi işlemine sorulacaklar

1. Gözlükler (Android tabanlı, Wi-Fi 6E destekli) hastane ağına bağlanabilir mi? Hangi ağ: misafir/hasta ağı mı, kurumsal ağ mı?
2. Misafir ağında giriş sayfası (captive portal) var mı? Oturum kaç saatte bir düşüyor?
3. `muze.<alan-adı>` ve `medya.<alan-adı>` adreslerine erişim ve video akışı (MP4, cihaz başına ~4 Mbit/s) engelleniyor mu?
4. Aynı anda kaç cihaz bağlanabilir; cihaz başına bant genişliği sınırı var mı?
5. Cihazların hastane envanterine kaydı nasıl olacak; geliştirici modu açık bir cihaz güvenlik politikasına uygun mu?
6. Wi-Fi mümkün değilse, müzenin gözlüğe indirilip ağsız çalışması (Faz 10) tercih edilir mi?

### 18.4 Hemşire için kullanım prosedürü (taslak)

`[Guessing]` Bu bir başlangıç taslağı; son hâlini eşinin ekibi ve enfeksiyon kontrol komitesi verir.

1. **Vardiya başı:** Gözlükler şarjda; pil en az %50. Yer imi ve müze açılışı bir kez denenir.
2. **Hijyen:** Her anne için tek kullanımlık hijyen maskesi; kullanım sonrası üreticinin önerdiği şekilde silme; komitenin onayladığı temizlik yöntemi.
3. **Hazırlık:** Anne yatakta sırtı desteklenmiş ya da sabit bir sandalyede; bebek bu sırada kucakta değil (bebek yatağında ya da bir yakınında).
4. **Kurulum (hemşire takar):** Güvenlik sınırını "sabit" (stationary) moda al; sistem ekranları İngilizce. Müze yer imini aç → "Müzeye gir" → hemşire menüsünden modu seç. `[Likely]` Oda çok karanlıksa gözlüğün konum takibi bozulur; loş ışık yeterli.
5. **Başlangıç:** Gözlüğü anneye tak, kontrolcüleri ver, ilk dakikada yanında kal; yatak modunda sergi merkezini birlikte ayarlayın.
6. **Gözetim (isteğe bağlı):** Yansıtma ile telefondan izle.
7. **Bitiş:** Hemşire menüsü → **Yeni anne**; gözlüğü temizle, şarja koy.

---

## 19. Riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Quest 2 tarayıcısında WebXR kontrolcü hatası | Orta | Yüksek | Quest 3/3S birincil; el takibi yedeği; Faz 0'da test |
| Immersive TWA'nın boş ekranda kalması | Orta | Orta | 2D mod + "Müzeye gir" |
| Hastane Wi-Fi'ında captive portal ya da engelleme | Orta | Yüksek | Faz 8'de sahada deneme; telefon hotspot'u; Faz 10 |
| Video takılması, kare kaybı | Orta | Yüksek | Tek video kuralı, bit hızı sınırı, poster, media layer |
| Okunmayan yazılar | Yüksek (içerik kısaltılmazsa) | Yüksek | Editör uyarıları, odak modu, eşinle içerik kısaltma |
| Baş dönmesi | Orta | Yüksek | Yalnız teleport, kararma, oturma modu, kısa oturumlar |
| Kapsam kayması (avatar, çok oyunculu, quiz) | Orta | Orta | Plan dışı her özellik "v2" listesine |
| İçerik hakları ya da onay eksikliği | Bilinmiyor | Yüksek | Envanterde zorunlu sütunlar; erişim kapısı |
| Meta'nın WebXR/tarayıcı desteğini zayıflatması | Düşük–Orta | Yüksek | Taşınabilir çekirdek; native görüntüleyici yolu |
| Cloudflare şartları | Düşük (R2 ile) | Yüksek | Videolar yalnız R2'de |
| Türkiye'nin resmi Quest ülkesi olmaması (garanti, servis) | Yüksek | Orta | Yerel garantili satıcı, yedek cihaz |
| Kiosk modu olmaması (anne uygulamadan çıkabilir) | Orta | Düşük | Hemşire eşliği, yer imi, kısa oturum |
| Hastane bilgi işleminin gözlükleri ağa almaması | Orta | Yüksek | §18.3 soruları erken sorulur; Faz 10 |
| Enfeksiyon kontrol onayının çıkmaması | Orta | Yüksek | Yazılı prosedür (§18.4), tek kullanımlık hijyen maskesi |
| Quest 2 satın alınması | Düşük | Orta | Satın alma önerisi (§18.2) |

---

## 20. Açık sorular (varsayılanlarıyla)

**Yanıtlandı (21 Eylül 2026)**

- ✅ Kullanım ortamı → Onay çıkarsa gözlükleri hastane satın alacak; anneler doğumdan sonra hastanede kullanacak.
- ✅ Gözlük → Quest 2 ya da 3 düşünülüyor. Öneri: Quest 3S (filo), bütçe varsa Quest 3; Quest 2 satın alınmamalı (§18.2).
- ✅ Veri kaydı → Yok, yalnız eğitim amaçlı. Faz 11 kapsam dışı.

**Kritik — hâlâ açık**

1. Hastane ağı: gözlükler Wi-Fi'a bağlanabilecek mi, giriş sayfası var mı, video engelleniyor mu? → §18.3'teki soruları eşin hastane bilgi işlemine iletmeli. Varsayılan: belirsiz → Faz 1'de çevrimdışı spike.
2. Geliştirme için elde bir Quest var mı (önceki çalışmadan kalan)? → Varsayılan: yoksa Faz 0 IWER emülatörüyle başlar, test için 1 adet Quest 3S alınır.
3. Kaç gözlük, hangi serviste, günde kaç anne? → Varsayılan: 2–4 gözlük, tek lohusa servisi.

**İçerik**

4. Eski müzenin ekran görüntüleri ya da kaydı var mı? Makalenin yöntem bölümü müzenin bölümlerini tarif ediyor mu? → Varsa yerleşim ona sadık kurulur.
5. Materyal envanteri: kaç video, toplam GB, süreler, çözünürlük, altyazı? → Varsayılan: 10–25 video, her biri ≤ 5 dk.
6. Videoların kaynağı ve telif durumu; görüntüdeki kişilerin onayı? → Varsayılan: kendi üretiminiz, onaylı.
7. Duvar metinleri hazır mı, kim kısaltacak? → Varsayılan: eşin, §7.4 kurallarıyla.
8. Sesli anlatım (eşinin sesiyle oda tanıtımları) istenir mi? → Varsayılan: hayır; şema eklemeye açık.

**Kullanım**

9. Annelerin çoğu yatakta mı (sezaryen oranı yüksek mi)? → Varsayılan: yatak modu birincil, oturarak ikincil.
10. Dil: yalnız Türkçe mi, İngilizce de mi (uluslararası tanıtım)? → Varsayılan: TR; şema EN'e hazır.
11. Erişim: herkese açık mı, kodlu mu? → Varsayılan: listelenmemiş link + erişim kodu.
12. Hemşirenin de müzenin içinde olması (çok kullanıcılı) gerekiyor mu? → Varsayılan: hayır; yansıtma yeterli.
13. İçeriği kim düzenleyecek? → Varsayılan: sen, yerel editörle; eşin için Faz 12.
14. Alan adı? → Varsayılan: mevcut alan adının altında `muze.` ve `medya.` alt alan adları.

---

## 21. CLAUDE.md ve README şablonları

```md
# CLAUDE.md — Dijital Emzirme Müzesi

## Git kuralları (istisnasız)
- `git commit` ve `git push` çalıştırma. Commit ve push'u yalnızca Kutluhan manuel yapar.
- Branch oluşturma: `git branch`, `git checkout -b`, `git switch -c` yok. Mevcut branch'te çalış.
- Commit mesajına, koda veya dosyalara "Co-Authored-By: Claude" ya da herhangi bir AI atfı ekleme.
  GitHub Contributors listesinde yalnızca Kutluhan görünmeli.
- İş bitince değişen dosyaların listesini ve önerilen bir commit mesajını yaz; commit'i Kutluhan atar.

## Kod kuralları
- TypeScript strict, `any` yok.
- Yorumlar İngilizce, doğal ve "neden"i açıklar; "ne"yi tekrar etmez.
- Tek gerçek kaynak `content/museum.json`, şeması `src/schema/museum.ts`.
  Şema değişirse `version` artar ve migrasyon yazılır.
- Video oynatma yalnızca `src/media/VideoManager.ts` üzerinden. Aynı anda en fazla 1 video.
- Medya dosyaları git'e eklenmez (`content/media/raw`, `content/media/dist` gitignore).
- Renkler yalnız `src/design/tokens.ts`'ten; metin boyutları `src/design/typography.ts`'teki dmm kurallarına uyar.
- `localStorage` erişimleri `try/catch` içinde.
- Uygulama kullanım verisi toplamaz: analitik, izleyici ya da üçüncü taraf script ekleme.

## Çalışma şekli
- Fazlar PLAN.md §14 sırasıyla. Her faz sonunda `npm run typecheck && npm run test && npm run build` yeşil olmalı.
- Gözlükte doğrulanması gereken kabul maddelerini "Kutluhan doğrulayacak" diye işaretle; kendin işaretleme.
- Sahibi olmadığın bir ajan alanındaki dosyayı değiştirmen gerekirse değişikliği gerekçesiyle öner.
```

```md
# Dijital Emzirme Müzesi

Doğum sonrası annelere yönelik, VR gözlükle ya da tarayıcıdan gezilebilen emzirme eğitimi müzesi.

## Geliştirme
    npm install
    npm run dev            # http://localhost:5173 — editör: /edit
    npm run validate       # museum.json şema kontrolü
    npm run media:build    # content/media/raw → content/media/dist
    npm run media:upload   # dist → Cloudflare R2
    npm run build && npm run deploy

## Gözlükte test
    adb reverse tcp:5173 tcp:5173
    Quest Browser → http://localhost:5173

## İçerik
Tüm yerleşim content/museum.json dosyasındadır. Medya dosyaları git'te tutulmaz;
content/media/manifest.json eşlemeyi tutar.

## İçerik hakları
Videolar ve metinler [kurum / yazar] tarafından hazırlanmıştır; izinsiz kullanılamaz.
```

---

## 22. Commit örnekleri (commit'leri sen atacaksın)

```
chore: scaffold vite react-three-fiber project with strict ts
feat(xr): teleport and snap turn with seated mode
feat(media): ffmpeg pipeline with hashed outputs, posters and manifest
feat(scene): procedural rooms with door openings from museum.json
feat(exhibits): single-active video manager and focus mode
feat(editor): drag media onto walls with snapping and live warnings
feat(tour): guided tour with fade teleport between stops
perf(scene): merge static wall geometry per room
build(pwa): web manifest and asset links for quest packaging
```

---

## 23. Kaynaklar

**Spatial**
- Spatial — creator platformunun kapanış duyurusu: https://www.spatial.io/blog/spatial-creator-platform-sunsetting
- UploadVR haberi: https://www.uploadvr.com/spatial-is-discontinuing-its-creator-platform-in-july/
- Road to VR haberi: https://roadtovr.com/spatial-social-xr-enterprise-pivot/
- Penn State Media Commons — Spatial eğitimleri (çerçeve, portal, gezinme): https://mediacommons.psu.edu/support/tutorials/spatial
- Spatial Creator Toolkit dokümanı: https://toolkit.spatial.io/docs/asset-import-tool

**Meta Quest / WebXR**
- Browser video desteği (codec'ler, tek video önerisi): https://developers.meta.com/horizon/documentation/web/browser-video/
- WebXR Layers: https://developers.meta.com/horizon/documentation/web/webxr-layers/
- three.js media ve projection layers örneği: https://threejs.org/examples/webxr_vr_layers.html
- PWA paketleme: https://developers.meta.com/horizon/documentation/web/pwa-packaging/
- WebXR PWA'ları: https://developers.meta.com/horizon/documentation/web/pwa-webxr/
- PWA genel bakış: https://developers.meta.com/horizon/documentation/web/pwa-overview/
- Immersive TWA hata kaydı: https://github.com/meta-quest/bubblewrap/issues/24
- Quest'te PWA ve geliştirici modu (web.dev): https://web.dev/articles/pwas-on-oculus-2
- Quest 2 WebXR kontrolcü sorunu: https://forum.babylonjs.com/t/webxr-controllers-not-registered-on-quest-but-work-fine-in-emulator/61019
- Android WebView ve WebXR: https://discussions.unity.com/t/web-browser-view-with-webxr-support/860702

**Kütüphaneler ve motorlar**
- pmndrs/xr v6.6 sürüm notları: https://github.com/pmndrs/xr/releases/tag/v6.6.0
- pmndrs/xr v5 → v6 geçiş rehberi: https://pmndrs.github.io/xr/docs/migration/from-react-three-xr-5
- uikit özel fontlar: https://docs.pmnd.rs/uikit/tutorials/custom-fonts
- Meta Immersive Web SDK: https://developers.meta.com/horizon/documentation/iwsdk/guides/overview/
- IWSDK ve AI araçları (MCP): https://developers.meta.com/horizon/blog/accelerate-vr-development-with-ai-and-immersive-web-sdk/
- Godot video oynatma kısıtları: https://docs.godotengine.org/en/latest/tutorials/animation/playing_videos.html
- FrameVR fiyatlandırma: https://learn.framevr.io/pricing

**Cloudflare**
- Cloudflare ile video sunumu (Tunnel dahil): https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/
- Güncellenmiş hizmet şartları (R2/Stream istisnası): https://blog.cloudflare.com/updated-tos
- R2 fiyatlandırma: https://developers.cloudflare.com/r2/pricing/

**VR okunurluğu**
- 41±14 dmm bulgusunu (Dingler ve ark., 2018) özetleyen bildiri: https://www.grid.uns.ac.rs/symposium/download/2022/92.pdf
- Büttner, Grünvogel, Fuhrmann (2020), "The influence of text rotation, font and distance on legibility in VR"

**Donanım ve kurumsal kullanım (v2)**
- Meta Quest'in gönderim yaptığı ülkeler: https://www.meta.com/help/orders-and-returns/914401682626684/
- Meta topluluk yöneticisi: Türkiye desteklenen ülke değil: https://communityforums.atmeta.com/discussions/OtherTroubleshooting/suspended-before-even-turning-on-the-quest/1356458
- Horizon OS'ta Türkçe dil desteği talebi: https://communityforums.atmeta.com/discussions/OffTopic/unlocking-the-metaverse-for-millions-the-urgent-need-for-turkish-language-suppor/1368828
- Meta for Work güncellemesi (HMS ücretsiz, 2030'a kadar destek): https://forwork.meta.com/blog/an-update-on-meta-for-work/
- UploadVR, Quest for Business programının kapanışı: https://www.uploadvr.com/meta-is-shutting-down-its-quest-for-business-program/
- HMS'in Quest 3/3S kapsamı: https://blog.mimbus.com/en/hms-meta-horizon-managed-services-quest-ce-que-%C3%A7a-change-concr%C3%A8tement
- ArborXR, HMS kurulumu ve ülke seçimi: https://help.arborxr.com/en/articles/12821712-how-to-set-up-a-meta-horizon-managed-services-subscription
- Nisan 2026 Quest fiyat artışı (LOG): https://www.log.com.tr/meta-tedarik-sikintilari-nedeniyle-quest-3-ve-quest-3sin-fiyatlarina-zam-yapiyor/
- Quest 3 ve 3S farkları: https://www.tamindir.com/blog/meta-quest-3s-ozellikleri-fiyati_90518/
- MediaMarkt Türkiye Quest 3S listesi: https://www.mediamarkt.com.tr/tr/product/_meta-quest-3s-sanal-gerceklik-gozlugu-beyaz-158245490.html
- Connect 2026 ve Quest yol haritası: https://vr.org/meta-connect-2026
