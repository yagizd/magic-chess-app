# Magic Chess

Magic Chess, satranç taşlarının hareket kabiliyetlerinin bulundukları sütuna göre değiştiği, gerçek zamanlı çok oyunculu (multiplayer) bir satranç oyunudur. 

## 🌟 Oyunun Kuralları (Sütun Kuralı)
Bu oyun geleneksel satrançtan farklı bir kural setine sahiptir:
- **a ve h sütunlarındaki taşlar:** Kale (Rook) gibi hareket eder.
- **b ve g sütunlarındaki taşlar:** At (Knight) gibi hareket eder.
- **c ve f sütunlarındaki taşlar:** Fil (Bishop) gibi hareket eder.
- **d ve e sütunları:** Doğal hareket (kendi özellikleri).
*Not: Şah, Vezir ve Piyonlar bulundukları sütundan bağımsız olarak her zaman kendi doğal hareketlerini yaparlar.*

## 🚀 Mevcut Özellikler
- **Online Çok Oyunculu:** Socket.io kullanılarak gerçek zamanlı eşleştirme ve oyun imkanı.
- **Oda Sistemi:** 6 haneli kodlar üzerinden odalar oluşturup arkadaşlarınızla oynama.
- **Rövanş (Rematch) Sistemi:** Oyun bitiminde tarafların aynı odada renkleri değiştirerek yeni maça başlayabilmesi.
- **Supabase Veritabanı Entegrasyonu:** Biten maçların sonuçlarının, oyuncu bilgilerinin ve hamle geçmişlerinin (PGN benzeri) kalıcı olarak kaydedilmesi.
- **Yerel (Local) Oyun Modu:** Tek bilgisayarda iki kişinin oynayabilmesi.

## 🚧 Yapılacaklar (Yakın Hedefler)
- **Chat Sistemi:** Oyun içi sohbet imkanı.
- **Kopma/Bağlanma (Reconnection) Desteği:** İnternet kopmalarında maçtan düşmeden geri bağlanabilme süresi tanınması.

## 🛠️ Kullanılan Teknolojiler
- **Frontend:** React, TypeScript, Vite, Socket.io-client
- **Backend:** Node.js, Express, Socket.io, Supabase
- **Shared:** İstemci ve sunucu arasında paylaşılan oyun kuralları ve tipler (`shared` klasörü)

## 📦 Kurulum ve Çalıştırma

### Sunucu (Backend)
1. `server` klasörüne gidin.
2. `npm install` komutuyla bağımlılıkları yükleyin.
3. `.env.example` dosyasını `.env` olarak kopyalayın ve Supabase bilgilerinizi girin.
4. Ana dizindeki `supabase.sql` dosyasını Supabase arayüzünden çalıştırıp tablolarınızı kurun.
5. `npm run dev` ile sunucuyu (3001 portunda) başlatın.

### İstemci (Frontend)
1. `client` klasörüne gidin.
2. `npm install` komutuyla bağımlılıkları yükleyin.
3. `npm run dev` komutuyla uygulamayı (5173 portunda) başlatın.
