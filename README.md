# LingoTask

IELTS 6.5 hedefi için çalışma uygulaması. Sınav tarihi: **Ocak 2027**.
Aynı kod üç yerde çalışır: **masaüstü** (Windows / macOS / Linux, Electron) ve **telefon** (kurulabilir web uygulaması).

## İndir

**Telefon —** kurulum dosyası gerekmez: <https://dropdeart.github.io/LingoTask/>
Chrome'da aç → menü → *Uygulamayı yükle*. Kurulduktan sonra internetsiz çalışır.

**Masaüstü —** [son sürüm](https://github.com/DropDeart/LingoTask/releases/latest)

| Sistem | Dosya |
|---|---|
| Windows | `LingoTask-Setup-1.0.0-x64.exe` (kurulum sihirbazı) · `LingoTask-Portable-1.0.0.exe` (kurulumsuz) |
| macOS | `LingoTask-1.0.0-arm64.dmg` (Apple Silicon) · `LingoTask-1.0.0-x64.dmg` (Intel) |
| Linux | `LingoTask-1.0.0-x86_64.AppImage` · `LingoTask-1.0.0-amd64.deb` |

Derlemeler imzasız: Windows SmartScreen'de **Daha fazla bilgi → Yine de çalıştır**, macOS'ta uygulamaya **sağ tık → Aç**.

## Çalıştırma

```powershell
cd C:\Project\LingoTask
npm start          # masaüstü
npm run dev        # masaüstü + geliştirici araçları
```

## Masaüstü kurulumu (dağıtım)

```powershell
npm run icons      # ilk seferde
npm run dist:win   # dist/ içine kurulum sihirbazı + taşınabilir sürüm
```

| Dosya | Ne |
|---|---|
| `LingoTask-Setup-1.0.0-x64.exe` | Tek tıkla kurar ve açar — soru sormaz, yönetici izni istemez, masaüstü ve başlat menüsü kısayolu oluşturur |
| `LingoTask-Portable-1.0.0.exe` | Kurulum yok, çift tıkla çalışır |

Kaldırırken çalışma verisi silinmez, yeniden kurunca ilerleme yerinde durur.

**Mac ve Linux:** `.dmg` bir Windows makinesinde üretilemez, Linux hedefleri de Linux araç zinciri ister. Bu yüzden `vX.Y.Z` etiketi push edildiğinde GitHub Actions üç işletim sisteminde paralel derleyip tek bir Release'e koyar — bkz. `.github/workflows/release.yml`.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Derlemeler imzasız: Windows SmartScreen'de **Daha fazla bilgi → Yine de çalıştır**, macOS'ta **sağ tık → Aç** gerekir. İmzalamak Apple Developer üyeliği ve Windows kod imzalama sertifikası ister.

### Otomatik güncelleme

Kurulu uygulama GitHub Releases'i kendisi kontrol eder: açılıştan 4 saniye sonra ve ardından 6 saatte bir. Yeni sürüm varsa arka planda indirir, bittiğinde alt köşede "Sürüm X hazır" çubuğu çıkar. **Kurulum ancak sen onaylayınca yapılır** — uygulama yazma çalışmasının ortasında kendini yeniden başlatmaz.

Güncelleme yayınlamak için sürüm numarasını yükseltip etiket at:

```bash
npm version patch          # package.json + git tag
git push --follow-tags
```

CI üç platformda derler, `latest.yml` dosyalarını da Release'e koyar (`electron-updater` yeni sürümü bu dosyadan anlar) ve kurulu uygulamalar bir sonraki kontrolde yakalar.

| Hedef | Otomatik güncelleme |
|---|---|
| Windows (Setup) | ✅ |
| Windows (Portable) | ❌ — değiştirilecek kurulum yok, elle indirilir |
| Linux (AppImage) | ✅ |
| macOS | ❌ — imzalı ve notarize edilmiş derleme şart; imzasız uygulama kendini güncelleyemez |
| Telefon (PWA) | ✅ — service worker halleder, onay gerekmez |

macOS'ta kontrol tamamen atlanıyor, her açılışta hata göstermek yerine sessiz kalıyor.

### Platform farkları

Seslendirme dışında her şey üç sistemde aynı. Ses Windows'ta ana süreçte SAPI ile üretilir; macOS ve Linux'ta SAPI olmadığı için tarayıcı motoruna düşer — o platformlarda Chromium işletim sistemiyle düzgün konuşur, Windows'ta konuşamadığı için bu ayrım var. Linux'ta ses için `speech-dispatcher` kurulu olmalıdır.

## Telefona kurmak

```powershell
npm run icons      # ilk seferde: ikonları üretir
npm run build:web  # dist-web/ oluşturur (~370 KB, 29 dosya)
npm run serve:web  # sunucuyu başlatır, kurulum yönergelerini yazdırır
```

Tarayıcılar service worker'ı yalnızca **güvenli kaynakta** (HTTPS ya da `http://localhost`) çalıştırır. `http://192.168.x.x` üzerinden uygulama açılır ama kurulmaz ve çevrimdışı çalışmaz. Telefonda güvenli kaynak elde etmenin iki yolu:

**1) USB + adb** — hesap gerektirmez, tek seferlik.
Android [platform-tools](https://developer.android.com/tools/releases/platform-tools) (~10 MB) yeterli, tüm SDK gerekmez.

```powershell
adb reverse tcp:8080 tcp:8080
```

Telefonun Chrome'unda `http://localhost:8080` → menü → **Uygulamayı yükle**. Kurulumdan sonra bütün dosyalar önbellekte kalır; bilgisayar kapalıyken ve internet yokken de çalışır.

**2) GitHub Pages** — kalıcı adres, güncellemesi kolay.

