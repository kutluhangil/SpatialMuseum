# 0002 — Görsel katman (Faz 5'in öne çekilmesi)

Durum: Kabul — Kutluhan'ın 2026-09-21 gözlük geri bildirimi üzerine ("yönlendirme ve FPS iyi, görsel kötü").

## Karar
- Işık **pişmiş**: duvar/zemin/tavan ışıksız malzeme + vertex rengi (köşe, zemin ve tavan birleşim gölgesi, yöne göre
  sabit parlaklık). Spot etkisi, eser başına additive "ışık havuzu" dörtgenleriyle (oda başına tek draw call).
  Gerçek zamanlı gölge ve ışık hesabı yok: Quest'te doluluk maliyeti düşük kalır.
- PBR yalnız çerçeve ve bankta; ortam yansıması three'nin `RoomEnvironment`'ından yerelde üretiliyor (HDR indirmesi yok).
- Zemin: Poly Haven Herringbone Parquet 2K, AO haritası dokuya önceden çarpıldı (tek doku, 3,4 m tekrar, anizotropi 8).
- Tablolar: Wikimedia Commons'tan yalnız "Public domain" / "CC0"; uzun kenar ≤ 1280 px (doku bütçesi).
  Dini "Madonna lactans" eserleri bir devlet hastanesi bağlamı nedeniyle bilinçli olarak dışarıda.
- Şemada `ImageExhibit.frame` enum'una `gilt` ve `wood` eklendi. Geriye uyumlu (eski dosyalar geçerli), bu yüzden
  `version` 1'de kaldı; CLAUDE.md'deki "şema değişirse version artar" kuralı kırıcı değişiklikler için uygulanacak.

## Ölçüm (masaüstü Chrome, `?stats`)
- Lobi (5 oda yüklü, en kötü yön): 69 draw call, ~13 bin üçgen, 17 doku.
- Galeri: 35 draw call. Geometri sayısı ilk görüşte yükleniyor ve 163'te sabitleniyor (sızıntı yok).

## Gözlükte doğrulanacak (Kutluhan)
- Quest'te 72 fps korunuyor mu (özellikle lobi, tüm odalar yüklüyken).
- Additive ışık havuzları ve ışıklık gözlükte göz yormuyor mu; yaldız çerçeve fazla parlak mı.
- Parke gözlükte titreşiyor mu (moiré); titrerse Faz 7'de KTX2 + mipmap ayarı.
