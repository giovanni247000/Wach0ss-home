<div align="center">

  <img src="./images/logo.png" width="220" alt="Wach0ss Home Logo" style="border-radius: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">

  <br><br>

  <h1>🌌 Wach0ss Home</h1>
  
  <p>
    <b>L'Hub Domotico di Prossima Generazione.</b><br>
    <em>Fondi KNX, Home Assistant, Shelly e Sonos in un'unica, sbalorditiva interfaccia 3D.</em>
  </p>

  <br>

  <p>
    <img src="https://img.shields.io/badge/Versione-1.0.0-blueviolet?style=for-the-badge&logo=git" alt="Versione" />
    <img src="https://img.shields.io/badge/Python-3.9+-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
    <img src="https://img.shields.io/badge/Ambiente-Linux%20%7C%20Raspberry-ff9900?style=for-the-badge&logo=raspberry-pi&logoColor=white" alt="Platform" />
    <img src="https://img.shields.io/badge/Stato-In_Sviluppo-success?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Stato" />
  </p>
  
  <br>

  <p>
    <a href="#-la-visione"><b>Esplora</b></a> •
    <a href="#-core-features"><b>Funzionalità</b></a> •
    <a href="#-installazione-one-click"><b>Installazione</b></a> •
    <a href="#-galleria-interfacce"><b>Galleria</b></a> •
    <a href="#-supporto-e-contatti"><b>Contatti</b></a>
  </p>

  <br>

</div>

---

## 🚀 La Visione

> **Wach0ss Home non è una semplice dashboard, è il cervello della tua casa.** 

Progettato per abbattere ogni barriera di integrazione, Wach0ss Home si posiziona come un vero e proprio server domotico indipendente. Ti offre il potere di mappare i tuoi ambienti attraverso **gemelli digitali 3D interattivi** e di governare ogni dispositivo con un motore logico di livello industriale. 

Ottimizzato al millesimo di secondo per ambienti Linux e **Raspberry Pi**, integra nativamente tunnel di accesso remoto sicuro (ZeroTier e Cloudflare), portando il controllo globale della tua casa letteralmente a un click di distanza.

---

## ✨ Core Features

Wach0ss Home è stato ingegnerizzato per offrire un'esperienza fluida, potente e senza compromessi:

*   ⚡ **Integrazione Assoluta:** Controllo nativo e istantaneo sul bus **KNX**, auto-discovery locale per dispositivi **Shelly** (Gen 1 & 2), rilevamento automatico dell'ecosistema **Sonos** e una sinergia profonda con **Home Assistant**.
*   🧊 **Gemello Digitale 3D:** Porta la tua casa nel futuro. Carica i tuoi modelli `.glb` personalizzati e interagisci con luci, tapparelle e sensori cliccando direttamente sulla riproduzione tridimensionale dei tuoi ambienti.
*   🎥 **Visione Real-Time Anti-Lag:** Motore di streaming video proprietario accelerato tramite OpenCV. Goditi i flussi RTSP delle tue telecamere (es. Tapo) in tempo reale, senza scatti o ritardi.
*   🧠 **Motore Logico Neurale:** Costruisci automazioni complesse senza limiti. Crea routine basate su orari, stati o range temporali, e genera "Snapshots" istantanei per richiamare scenari perfetti in un secondo.
*   🛡️ **Sicurezza Integrata di Livello Pro:** Sistema di allarme avanzato con tastierino PIN, gestione dei ritardi di uscita, attivazione sirene via Sonos e notifiche di emergenza immediate tramite Telegram.
*   🌐 **Connettività Globale 1-Click:** Dimentica le configurazioni di rete complesse. Demoni Cloudflare e ZeroTier preconfigurati e pronti all'uso per un accesso remoto blindato e istantaneo.

---

## 💻 Installazione One-Click

Abbiamo reso il deployment un'esperienza magica. Il sistema è ottimizzato per **Linux e Raspberry Pi**. 

Non dovrai configurare decine di file: ti basta **un singolo comando** per clonare la repository, generare l'ambiente dedicato in `/opt/` e avviare il setup automatico di tutte le dipendenze.

> **Note:** Assicurati di avere i privilegi di amministratore (`sudo`) prima di lanciare lo script.

```bash
git clone [https://github.com/giovanni247000/Wach0ss-Home.git](https://github.com/giovanni247000/Wach0ss-Home.git) /opt/wach_os && sudo bash /opt/wach_os/install.sh