`main` dalına her push'ta `.github/workflows/pages.yml` PWA'yı derleyip yayınlar. İlk seferde bir kez **Settings → Pages → Source: GitHub Actions** seçilmelidir; aksi halde iş akışı `configure-pages` adımında durur (varsayılan workflow token'ı Pages sitesini kendisi oluşturamıyor).

Sonrasında telefondan açılacak adres: <https://dropdeart.github.io/LingoTask/>

### Gerçek APK?

Capacitor ile APK üretilebilir ama **JDK 17 + Android SDK (~4 GB)** gerekir; bu makinede ikisi de yok (JDK 8 var). APK'nın PWA'ya göre tek pratik üstünlüğü Play Store'a yüklenebilmesi ve arka plan bildirimleri — kişisel kullanımda ikisi de gerekmiyor. İstenirse Capacitor yapılandırması + GitHub Actions iş akışı eklenip APK bulutta derlenebilir, böylece 4 GB'lık zinciri kurmaya gerek kalmaz.

## Mimari

Tek kullanıcılık, sunucusuz bir uygulama — ayrı bir API veya veritabanı yok.

```
src/
  shared/
    net.js       dört açık API — UMD, hem Node hem tarayıcıda aynı kod
  main/        Electron ana süreci
    main.js      pencere, IPC, atomik JSON kayıt
    preload.js   contextBridge ile güvenli köprü (window.lingo)
    api.js       shared/net + seslendirme, IPC yüzeyi
    tts.js       Windows SAPI seslendirme + disk cache
    tts.ps1      seslendirmeyi yapan PowerShell script'i
    updater.js   GitHub Releases üzerinden kendini güncelleme
  renderer/    arayüz — bağımlılıksız vanilla JS
    platform.js  platforma özgü HER ŞEY burada (depolama, ağ, ses)
    api.js       çevrimdışı farkındalıklı API katmanı: önbellek, algılama, birleştirme
    offline-check.js  ağsız gramer + yazım denetleyicisi
    app.js       durum, profiller, kalıcılık, yönlendirme, plan/ilerleme, metrikler
    util.js      tarih, metin karşılaştırma (Türkçe duyarlı), ses, band yardımcıları
    data/        kelime listesi, AWL, gramer konuları, topic'ler, testler, yazım sözlüğü
    views/       her sekme için bir dosya
    mobile.css   telefon düzeni (yalnız web sürümünde yüklenir)
build-web.js   dist-web/ üretir: CSP, manifest, service worker
serve-web.js   kurulum için statik sunucu
```

**Neden bu şekilde:** Görünümler hangi platformda olduklarını bilmez; platforma özgü her şey `platform.js` içindedir:

| | masaüstü | telefon |
|---|---|---|
| Depolama | profil başına JSON dosyası (atomik: tmp + rename) | IndexedDB, profil başına anahtar |
| Ağ | ana süreç (renderer CSP'si `connect-src 'none'`) | doğrudan sayfadan — dört API de CORS'a açık |
| Ses | Windows SAPI | cihazın kendi TTS motoru |

Veri masaüstünde `%APPDATA%\LingoTask\lingotask.json` içinde tutulur; geçici dosya + rename ile atomik yazılır, böylece çökme durumunda ilerleme bozulmaz.

## Profiller

Uygulamada hesap ya da sunucu yok, ama bir cihazı birden fazla kişi kullanabilir. Kurulum sırasında "kimin için" diye sorulmaz — kurulum tek tıkla biter, kim olduğun uygulamanın içinde seçilir.

Cihazda birden fazla profil varsa açılışta **Kim çalışıyor?** ekranı gelir; her satırda o profilin kelime sayısı ve sınava kalan günü görünür. Tek profil varsa doğrudan panele girilir. Çalışırken profil değiştirmek için sol üstteki logoya tıkla; telefonda logo gizli olduğu için aynı kontroller **Ayarlar → Profiller** altında.

Yeni bir profil ilk açılışta adım adım kurulum sihirbazından geçer: isim, sınav tarihi, hedef band, günlük kelime hedefi ve ses testi. Çalışma planı bu cevaplara göre kurulur.

Her profilin kendi sınav tarihi, hedef bandı, kelimeleri, yazıları, gramer sonuçları ve çalışma planı olur. Aralarında hiçbir şey paylaşılmaz — plan bile o profilin *kendi* ilk açılış gününden kendi sınav tarihine göre bölünür.

Depolama: masaüstünde profil başına ayrı dosya (`profiles.json` + `state-<id>.json`), telefonda IndexedDB'de ayrı anahtar. Ayrı dosya olması iki işe yarıyor — kaydetme yalnızca çalışılan profili yeniden yazar, ve bozulan bir dosya diğerlerini götürmez. Tek profilli eski kurulumlar ilk açılışta sessizce yeni düzene taşınır.

## Çevrimdışı mod

Kenar çubuğundaki rozete tıklayarak (veya Ayarlar → Bağlantı) açılır. Rozet üç durumu gösterir: çevrimiçi, bağlantı yok, çevrimdışı mod. `navigator.onLine` kaptif portal ya da ölü Wi-Fi durumunda yanılttığı için gerçek istek sonuçları da izlenir; bir istek başarısız olursa 30 saniye boyunca ağ denenmez, böylece her arama timeout beklemez.

**Ağsız da tam çalışan:** kelime çalışması ve tekrar, gramer dersleri ve testleri, Reading ve Listening testleri, seslendirme, yazma ve konuşma görevleri, çalışma planı, tüm ilerleme takibi.

**Ağsız değişen iki şey:**

- **Sözlük** → önbelleğe ve kendi kelime listene düşer. Aradığın her kelime kalıcı olarak önbelleğe alınır, yani çalıştıkça kişisel çevrimdışı sözlüğün büyür. Bulunamazsa bunu açıkça söyler.
- **Dil kontrolü** → `offline-check.js` devreye girer: 28 gramer kuralı (`data/grammar.js`'teki konuların aynısını hedefler) ve düzeltme sözlüğü + düzenleme mesafesiyle yazım denetimi. Bir kelime yalnızca hem bilinmiyor **hem de** bilinen bir kelimeye 1-2 düzenleme uzaklıktaysa işaretlenir; böylece sözlükte olmayan doğru bir kelime asla yanlış alarm üretmez. Ölçüm: hatalarla dolu bir metinde 15/15 hata yakalandı, temiz bir essay'de **0 yanlış pozitif**, 7 ms.

Bağlantı varken yerel kurallar yine çalışır ve LanguageTool'un bulgularıyla birleştirilir — LanguageTool daha geniş, yerel kurallar ise Türkçe konuşanlara özgü hataları yakalar.

### Seslendirme neden ana süreçte?

Chromium'un `speechSynthesis` API'si bu ortamda güvenilir değil: ses listesini saniyeler sonra dolduruyor, bu makinede 0–1 ses döndürüyor ve sistemde `en-GB` sesi olmadığında İngilizce metni Türkçe sesle okuyup anlaşılmaz hale getiriyor. Bunun yerine ses, ana süreçte Windows SAPI ile üretilip (`tts.ps1`) WAV olarak renderer'a veriliyor. İlk üretim ~300 ms, sonrası disk cache'inden anında geliyor. Ses ve okuma hızı Ayarlar'dan seçilebilir.

### Veri neden JSON, SQLite değil?

Bir yıllık yoğun kullanımda bile veri birkaç yüz KB'ta kalıyor (kelimeler, sonuçlar, yazılar ve düzeltmeler). SQLite bu ölçekte bir fayda getirmezken `better-sqlite3` native modülünü her Electron sürümü için yeniden derleme zorunluluğu getirirdi. Ses cache'i zaten JSON'un dışında, ayrı dosyalar olarak tutuluyor. Veri belirgin şekilde büyürse geçiş tek dosyada (`main.js`) izole.

## Dış servisler (hepsi ücretsiz, anahtar gerektirmez)

| Servis | Kullanım |
|---|---|
| Free Dictionary API | tanım, telaffuz, ses, örnek cümle |
| Wiktionary REST | sözlük yedeği (Free Dictionary sık sık 5xx döndürüyor) |
| MyMemory | İngilizce ↔ Türkçe çeviri ve alternatif karşılıklar |
| Datamuse | yazım önerisi |
| LanguageTool | gramer, yazım ve üslup kontrolü |

Hepsi CORS başlığı gönderdiği için telefon sürümü bunları doğrudan çağırır; proxy gerekmez.

İnternet yoksa uygulama çalışmaya devam eder — ayrıntı için yukarıdaki **Çevrimdışı mod** bölümüne bak.

## Özellikler

- **Panel** — kalan gün, günlük seri, beceri bazlı band tahminleri, kelime doğruluk oranı, günün görev listesi, ilerleme çubukları.
- **Çalışma Planı** — sınav tarihine kadar otomatik bölünen 6 adım. Her adımın sonunda Reading / Listening / **Gramer** / Writing / Speaking kontrol testi. `OTO` işaretli maddeler uygulamadaki gerçek ilerlemeye göre kendiliğinden tamamlanır (öğrenilen akademik kelime sayısı, geçilen gramer konusu, yazılan essay, yapılan düzeltme, çözülen test…). Kendi görev listeni de buradan yönetirsin.
- **Kelime** — 109 kelime (99'u AWL akademik) + kendi eklediklerin. Leitner aralıklı tekrar (1, 2, 4, 7, 15, 30 gün). Üstte öğrenilen sayısı, akademik oranı, **doğru/yanlış başarı yüzdesi** ve pekişmiş kelime sayısı. Listede kelime bazında doğru/yanlış ve başarı yüzdesi, akademik/genel etiketi; akademik, kendi eklediklerim, zorlandıklarım ve pekişmiş filtreleri. Yazım hatası ile yanlış cevap ayırt edilir: yazım hatası puanı düşürmez, kelime oturum sonunda tekrar sorulur.
- **Sözlük** — kelime arama (otomatik dil algılama), son aranılanlar, cümle içinde kullanım kontrolü, İngilizce–Türkçe eşleşme kontrolü.
- **Gramer** — IELTS Writing ve Speaking puanının %25'ini oluşturan Grammatical Range & Accuracy'yi hedefleyen 10 konu (zamanlar, artikeller, karmaşık cümle, relative clause, pasif, koşul cümleleri, sayılabilirlik, karşılaştırma, özne-yüklem uyumu). Her konuda kurallar, Türk öğrencilerin sık yaptığı hatalar ve 6 soruluk test (çoktan seçmeli, boşluk doldurma, hata düzeltme). Geçme sınırı %70.
- **Yazma** — her gün değişen Task 2 / Task 1 topic'i, zamanlayıcı, kelime sayacı, LanguageTool kontrolü ve 4 kritere göre tahmini band. **Geçmiş** sekmesinde yazdıklarını tekrar okursun; hatalar metnin içinde altı çizili gösterilir. **Düzeltilmiş halini yaz** ile aynı topic'i yeniden yazıp iki sürümü yan yana karşılaştırırsın (kriter kriter band değişimi ve kalan hata sayısı).
- **Konuşma** — Part 1 / Part 2 cue card, 1 dk hazırlık + 2 dk kayıt, mikrofon kaydı, tarayıcı konuşma tanıma ile otomatik transcript, akıcılık (kelime/dk, dolgu ifadeleri) analizi.
- **Testler** — 3 Reading passage, 3 Listening kaydı (Windows SAPI ile seslendirilir), True/False/Not Given, çoktan seçmeli ve boşluk doldurma soruları, ham puandan band tahmini.

## Notlar

Band tahminleri ölçülebilir göstergelerden (kelime sayısı, paragraf sayısı, bağlaç kullanımı, kelime çeşitliliği, hata yoğunluğu, konuşma hızı) hesaplanan kaba yönlendirmelerdir; resmî değerlendirme yerine geçmez. Telaffuz otomatik ölçülemediği için nötr varsayılır.
