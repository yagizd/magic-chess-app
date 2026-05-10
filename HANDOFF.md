# Magic Chess - Project Handoff

Bu dosya, projede şu ana kadar yapılanları, projenin mevcut durumunu ve bir sonraki geliştiricinin (veya yapay zekanın) devraldığında hangi adımları izlemesi gerektiğini özetlemektedir.

## 📍 Mevcut Durum (Current Status)
Proje şu anda tam teşekküllü bir satranç oyunudur. İstemci ve sunucu sorunsuz haberleşmekte, tüm oyun mekanikleri düzgün çalışmaktadır.

- **Backend & Socket.io:** Odalara katılma, ayrılma, lobide eşleşme ve satranç kuralları doğrulama (shared) başarıyla işliyor.
- **Satranç Saati (Time Controls):** Bullet, Blitz ve Rapid süre formatları eklendi. Süreler sunucu bazlı olarak yönetiliyor ve `time_sync` eventi ile senkronize ediliyor.
- **Supabase:** Oyun sonuçlarını kaydetme mantığı entegre edildi.
- **Rövanş (Rematch):** Oyun sonu ekranından rövanş isteği yollama, kabul edilirse renkleri değiştirip (swap) tahtayı sıfırlayarak yeni oyuna başlama çalışıyor.
- **Drag & Drop (Sürükle-Bırak):** Taşları hem tıklayarak (click-to-move) hem de sürükleyerek (drag-and-drop) oynamak mümkün (`Pointer Events` kullanıldı, dokunmatik cihazlara uyumlu).
- **Premove:** Sıra rakipteyken önceden hamle hazırlama. Sıra size geçtiğinde otomatik gönderilir (eğer yasal ise). Altın-sarısı renklerle vurgulanır.
- **Sağ Tık (İptal):** Tahtaya sağ tıklayarak (`onContextMenu` engellendi) seçili taşı veya ayarlanmış Premove'u iptal edebilirsiniz.

## 🎯 Aktif Hedef (Active Goal)
- **Cilalama ve Optimizasyon:** Projenin temel mekanikleri tamamlandı. Mevcut durum prodüksiyona (Render/Vercel vb.) çıkmak veya arkadaşlarla oynamak için tamamen hazırdır. 
- **Olası İleri Seviye Özellikler:**
  - Kullanıcı üyelik (Auth) sistemi.
  - Global sıralama tablosu (Leaderboard).
  - Elo puanlama sistemi.

## 📋 Görev Listesi (Task List)
Şu an aktif olan kritik bir hata veya eksik görev **bulunmamaktadır.** Geliştirmeler tamamlanmıştır. Yeni eklenecek özelliklere göre bu liste güncellenebilir.

- [x] Zaman kontrolleri (Bullet, Blitz, Rapid).
- [x] Rövanş ve Supabase veritabanı bağlantısı.
- [x] Sürükle-Bırak yeteneği ve çift tıklama/bug gidermesi.
- [x] Premove mekaniği.
- [x] Sağ tıkla iptal işlemleri.

## 🏗️ Mimari Notlar (Architecture Notes)
- `shared` klasörü hem `client` hem de `server` tarafından ortak kullanılmaktadır. Oyun kurallarında bir değişiklik yapılacaksa `shared/rules.ts` güncellenmeli ve test edilmelidir.
- Sürükle-Bırak (Drag & Drop) mekaniği DOM üzerindeki native HTML5 drag yerine React üzerinde `onPointerDown`/`Move`/`Up` şeklinde yazıldı. CSS'teki `touch-action: none;` sınıfı, mobil tarayıcılarda ekran kaymasını önlemek için çok kritiktir.
- Online oyun hook'u `useOnlineGame.ts` içinde soket dinleyicileri bulunur. Yeni bir socket eventi eklendiğinde referans (ref) kullanımına dikkat edilmelidir (React render döngüsü ile soketin asenkron yapısını bağlamak için `useRef` kullanılmaktadır).
