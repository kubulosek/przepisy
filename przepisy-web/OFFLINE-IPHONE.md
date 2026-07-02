# Pełny tryb offline na iPhone (bez hostingu)

Cel: zainstalować „Przepisy" na iPhonie tak, żeby działały **w sklepie — offline,
bez Maca i bez internetu**. Robi się to **raz**. Potem apka żyje w telefonie z lokalnej
kopii, a dane (przepisy, lista zakupów) są zapisane na urządzeniu.

Dlaczego tak: tryb offline (service worker) Safari włącza tylko przy połączeniu
`https`. Dlatego jednorazowo serwujemy apkę z Maca przez HTTPS i ufamy certyfikatowi.

---

## Krok 0 — uruchom serwer HTTPS na Macu

Mac i iPhone w tej samej sieci Wi-Fi. W Terminalu:

```bash
cd ~/IdeaProjects/przepisy-web
python3 serve-https.py
```

Skrypt wypisze dwa adresy dla iPhone’a, np.:
```
https://MacBook.local:8443
https://192.168.0.12:8443
```
Zostaw serwer uruchomiony do końca instalacji.

## Krok 1 — przenieś certyfikat na iPhone

W folderze `przepisy-web` powstał plik **`cert.pem`**.
- **AirDrop:** kliknij `cert.pem` prawym → Udostępnij → AirDrop → Twój iPhone.
- (albo wyślij go sobie mailem i otwórz na telefonie).

## Krok 2 — zainstaluj i zaufaj certyfikatowi (na iPhone)

1. Po odebraniu pliku iPhone pokaże „Profil pobrany".
2. **Ustawienia → Ogólne → VPN i zarządzanie urządzeniem** → wybierz profil
   **„Przepisy Local"** → **Zainstaluj** (podaj kod). 
3. Włącz pełne zaufanie: **Ustawienia → Ogólne → Informacje → Ustawienia zaufania
   certyfikatów** → **włącz przełącznik** przy „Przepisy Local".

## Krok 3 — otwórz apkę i dodaj do ekranu początkowego

1. W **Safari** wejdź na adres z Kroku 0 (np. `https://MacBook.local:8443`).
   Powinno otworzyć się **bez ostrzeżenia** (kłódka OK).
2. **Udostępnij (kwadrat ze strzałką) → Dodaj do ekranu początkowego**.
3. Otwórz „Przepisy" z ekranu początkowego **jeszcze przy połączeniu z Makiem** —
   w tym momencie telefon zapisuje całą apkę offline.

## Krok 4 — sprawdź offline

- Włącz **Tryb samolotowy** (albo wyjdź poza zasięg Wi-Fi) i otwórz „Przepisy”
  z ekranu początkowego. Jeśli się otwiera i widzisz przepisy — **gotowe**.
- Możesz zamknąć serwer na Macu (Ctrl+C). Apka działa już samodzielnie w sklepie.

---

## Dobrze wiedzieć

- **Dane są w telefonie**, lokalnie. Certyfikat i serwer służą tylko do instalacji —
  nic nie jest nigdzie wysyłane.
- iOS po dłuższym czasie nieużywania *może* wyczyścić cache aplikacji. Jeśli kiedyś
  apka przestanie otwierać się offline, po prostu podłącz się raz do serwera na Macu
  (Krok 0 + otwórz apkę) — odświeży kopię.
- Rób od czasu do czasu **Ustawienia → Eksportuj do pliku** (backup przepisów).
- Jeśli `…​.local` nie działa, użyj adresu z IP (ten sam Krok 0). Adres IP może się
  zmienić przy zmianie sieci — wtedy uruchom `serve-https.py` ponownie
  (wygeneruje certyfikat pasujący do nowego adresu).

## Gdybyś jednak zmienił zdanie co do hostingu
Najprostszy wariant to wrzucić folder `przepisy-web` na darmowy hosting statyczny
z `https` (np. GitHub Pages / Cloudflare Pages). Wtedy instalacja na iPhone to samo
„otwórz link → Dodaj do ekranu początkowego”, bez certyfikatu. Dane i tak zostają
lokalnie w telefonie — hosting jedynie udostępnia pliki aplikacji.
