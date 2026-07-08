<div align="center">

  <!-- SOSTITUISCI QUESTO LINK CON IL TUO LOGO REALE -->
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/RaspberryPi-Dark.svg" alt="Wach0ss Home Logo" width="150" />

  <h1>🌌 Wach0ss Home</h1>

  <p>
    <em>L'Hub Domotico Definitivo: leggero, multipiattaforma e dal design accattivante. Unisce KNX, Home Assistant, Shelly e Sonos in un'unica interfaccia 3D.</em>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Versione-1.0.0-blueviolet?style=for-the-badge" alt="Versione" />
    <img src="https://img.shields.io/badge/Python-3.9+-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
    <img src="https://img.shields.io/badge/Flask-Web_Framework-white?style=for-the-badge&logo=flask&logoColor=black" alt="Flask" />
    <img src="https://img.shields.io/badge/Stato-Attivo-success?style=for-the-badge" alt="Stato" />
  </p>
  
  <p>
    <a href="#-esplora-il-progetto">Esplora</a> •
    <a href="#-funzionalità-principali">Funzioni</a> •
    <a href="#-installazione-linuxraspberry-pi">Installazione</a> •
    <a href="#-screenshot">Galleria</a>
  </p>

</div>

<br/>

## 🚀 Esplora il Progetto

**Wach0ss Home** non è solo una dashboard, è un vero e proprio server domestico indipendente. Nato per superare i limiti di integrazione, permette di gestire la tua casa tramite un'interfaccia intuitiva, supportando piantine 3D interattive e un motore di automazione logica integrato.

Ideale per girare su **Raspberry Pi**, server Linux o macchine Windows, garantisce accesso remoto sicuro tramite Cloudflare Tunnels e ZeroTier, tutto configurabile con un click.

---

## ✨ Funzionalità Principali

Ho sviluppato questo sistema per renderlo un vero "coltellino svizzero" per la domotica:

*   🔌 **Integrazione Universale Nativia:** 
    *   **KNX:** Controllo diretto su bus (Luci, Tapparelle, Dimmer).
    *   **Home Assistant:** Collega più istanze HA e sincronizza le entità.
    *   **Shelly:** Auto-discovery locale (Gen 1 & Gen 2).
    *   **Sonos:** Rilevamento automatico e riproduzione multi-room.
    *   **Tapo:** Streaming RTSP in tempo reale con anti-lag (tramite OpenCV).
*   🗺️ **Piantine 3D Interattive:** Carica i tuoi modelli `.glb` per controllare le luci direttamente dalla riproduzione 3D della tua casa.
*   🧠 **Motore Automazioni & Scenari:** Crea routine basate su orari, stati o range temporali. Salva lo stato attuale della casa in uno "Scenario" (Snapshot) richiamabile in un click.
*   🚨 **Sistema di Allarme Integrato:** Sicurezza con PIN, ritardo di uscita, attivazione sirene via Sonos e notifiche Telegram.
*   🌍 **Accesso Remoto 1-Click:** Installazione automatica di Cloudflare e ZeroTier integrata direttamente nell'interfaccia.
*   🔐 **Sicurezza Avanzata:** Sistema di blocco IP per tentativi falliti, gestione utenti (Admin/User) e verifica licenza tramite Hardware ID.

---

## 📸 Galleria Immagini

*(Inserisci qui gli screenshot della tua app. Usa file `.png` o `.gif` per mostrare le piantine 3D!)*

<div align="center">
  <table>
    <tr>
      <td align="center"><b>Dashboard Mobile</b></td>
      <td align="center"><b>Editor Piantine 3D</b></td>
    </tr>
    <tr>
      <td>
        <img src="https://images.unsplash.com/photo-1558002038-1055907df827?w=500&q=80" alt="Mobile App" style="border-radius: 10px;" width="350"/>
      </td>
      <td>
        <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&q=80" alt="3D Floorplan" style="border-radius: 10px;" width="350"/>
      </td>
    </tr>
  </table>
</div>

---

## 🛠 Prerequisiti

Essendo un ecosistema completo, assicurati che il tuo server disponga di:

*   **Python 3.8+**
*   **FFmpeg** (Necessario per lo streaming delle telecamere RTSP)
*   Accesso Root/Sudo (per le configurazioni di rete avanzate e i servizi)

---

## 💻 Installazione (Linux/Raspberry Pi)

Il metodo di installazione è stato ottimizzato per sistemi basati su Debian/Ubuntu. Segui questi passaggi nel terminale:

### 1. Clona e Installa
Lancia l'installazione automatica che preparerà l'ambiente `/opt/wach_os` e installerà tutte le dipendenze Python:

```bash
git clone [https://github.com/giovanni247000/Wach0ss-home.git](https://github.com/giovanni247000/Wach0ss-home.git) /opt/wach_os
cd /opt/wach_os
sudo bash install.sh
