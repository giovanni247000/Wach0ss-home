<div align="center">

<img src="./images/logo.png" width="180" alt="Wach0ss Home">

# 🌌 Wach0ss Home
**The smart home interface built around your home.**

**KNX · Home Assistant · Shelly · Sonos · Cameras · 3D**

[![Try the Demo](https://img.shields.io/badge/🚀_LIVE_DEMO-TRY_IT_NOW-FF0055?style=for-the-badge)](https://demo.wach0ss.com/mobile)

*Experience the fluid, app-like mobile interface directly in your browser. No installation required.*

<br>

[![Overview](https://img.shields.io/badge/OVERVIEW-7C3AED?style=for-the-badge)](#-overview)
[![Features](https://img.shields.io/badge/FEATURES-2563EB?style=for-the-badge)](#-features)
[![Installation](https://img.shields.io/badge/INSTALLATION-059669?style=for-the-badge)](#-installation)
[![Gallery](https://img.shields.io/badge/GALLERY-DB2777?style=for-the-badge)](#-gallery)

<br>

![Version](https://img.shields.io/badge/version-1.0.0-8B5CF6?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-supported-FCC624?style=flat-square&logo=linux&logoColor=black)
![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-supported-C51A4A?style=flat-square&logo=raspberrypi&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-22C55E?style=flat-square)

> **Wach0ss Home transforms your entire home into an interactive digital environment.**

</div>

---

## ✦ Overview

Wach0ss Home is a **self-hosted smart home platform** designed to bring multiple ecosystems together inside a single interface. Instead of switching between different applications, dashboards, and manufacturers, Wach0ss Home creates a unified control layer for your home.

At its core is an interactive **3D representation of your environment**, allowing physical devices to become part of the digital space.

*   Lights.
*   Shutters.
*   Sensors.
*   Cameras.
*   Audio & Security.

**Everything lives in one place.**

<div align="center">
  <img src="./images/dashboard.png" width="100%" alt="Wach0ss Home Dashboard" style="border-radius: 8px;">
</div>

---

## ⚡ Features

| 🧊 Interactive 3D Home | 🔌 Multi-System Integration |
| :--- | :--- |
| Bring your real environment into the interface using custom `.glb` models. Interact directly with your rooms and devices through a digital representation of your home.<br><br>**Your house becomes the interface.** | Connect multiple ecosystems through a unified control layer:<br>• KNX<br>• Home Assistant<br>• Shelly Gen 1 / Gen 2<br>• Sonos<br>• Network devices<br><br>**No fragmented dashboards.** |

| 🎥 Real-Time Cameras | 🧠 Automation Engine & 🛡️ Security |
| :--- | :--- |
| Integrated video streaming powered by OpenCV with support for RTSP sources. Designed for low-latency monitoring and continuous operation on lightweight hardware like Raspberry Pi. | Build complex automations based on time, state, and scenarios. Includes a complete alarm workflow with PIN keypad, siren activation, Sonos alerts, and Telegram emergency notifications. |

---

## 🏠 The Digital Twin & Architecture

One of the main ideas behind Wach0ss Home is simple:
> **Why control your home through a list of devices when you can control it through the home itself?**

Import your own `.glb` model and turn your environment into an interactive digital twin. Tap the light, move the shutter, check the sensor, enter the room—everything happens directly inside the model.

### System Architecture
Wach0ss Home acts as an abstraction layer between the user interface and the different systems installed in the house.


                         ┌─────────────────────┐
                         │    WACH0SS HOME     │
                         │      INTERFACE      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
             KNX BUS          HOME ASSISTANT         SHELLY
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                              DEVICE LAYER
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
               LIGHTS            SENSORS            SHUTTERS
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                              PHYSICAL HOME


💻 Installation
Wach0ss Home is designed primarily for Linux systems and Raspberry Pi.

Requirements:

🐧 Linux (Raspberry Pi or another Linux machine)

🐍 Python 3.9 or newer

📦 Git & sudo privileges

One-Command Installation:
The easiest way to install Wach0ss Home is to clone the repository directly into /opt and run the installation script.



# 1. Clone the repository
```bash
sudo git clone [https://github.com/giovanni247000/Wach0ss-Home.git](https://github.com/giovanni247000/Wach0ss-Home.git) /opt/wach_os
```

# 2. Run the installer
```bash
sudo bash /opt/wach_os/install.sh
```

📸 Gallery
Camera Monitoring




Mobile Interface


🛠️ Technology Stack & Roadmap
Currently Supported:

KNX, Home Assistant, Shelly, and Sonos integrations.

Interactive 3D environment & digital twin.

Full alarm system (PIN, entry/exit delays, Telegram/Sonos alerts).

Cloudflare & ZeroTier integration for remote access.

Coming Soon:

Advanced 3D interactions and improved mobile experience.

Advanced automation editor and AI-assisted routines.

Energy monitoring & presence detection.

🤝 Contributing & Support
Wach0ss Home is a personal project, but contributions, ideas, and feedback are highly welcome. If you are experimenting with Wach0ss Home or have an idea, feel free to open an issue in the repository.







⭐ If you like the project, consider giving it a star.


Wach0ss Home · Smart Home Platform · Self Hosted


