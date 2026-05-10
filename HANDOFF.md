# Magic Chess - Project Handoff

Bu dosya, projede şu ana kadar yapılanları, projenin mevcut durumunu ve bir sonraki geliştiricinin (veya yapay zekanın) devraldığında hangi adımları izlemesi gerektiğini özetlemektedir.

## 📍 Mevcut Durum (Current Status)
- **Backend Temeli:** Socket.io entegrasyonu tamamen çalışır durumda. Odalara katılma, ayrılma, oyun mantığı başarıyla işliyor.
- **Son Eklenenler:**
  - **Supabase:** Oyun sonuçlarını kaydetme mantığı (`server/src/db/supabase.ts`) eklendi ve `gameHandler.ts` içine entegre edildi. 
  - **Rövanş (Rematch):** Oyun sonu ekranından rövanş isteği yollama, iki taraf kabul ettiğinde renkleri (`white`, `black`) kendi aralarında değiştirip (swap) tahtayı sıfırlayarak yeni oyuna başlama işlemleri tamamlandı.

## 🎯 Aktif Hedef (Active Goal)
**Satranç Saati ve Zaman Kontrolleri (Time Controls)**
Kullanıcı lobide oyun oluştururken "Bullet, Blitz, Rapid" gibi zaman modlarını seçecek. Bu süre sunucuda milisaniye cinsinden takip edilip istemciye yayınlanacak. Süresi biten oyuncu otomatik kaybedecek.

## 📋 Görev Listesi (Task List)

Şu an aktif olarak başlanması/yapılması gereken görevler:

- [ ] **Shared Types (`shared/types.ts`):** `TimeControl` arayüzünün tanımlanması (örn: `{ minutes: number, increment: number }`) ve `GameState` içine `isTimeout` eklenmesi.
- [ ] **UI - Lobby (`client/src/components/Lobby.tsx`):** Fotoğraftaki tasarıma uygun olarak Bullet, Blitz ve Rapid kategorilerinde butonların eklenmesi. Oda kurulurken seçili olan modun sunucuya `room:create` ile gönderilmesi.
- [ ] **Backend - Odalar (`server/src/rooms.ts`):** `Room` nesnesine `timeControl`, `whiteTimeMs`, `blackTimeMs` ve `lastMoveTimestamp` özelliklerinin eklenmesi.
- [ ] **Backend - Timer Mantığı (`server/src/handlers/gameHandler.ts`):** 
  - Odada iki kişi olduğunda saati başlatma.
  - Hamle geldiğinde geçen süreyi hesaplayıp düşme ve `increment` (artış) ekleme.
  - `game:time_sync` eventi ile kalan süreyi istemcilere yayınlama.
  - Bir `setInterval` kurarak odalardaki oyuncuların sürelerinin bitip bitmediğini denetleme ve bittiyse oyunu sonlandırma.
- [ ] **UI - GameInfo (`client/src/components/GameInfo.tsx`):** Oyuncuların isimlerinin yanında kalan sürelerinin dijital saat (MM:SS) şeklinde gösterilmesi.
- [ ] **Hook - Online Game (`client/src/hooks/useOnlineGame.ts`):** Sunucudan gelen zaman senkronizasyonunu yerel bir döngü (`requestAnimationFrame` veya `setInterval`) ile akıcı şekilde arayüze yansıtma.

## 🏗️ Mimari Notlar (Architecture Notes)
- `shared` klasörü hem `client` hem de `server` tarafından ortak kullanılmaktadır. Oyun kurallarında bir değişiklik yapılacaksa `shared/rules.ts` güncellenmeli ve `npm test` ile doğrulanmalıdır.
- Supabase ayarları için sunucuda `.env` gereklidir (`.env.example` referans alınabilir). Eksik anahtarlarla sistem çökmez, sadece uyarı verip kaydetmeyi atlar (Graceful degradation).
- Online oyun hook'u `useOnlineGame.ts` içinde soket dinleyicileri bulunur. Her yeni soket eventinde burası güncellenmelidir.
