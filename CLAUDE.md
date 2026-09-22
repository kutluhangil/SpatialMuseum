# CLAUDE.md — Dijital Emzirme Müzesi

Design direction: ui-ux-pro-max

Plan: `emzirme-muzesi-PLAN.md` (fazlar §14). Mekân v3'ten beri üniversite dersliği: `docs/decisions/0005-derslik.md`. Görsel dil plan §8'de sabit (palet, Atkinson Hyperlegible Next);
ui-ux-pro-max "Accessible & Ethical" kuralları üstüne uygulanır: görünür odak halkası, ≥ 44 px hedef,
reduced-motion, ≥ 7:1 metin kontrastı.

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
- Oda yüzeyleri ışıksız (`meshBasicMaterial`); ışık `WallBuilder.ts` / `Surfaces.ts`'te vertex rengine pişirilir.
  PBR (`meshStandardMaterial`) yalnız baskı çerçevelerinde; ortam yansıması `EnvironmentLight` (yerel RoomEnvironment).
- Draw call bütçesi: klasik WebGLRenderer'da multiview yok; VR'da her draw call iki kez çizilir. Yeni görsel öğe eklerken oda başına birleştir (merge) ve `?stats` ile ölç. İki kapı ötesindeki odalar `detail: 'far'` (tek derslikte etkisiz).
- Sınıf mobilyası `src/classroom/layout.ts` (saf yerleşim) + `furniture.ts` (tek birleşik mesh); yeni parça oraya eklenir.
- Sınıftaki izleyici kitlesi öğrenciler (proje başındaki "anneler" kurgusu geçersiz); metinler öğrencilere hitap eder.
- Ses `src/audio/` içinde WebAudio ile üretilir; ses dosyası eklenmez. Ses ilk kullanıcı hareketinde başlar.
- Oda durumu (ışık, perde) `src/classroom/roomStore.ts`; perde kumaşı ayrı mesh (`buildBlindFabric`) ve kaset/zincir birleşik mobilyada kalır.
- Görsel regresyon: `npm run test:visual` (Playwright, `tests-visual/`). Referans görüntüler bu makinede üretildi; bilinçli görsel değişiklikten sonra `-- --update-snapshots` ile yenilenir.
- Ders akışı `content/museum.json` → `lesson` (bölümler + sıralı adımlar); perde/tahta `src/lesson/lesson.ts` `lessonView`'dan beslenir.
- Tablolar yalnız kamu malı / CC0: `scripts/fetch-artworks.ts` lisansı doğrulamadan indirmez; dini ikonografi bilinçli olarak yok.

## Çalışma şekli
- Fazlar plan §14 sırasıyla. Her faz sonunda `npm run typecheck && npm run test && npm run build` yeşil olmalı.
- Gözlükte doğrulanması gereken kabul maddelerini "Kutluhan doğrulayacak" diye işaretle; kendin işaretleme.
- Sahibi olmadığın bir ajan alanındaki dosyayı değiştirmen gerekirse değişikliği gerekçesiyle öner.

## Ortam notları
- `/usr/bin/git` ve `/usr/bin/python3` Xcode lisansı onaylanmadığı için çalışmıyor; `/opt/homebrew/bin/` sürümlerini kullan.
- Vite'ın dosya izleyicisi `/Volumes/…` üzerindeki değişiklikleri kaçırabiliyor: görsel doğrulamadan önce `npm run dev`'i yeniden başlat (bayat modülle yanlış sonuç çıkar).
- `@react-three/fiber` 9.7 React `<19.3` istiyor; React 19.2.x'e sabit. three.js tek kopya için `package.json` → `overrides`.
