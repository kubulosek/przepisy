#!/usr/bin/env python3
"""
Serwer HTTPS dla aplikacji Przepisy — do JEDNORAZOWEJ instalacji PWA na iPhonie,
żeby działała potem w pełni offline (np. w sklepie), bez Maca i bez internetu.

Użycie:
    python3 serve-https.py

Skrypt sam wygeneruje certyfikat (jeśli go nie ma) i wystartuje serwer.
Zatrzymanie: Ctrl+C.
"""

import http.server
import ssl
import socket
import subprocess
import sys
import os

PORT = 8443
HERE = os.path.dirname(os.path.abspath(__file__))
CERT = os.path.join(HERE, "cert.pem")
KEY = os.path.join(HERE, "key.pem")


def lan_ip() -> str:
    """Adres IP Maca w sieci lokalnej."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def local_hostname() -> str:
    name = socket.gethostname()
    return name if name.endswith(".local") else name + ".local"


def make_cert(ip: str, host: str) -> None:
    """Generuje samopodpisany certyfikat z SAN (działa z LibreSSL na macOS)."""
    cnf = os.path.join(HERE, "_openssl.cnf")
    with open(cnf, "w") as f:
        f.write(f"""[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = Przepisy Local
[v3]
subjectAltName = @san
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
[san]
DNS.1 = localhost
DNS.2 = {host}
IP.1 = 127.0.0.1
IP.2 = {ip}
""")
    print("Generuję certyfikat (jednorazowo)…")
    subprocess.check_call([
        "openssl", "req", "-x509", "-nodes", "-newkey", "rsa:2048",
        "-keyout", KEY, "-out", CERT, "-days", "800", "-sha256",
        "-config", cnf, "-extensions", "v3",
    ])
    os.remove(cnf)


def main() -> None:
    ip = lan_ip()
    host = local_hostname()

    if not (os.path.exists(CERT) and os.path.exists(KEY)):
        try:
            make_cert(ip, host)
        except Exception as e:
            print(f"Nie udało się wygenerować certyfikatu: {e}")
            sys.exit(1)

    os.chdir(HERE)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(CERT, KEY)

    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), http.server.SimpleHTTPRequestHandler)
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    line = "─" * 58
    print(f"""
{line}
  Przepisy — serwer HTTPS uruchomiony ✅
{line}

  Na Macu:      https://localhost:{PORT}

  Na iPhonie (ta sama sieć Wi-Fi), wpisz w Safari:
      https://{host}:{PORT}
      lub
      https://{ip}:{PORT}

  KROK 1 (raz): zaufaj certyfikatowi na iPhonie — patrz OFFLINE-IPHONE.md
  KROK 2 (raz): w Safari „Udostępnij → Dodaj do ekranu początkowego"
  KROK 3: gotowe — apka działa offline w sklepie, bez Maca.

  Plik certyfikatu do wysłania na telefon:  cert.pem
  Zatrzymanie serwera: Ctrl+C
{line}
""")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nZatrzymano serwer.")


if __name__ == "__main__":
    main()
