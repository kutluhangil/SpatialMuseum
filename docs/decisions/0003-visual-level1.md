# 0003 — Görsel Seviye 1: pencere, ışık teması, mimari, aksesuar, XR netliği

Durum: Kabul — 2026-09-22, araştırma önerisindeki sıra. Müzeye özgü kısımların yerini 0005 (derslik) aldı.

## Kararlar
- **Pencereler** yalnız dış duvarda (şema doğrular: pencere başka bir odaya bakamaz, kapı/eserle çakışamaz).
  Dışarısı tek bir panorama küresi (Poly Haven meadow_2, 4096 px, CC0), göz hizasında merkezli; opak duvarlardan
  sonra çizildiği için yalnız pencere pikselleri boyanır. Gece odasına bilinçli olarak pencere yok (gündüz manzarası çelişirdi).
- **Işık teması** (`mood`) pişmiş ışığın rengini/parlaklığını değiştirir; metin kartları her temada ışıksız onsut
  kalır, yani kontrast (≥ 7:1) temadan bağımsız.
- **Mimari** tamamen oda başına birleşik "trim" geometrisinde (lambri, raylar, korniş, pencere kasası): ek draw call yok.
  Kalıp derinlikleri 2 cm eser ofsetinin altında, etiketler hep önde.
- **Aksesuar** otomatik: kapı/pencere/alçak eser 1,3 m'den yakın olmayan köşeler. Poly Haven bitki dosyası 5 varyantı
  yan yana içeriyor; yalnız merkezdeki kullanılıyor. `anthurium_botany_01` API'de 4k görünüp 67k üçgen çıktığı için elendi.
- **XR netliği:** framebuffer ×1,25 + foveation 0,75 başlangıç değerleri; Quest 3S'te kalibre edilecek.

## Performans bulgusu
three.js 0.186'nın klasik `WebGLRenderer`'ında multiview yok (yalnız WebGPU renderer'da). VR'da her draw call göz başına
tekrarlanır. Önlemler: iki kapı ötesindeki odalar `far` detay (etiket, yazı, aksesuar, armatür yok), çerçeve gölgeleri
oda başına tek mesh, kart zemini + altın çizgi tek mesh.
Ölçüm (masaüstü, `?stats`): en kötü görünüm 164 → 93 draw call, en fazla ~62 bin üçgen, 28 doku.

## Gözlükte doğrulanacak (Kutluhan)
- 72 fps (lobi ve salon-3 batıya bakış en ağır görünümler).
- Framebuffer ×1,25 / foveation 0,75: netlik ve kenar bulanıklığı kabul edilebilir mi.
- Panorama gözlükte "sonsuz uzak" okunuyor mu; güneş lekeleri ve gece odası göz yoruyor mu.

## Sonraki (Seviye 2)
KTX2 sıkıştırma (tablolar 2K), WebXR Quad Layer ile metin, gerekirse `WebGPURenderer` + multiview değerlendirmesi,
editörden sonra Blender lightmap.
