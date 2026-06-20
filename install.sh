#!/bin/bash

# Controllo permessi root
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[1;31mPer favore, esegui questo script con sudo\e[0m"
  exit
fi

INSTALL_DIR="/opt/wach_os"

echo "Preparazione del sistema Wach OS in corso..."

# 1. Aggiornamento e installazione DIPENDENZE DI SISTEMA (Incluso Fix per OpenCV)
apt-get update -y > /dev/null 2>&1
apt-get install python3 python3-pip python3-venv git libglib2.0-0 libsm6 libxext6 libxrender-dev -y > /dev/null 2>&1

# 2. Creazione dell'ambiente virtuale e installazione librerie Python
cd $INSTALL_DIR
echo "Installazione delle librerie Python..."
python3 -m venv venv
$INSTALL_DIR/venv/bin/pip install -r requirements.txt > /dev/null 2>&1

# 3. Rendiamo eseguibile lo script di aggiornamento
chmod +x $INSTALL_DIR/update.sh

# 4. Creazione del servizio Systemd (per l'avvio automatico)
cat <<EOF > /etc/systemd/system/wach_os.service
[Unit]
Description=Wach OS System
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR
# Esegue il lanciatore main.py usando l'ambiente virtuale
ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 5. Avvio del servizio
systemctl daemon-reload
systemctl enable wach_os > /dev/null 2>&1
systemctl restart wach_os

# 6. Animazione e Output Finale
IP=$(hostname -I | awk '{print $1}')
PORT=5001

clear
colors=("\e[1;31m" "\e[1;32m" "\e[1;33m" "\e[1;34m" "\e[1;35m" "\e[1;36m")

echo -ne "Booting Wach OS "
for i in {1..5}; do
    echo -ne "."
    sleep 0.4
done

for i in {1..6}; do
    clear
    color=${colors[$RANDOM % ${#colors[@]}]}
    echo -e "${color}"
    echo '  _       __           __       ____  _____'
    echo ' | |     / /___ ______/ /_     / __ \/ ___/'
    echo ' | | /| / / __ `/ ___/ __ \   / / / /\__ \ '
    echo ' | |/ |/ / /_/ / /__/ / / /  / /_/ /___/ / '
    echo ' |__/|__/\__,_/\___/_/ /_/   \____//____/  '
    echo '                                           '
    echo -e "\e[0m"
    sleep 0.3
done

clear
echo -e "\e[1;32m"
echo '  _       __           __       ____  _____'
echo ' | |     / /___ ______/ /_     / __ \/ ___/'
echo ' | | /| / / __ `/ ___/ __ \   / / / /\__ \ '
echo ' | |/ |/ / /_/ / /__/ / / /  / /_/ /___/ / '
echo ' |__/|__/\__,_/\___/_/ /_/   \____//____/  '
echo '                                           '
echo -e "\e[0m"

echo -e "\e[1;37m==========================================\e[0m"
echo -e "\e[1;36m INSTALLAZIONE COMPLETATA CON SUCCESSO! \e[0m"
echo -e "\e[1;37m==========================================\e[0m"
echo -e "\e[1;33m Il sistema è attivo e partirà ad ogni riavvio.\e[0m"
echo ""
echo -e " \e[1;37mPuoi accedere a Wach OS a questo indirizzo:\e[0m"
echo -e " \e[1;32m➜  http://${IP}:${PORT}\e[0m"
echo ""