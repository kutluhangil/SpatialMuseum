# Dijital Emzirme Müzesi

Doğum sonrası annelere yönelik, VR gözlükle ya da tarayıcıdan girilen sanal bir derslikte verilen emzirme dersi.
Videolar perdede, notlar tahtada sırayla ilerler; duvarlarda kamu malı anne-çocuk tablolarının baskıları var.

## Geliştirme
    npm install
    npm run media:spike    # Faz 0 test videosu → content/media/dist (bir kez)
    npm run media:artworks # kamu malı tablolar (lisans kontrollü) → KTX2, content/media/dist/artworks (ffmpeg gerekir)
    npm run media:polyhaven # CC0 zemin dokusu ve dış manzara → KTX2, public/ (zaten repoda; yeniden üretmek için)
    npm run dev            # http://localhost:5173 — derslik: /  ·  cihaz spike'ı: /spike
    npm run validate       # museum.json şema kontrolü
    npm run typecheck && npm run test && npm run build

## Gözlükte test
    adb reverse tcp:5173 tcp:5173
    Quest Browser → http://localhost:5173/spike

## İçerik
Derslik, ders bölümleri/adımları ve duvar baskıları content/museum.json dosyasındadır (şema v2). Medya dosyaları git'te tutulmaz;
content/media/manifest.json eşlemeyi tutar (Faz 1).

## İçerik hakları
Videolar ve metinler [kurum / yazar] tarafından hazırlanmıştır; izinsiz kullanılamaz.
Font: Atkinson Hyperlegible Next, SIL Open Font License (public/fonts/OFL.txt).
Tablolar: Wikimedia Commons, kamu malı / CC0 (kaynaklar content/media/artworks.json).
Poly Haven (CC0): "Interior Tiles" zemin dokusu, "Meadow 2" panoraması.
