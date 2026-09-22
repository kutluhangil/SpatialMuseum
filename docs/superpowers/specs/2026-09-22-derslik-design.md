# Tasarım: Müzeden üniversite dersliğine

Tarih: 2026-09-22 · Durum: onaylandı (tasarım), uygulama planı bekliyor

## Neden
Deneyim bir müzede değil, gerçekçi bir üniversite dersliğinde geçecek. Kullanıcı değişmedi:
lohusa servisindeki anneler, hemşire eşliğinde, Quest 3S/3 ile. Ad **Dijital Emzirme Müzesi** olarak kalıyor.

## Verilen kararlar
| Konu | Karar |
|---|---|
| Kullanıcı | Lohusa anneler (hastane bağlamı, yatak ve hemşire modu planı aynen geçerli) |
| Mekân | Tek derslik; lobi ve 4 salon kalkıyor |
| Deneyim | İkisi birden: varsayılan olarak ön sırada oturup dersi izlemek, isteyen teleportla kalkıp duvarlara yakından bakabilir |
| Tablolar | 3–4 tanesi yan/arka duvarlarda sade çerçeveli baskı; varak çerçeve ve spot ışık havuzu yok |
| Oturma düzeni | İki kişilik masa + sandalye sıraları, ortada koridor |
| Yaklaşım | Mevcut veri odaklı sistem (`museum.json` + şema + prosedürel geometri) sınıfa uyarlanıyor |

## Mekân
- İç ölçü 9,6 m (genişlik) × 7,5 m (derinlik), tavan 3,2 m. Ön duvar kuzey (tahta ve perde yan yana sığsın diye 9,6 m).
- **Yüzeyler:** kırık beyaz sıvalı duvarlar; alt kısımda 0,9 m'lik açık gri koruyucu şerit (sandalye çarpma bandı);
  granit karo zemin (Poly Haven `granite_tile`, CC0); 60 × 60 cm asma tavan
  karoları ve gömme LED paneller. Işık `meshBasicMaterial` + vertex'e pişirilmiş: sınıf aydınlatması düz ve eşit,
  pencere tarafı biraz daha aydınlık.
- **Batı duvarı:** 3 geniş pencere (denizlik 0,9 m), altlarında radyatör; dışarıda mevcut çayır panoraması.
- **Arka (güney) duvar:** kapı ve bir mantar pano. **Doğu duvarı:** baskılar.
- **Ön duvar:** solda 4 m beyaz tahta (alüminyum çerçeve, kalem rafı), sağında tavandan inen 3,6 m projeksiyon perdesi
  (ikisi aynı anda görünür), tavanda projeksiyon cihazı, öğretim üyesi masası ve sandalyesi; tahtanın üstünde duvar saati.
- **Sıralar:** 5 sıra × (sol 2 + sağ 2) iki kişilik masa, ortada ~1 m koridor, ~40 kişilik; laminat masa üstü,
  metal ayak, plastik kabuklu sandalyeler. Bütün mobilya malzeme başına tek birleşik mesh (draw call bütçesi).

## Ders akışı (içerik sunumu)
- Eski odalar **bölüm** olur: Karşılama, Emzirme pozisyonları, Gece emzirmeleri, İlk günler, Sanatta annelik.
- Ders adımları `lesson.steps` dizisinin sırasıyla ilerler. İki odak yüzey var:
  - **Perde**, o anki adım bir videoysa videoyu gösterir; değilse bölümün başlık slaydını gösterir.
  - **Tahta**, bölüm içinde o ana kadarki son metin adımını gösterir. Koyu metin beyaz tahtada kalır,
    kontrast ≥ 7:1 ve dmm kuralları geçerli; yazı tipi Atkinson Hyperlegible Next (el yazısı yok).
- Sonraki/Önceki: masaüstünde N/Boşluk ve B, VR'da A/X ve B/Y, ayrıca annenin masasının üstünde dünya içi
  "Önceki / Sonraki" düğmeleri (≥ 44 px eşdeğeri hedef, görünür odak).
- Serbest dolaşma: teleport sınıfın her yerine, masalara ve duvara 0,4 m'den yakına değil. Baskılar ve panodaki
  bilgi kartları (eski `fact` metinleri) ders adımı değildir, duvarda sürekli durur.

## Başlangıç
- Başlangıç ikinci sıra, sağ blok, koridor tarafındaki sandalye; bakış tahta ile perdenin ortasına. Masaüstünde oturma göz yüksekliği 1,2 m;
  teleport edilince ayakta 1,6 m. VR'da gerçek baş yüksekliği kullanılır (anne zaten oturuyor ya da yatıyor).

## Veri modeli (şema `version: 2`)
- `rooms[]` korunur (tek oda). Kalkar: `mood`, `decor`. `wallTone` sınıf tonlarına iner.
- Yeni `room.classroom`: `{ front: WallSide, rows, desksPerSide, aisle }`; mobilya bundan üretilir.
- Yeni üst düzey `lesson: { sections, steps }`: adımlar video (perde) ya da metin (tahta), her biri bir `section`'a bağlı;
  duvar sergileri (`exhibits`, `placement`) bugünkü gibi kalır ve ders adımı değildir.
- `tourStop` kalkar (sıra dizi sırası). `ImageExhibit.frame`: `gilt` kalkar, `wood`/`black`/`thin` kalır.
- `spawn.posture: 'standing' | 'seated'`.
- `src/schema/migrate.ts`: v1 → v2 alan göçü (`tourStop`, `mood`, `decor` silme, `gilt` → `wood`, boş `lesson`).
  Oda yerleşimi içerik kararıdır, göç yapmaz; yeni `content/museum.json` elle yazılır.

## Kalkanlar
Lobi ve salonlar, kapı tabelaları, süt yolu (`Wayfinding`), banklar, ışıklıklar ve kaset tavan, ışık temaları
(`moods.ts`), köşe bitkileri ve emzirme köşesi, varak çerçeve. Çok odalı yükleme kodu kalır ama tek derslikte etkisizdir.
Aynı nedenle salon-1 penceresinden salon-2'nin iç yüzünün görünmesi hatası da ortadan kalkar.

## Kalanlar
Ad, metinler ve videolar, KTX2 hattı, `VideoManager` (aynı anda tek video), erişilebilirlik kuralları,
çarpışma ve teleport sistemi, panorama, `?stats` ölçümü, yatak/hemşire modu planı (henüz kodlanmadı).

## Doğrulama
- `npm run typecheck && npm run test && npm run build` yeşil; testler: şema v2 kuralları, göç, mobilya yerleşimi,
  ders akışı durum makinesi (adım → perde/tahta içeriği).
- Playwright ile ekran görüntüsü: oturma bakışı, arka köşeden genel görünüm, pencere tarafı.
- `?stats`: en ağır görünümde draw call ≤ 60 hedefi.
- Gözlükte (Kutluhan doğrulayacak): ölçek hissi (masa/sandalye boyu), tahta yazısının okunurluğu, 72 fps.

## Plan dosyası
`emzirme-muzesi-PLAN.md` §0, §6, §7, §8 sınıfa göre revize edilir; karar kaydı `docs/decisions/0005-derslik.md`.
