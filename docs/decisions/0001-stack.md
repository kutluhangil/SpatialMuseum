# 0001 — Stack: R3F + @react-three/xr (IWSDK yedekte)

Durum: **Önerildi** — gözlük kapısından sonra Kabul / IWSDK'ya geçiş olarak güncellenecek.
Tarih: 2026-09-21

## Bağlam
Plan §3.2: editör React DOM ile aynı state'i paylaşmalı; Quest Browser'da WebXR ile açılmalı.

## Karar
Vite 8 + React 19.2 + TypeScript 6.0 (strict) + three 0.186 + @react-three/fiber 9.7 + drei 10.7 +
@react-three/xr 6.6 + @react-three/uikit 1.0. Sürümler `package.json`'da tam sürümle sabit.

## Masaüstünde doğrulananlar (Faz 0)
- `/spike` Chrome'da (Playwright) hatasız açılıyor; drag-to-look + WASD çalışıyor.
- troika (drei `<Text>`) Atkinson Hyperlegible Next ile `ĞÜŞİÖÇ ğüşıöç` doğru çiziyor.
- uikit hem varsayılan Inter hem Atkinson ile Türkçe glifleri doğru çiziyor.
- 1080p H.264/AAC video tıklamayla oynuyor (`/media/` üzerinden, Range destekli).

## Plandan sapmalar
- **Bakınma:** pointer lock yerine sürükleyerek bakma. Pointer lock imleci sabitler ve R3F tıklama
  ışınlarını bozar (videoya tıklanamaz). Plan §7.2 iki seçeneği de sayıyor.
- **uikit fontu:** FontForge + msdf-bmfont gerekmedi. uikit 1.0 `useTTF` ile TTF'ten çalışma anında
  MSDF üretiyor (`fixOverlaps: true` üst üste binen yolları düzeltiyor). Maliyeti: ilk açılışta WASM
  işçisi + birkaç yüz ms. Faz 5'te gözlükte ölçülüp gerekirse atlas önceden üretilip `public/fonts/`'a konacak.
  Tuzak: `useTTF` girdisi modül sabiti olmalı; her render'da yeni dizi WASM belleğini tüketen sonsuz döngü yaratıyor.
- **Işık:** müze odaları ışıksız malzeme + vertex rengine pişmiş ışık (plan §8.4'ün "sıfır maliyet" hedefi Faz 2'de uygulandı).
- **Metin paneli:** şemaya `aspect` (varsayılan 4/3) eklendi; çakışma ve kapı kontrolleri için panel yüksekliği gerekiyor.
- **dmm tanımı:** "metin yüksekliği" = troika `fontSize` (em yüksekliği). Kalibrasyon bu tanımla yapılır.

## Gözlükte açık kalanlar (Kutluhan doğrulayacak)
- VR'a giriş, teleport, 45° anlık dönüş (Quest 3/3S).
- IWER emülatörüyle masaüstü VR denemesi (`npm run dev`, localhost'ta otomatik).
- Video sesli oynatma + OVR Metrics ≥ 72 fps.
- 2 m'den rahat okunan en küçük dmm satırı → `src/design/typography.ts` `legibility` eşikleri.
- R3F ile devam mı, IWSDK'ya geçiş mi.
