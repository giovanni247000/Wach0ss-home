#!/bin/bash

# Controllo permessi root
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[1;31mPer favore, esegui questo script con sudo\e[0m"
  exit
fi

INSTALL_DIR="/opt/wach_os"

echo -e "\e[1;36m[>] Preparazione del sistema Wach OS in corso...\e[0m"

# 1. Aggiornamento e installazione DIPENDENZE DI SISTEMA
apt-get update -y > /dev/null 2>&1
apt-get install python3 python3-pip git libglib2.0-0 libsm6 libxext6 libxrender-dev -y > /dev/null 2>&1

# 2. Installazione librerie Python a livello GLOBALE (Niente venv)
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
echo -e "\e[1;36m[>] Installazione delle librerie Python a livello globale...\e[0m"
pip3 install flask requests opencv-python-headless xknx soco zeroconf --break-system-packages > /dev/null 2>&1

# 3. Rendiamo eseguibile lo script di aggiornamento (se esiste)
chmod +x $INSTALL_DIR/update.sh 2>/dev/null || true

# 4. Creazione del servizio Systemd (per l'avvio automatico)
cat <<EOF > /etc/systemd/system/wach_os.service
[Unit]
Description=Wach OS System
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR
# Esegue il lanciatore main.py usando il Python di sistema globale
ExecStart=/usr/bin/python3 $INSTALL_DIR/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 5. Avvio del servizio
echo -e "\e[1;36m[>] Configurazione dei servizi di avvio automatico...\e[0m"
systemctl daemon-reload
systemctl enable wach_os > /dev/null 2>&1
systemctl restart wach_os

# ==========================================
# 6. ANIMAZIONE E OUTPUT FINALE MIGLIORATO
# ==========================================

clear
IP=$(hostname -I | awk '{print $1}')
PORT=5001

# Effetto barra di caricamento
echo -e "\e[1;37mAvvio motore di sistema...\e[0m"
echo -ne "\e[1;34m[\e[0m"
for i in {1..40}; do
    echo -ne "\e[1;36m█\e[0m"
    sleep 0.05
done
echo -e "\e[1;34m]\e[0m"
sleep 0.5

clear

# Logo ASCII "Pieno"
logo=(
"██╗    ██╗ █████╗  ██████╗██╗  ██╗     ██████╗ ███████╗"
"██║    ██║██╔══██╗██╔════╝██║  ██║    ██╔═══██╗██╔════╝"
"██║ █╗ ██║███████║██║     ███████║    ██║   ██║███████╗"
"██║███╗██║██╔══██║██║     ██╔══██║    ██║   ██║╚════██║"
"╚███╔███╔╝██║  ██║╚██████╗██║  ██║    ╚██████╔╝███████║"
" ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝"
)

# Comparsa riga per riga dall'alto verso il basso (Effetto drop)
for line in "${logo[@]}"; do
    echo -e "\e[1;36m$line\e[0m"
    sleep 0.15
done
sleep 0.3

# Effetto RGB Lampeggiante super colorato
colors=("\e[1;31m" "\e[1;35m" "\e[1;34m" "\e[1;36m" "\e[1;32m" "\e[1;33m" "\e[1;37m")
for i in {1..10}; do
    clear
    color=${colors[$RANDOM % ${#colors[@]}]}
    for line in "${logo[@]}"; do
        echo -e "${color}$line\e[0m"
    done
    sleep 0.15
done

# Fissaggio finale in Verde Fluo (Successo)
clear
for line in "${logo[@]}"; do
    echo -e "\e[1;32m$line\e[0m"
done

echo ""
echo -e "\e[1;37m=======================================================\e[0m"
echo -e "       \e[1;32m✨ INSTALLAZIONE COMPLETATA CON SUCCESSO! ✨\e[0m"
echo -e "\e[1;37m=======================================================\e[0m"
echo -e "\e[1;33m 🚀 Il sistema è attivo in background e partirà da solo\e[0m"
echo -e "\e[1;33m    ad ogni riavvio del Raspberry.\e[0m"
echo ""
echo -e " \e[1;37m🌐 Puoi accedere alla Dashboard da qualsiasi browser:\e[0m"
echo -e " \e[1;36m➜  http://${IP}:${PORT}\e[0m"
echo ""
echo -e "\e[1;90m [Premi INVIO per tornare al terminale]\e[0m"
read -r