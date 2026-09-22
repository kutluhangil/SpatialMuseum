# 0005 — Müzeden üniversite dersliğine

Durum: Kabul — 2026-09-22. Spec: `docs/superpowers/specs/2026-09-22-derslik-design.md`,
plan: `docs/superpowers/plans/2026-09-22-derslik.md`. 0002 ve 0003'teki müzeye özgü kararların yerini alır.

## Karar
Deneyim tek, gerçekçi bir üniversite dersliğinde geçer. Kullanıcı aynı (lohusa anneler, hemşire eşliğinde), ad aynı.
Anne ikinci sırada oturarak başlar; ders adımları perdede (video) ve tahtada (not) ilerler; teleportla kalkıp
duvardaki baskılara ve panodaki kartlara bakabilir.

## Sonuçlar
- Şema v2 (`src/schema/migrate.ts` v1 → v2): `lesson` (bölüm + sıralı adım), `room.classroom`, `spawn.posture`;
  `tourStop`, `mood`, `decor`, varak çerçeve kalktı. Tahta notu ≤ 90 karakter (5 m'den iki satır).
- Derslik 9,6 × 8 m: tahta ile perde yan yana sığsın diye 9,6 m; sıra aralığı 1,1 m, çünkü 0,95 m'de oturan
  kişi ile arkadaki masa arasında kalkacak yer (0,6 m) kalmıyordu.
- Bütün mobilya `classroomLayout` → `buildClassroomFurniture`: tek birleşik vertex renkli mesh (1 draw call).
- Komşu odaya açılmayan kapılar kapalı çizilir ve çarpışmada duvar sayılır (kapıdan manzara görünmesin).
- Kalkanlar: lobi/salonlar, süt yolu, kapı tabelaları, banklar, ışıklık, ışık temaları, köşe bitkileri,
  Poly Haven modelleri, parke. Zemin: Poly Haven `interior_tiles` (CC0), ETC1S.
- Yol boyunca düzeltilen eski hatalar: `useVideoElement` StrictMode'da src'yi ve `VideoTexture` kare döngüsünü
  kaybediyordu (video siyah); `TextPanel` başlığı tek satır varsayıyordu (iki satırlık başlık gövdeye biniyordu).

## Ölçüm (masaüstü, `?stats`)
Oturma bakışı 17 draw call, arka köşe 24, yan koridor 20; en fazla ~15 bin üçgen, 13 doku (hedef ≤ 60 draw call).
Müzenin en ağır görünümü 93 draw call idi.

## Gözlükte doğrulanacak (Kutluhan)
- Ölçek hissi: masa 75 cm, sandalye 45 cm, tavan 3,2 m doğru mu?
- Tahta notları 5 m'den okunuyor mu (gövde 35 dmm)?
- Oturarak başlangıçta perde ve tahta rahat görüş açısında mı; masadaki düğmelere kumanda ışınıyla ulaşılıyor mu?
- 72 fps.
