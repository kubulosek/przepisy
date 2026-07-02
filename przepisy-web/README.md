# Przepisy — aplikacja webowa (PWA)

Twoje autorskie przepisy w aplikacji, która działa na **Macu i iPhone** w przeglądarce —
**bez konta Apple, bez Xcode, bez App Store**. Dane trzymane są **lokalnie** na urządzeniu
(w przeglądarce, w IndexedDB), w pełni offline.

## Uruchomienie na Macu

Aplikacja to zwykłe pliki statyczne, ale trzeba je „podać" przez mały serwer
(część funkcji, m.in. tryb offline, nie działa z pliku otwartego bez serwera).

W Terminalu:

```bash
cd ~/IdeaProjects/przepisy-web
python3 -m http.server 8000
```

Następnie otwórz w przeglądarce: **http://localhost:8000**

To wszystko — przy pierwszym uruchomieniu pojawią się przykładowe przepisy i składniki.

### Zainstaluj jako aplikację (Mac)
- **Safari:** menu **Plik → Dodaj do Docka**.
- **Chrome/Edge:** ikona instalacji po prawej w pasku adresu (albo menu → „Zainstaluj Przepisy").

Wtedy aplikacja dostaje własną ikonę i okno, i działa offline.

## Uruchomienie na iPhone

Ponieważ nie chcesz konta Apple, iPhone łączy się z aplikacją serwowaną z Twojego Maca.

1. Mac i iPhone w tej samej sieci Wi‑Fi.
2. Na Macu uruchom serwer (jak wyżej).
3. Sprawdź adres IP Maca: **Ustawienia systemowe → Wi‑Fi → Szczegóły** (np. `192.168.0.12`).
4. Na iPhone w Safari wejdź na `http://ADRES-IP-MACA:8000` (np. `http://192.168.0.12:8000`).
5. **Udostępnij → Dodaj do ekranu początkowego** — pojawi się ikona jak zwykła apka.

> Uwaga: przez zwykłe `http` w sieci lokalnej apka działa tylko przy połączeniu z Makiem
> (dane się zapisują, ale nie ma trybu offline). Żeby używać apki **offline w sklepie,
> bez Maca i bez hostingu** — patrz **[OFFLINE-IPHONE.md](OFFLINE-IPHONE.md)**
> (jednorazowa instalacja przez `python3 serve-https.py`).

## Dane i przenoszenie między urządzeniami

Dane są **osobne dla każdej przeglądarki/urządzenia** (zero chmury — zgodnie z założeniem).
Aby przenieść przepisy z Maca na iPhone (lub zrobić backup):

- **Ustawienia → Eksportuj do pliku** → zapisze plik JSON.
- Prześlij plik na drugie urządzenie i **Ustawienia → Importuj z pliku**.

Import **dodaje** dane, nie kasuje istniejących.

## Funkcje

- **Przepisy:** nazwa, opis, zdjęcie, składniki (ilość + jednostka + uwagi), kroki,
  wartości odżywcze (opcjonalne), tagi/kategorie, porcje, czas przygotowania i gotowania,
  link do źródła/inspiracji, ocena, ulubione.
- **Tagi w 4 wymiarach:** kuchnia, rodzaj posiłku, właściwości/dieta (np. „bogate w żelazo"),
  sprzęt (patelnia, piekarnik, airfryer…), plus własne etykiety.
- **Filtrowanie i wyszukiwanie** po nazwie, składniku, tagach, kategoriach, ulubionych + sortowanie.
- **Skalowanie porcji** — automatyczne przeliczanie ilości składników.
- **Tryb gotowania** — pełny ekran, duży tekst krok po kroku, minutniki, blokada wygaszania ekranu.
- **Spiżarnia** — ulubione składniki z kategorią, jednostką, emoji i wartościami na 100 g/ml
  (służą do szacowania wartości odżywczych przepisu).
- **Lista zakupów** — dodawanie z przepisu (z przeliczeniem porcji i scalaniem), grupowanie,
  odhaczanie, pozycje ręczne.
- **Kopia zapasowa** — eksport/import JSON. Udostępnianie przepisu jako tekst.

## Struktura

```
przepisy-web/
├─ index.html          # szkielet + meta PWA
├─ styles.css          # style (jasny/ciemny, responsywne)
├─ app.js              # cała logika, widoki, baza IndexedDB
├─ sw.js               # service worker (offline)
├─ manifest.webmanifest
└─ icons/              # ikony (SVG + PNG)
```
