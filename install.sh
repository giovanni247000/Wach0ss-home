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

# Logo ASCII Base (Senza backslash da raddoppiare)
logo_base=(
'██╗    ██╗ █████╗  ██████╗██╗  ██╗     ██████╗ ███████╗'
'██║    ██║██╔══██╗██╔════╝██║  ██║    ██╔═══██╗██╔════╝'
'██║ █╗ ██║███████║██║     ███████║    ██║   ██║███████╗'
'██║███╗██║██╔══██║██║     ██╔══██║    ██║   ██║╚════██║'
'╚███╔███╔╝██║  ██║╚██████╗██║  ██║    ╚██████╔╝███████║'
' ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝'
'                                                       '
)

# Frame di animazione del fumo
S='                           (  )'
M='                          (    )'
L='                         (      )'

smoke_1=( "$L" "$M" "$S" )
smoke_2=( "$S" "$L" "$M" )
smoke_3=( "$M" "$S" "$L" )

# Casetta SPENTA (Doppi backslash \\ per allineamento perfetto con printf %b)
house_off=(
'                         _||_'
'                ________|====|________'
'              //::::::::::::::::::::::\\\\'
'            //::::::::::::::::::::::::::\\\\'
'          //:::::::::: WACH  OS ::::::::::\\\\'
'        //__________________________________\\\\'
'        ||                                  ||'
'        ||  _[]_    \\ \\        / /    _[]_  ||'
'        || [____]    \\ \\  /\\  / /    [____] ||'
'        ||            \\ \\/  \\/ /            ||'
'        ||             \\__/\\__/             ||'
'        ||                                  ||'
'        ||  _[]_       .------.       _[]_  ||'
'        || [____]      |      |      [____] ||'
'        ||_____________|______|_____________||'
)

# Casetta ACCESA (Include codici di colore giallo \e[1;33m per finestre/porta e ripristina il verde \e[1;32m)
house_on=(
'                         _||_'
'                ________|====|________'
'              //::::::::::::::::::::::\\\\'
'            //::::::::::::::::::::::::::\\\\'
'          //:::::::::: WACH  OS ::::::::::\\\\'
'        //__________________________________\\\\'
'        ||                                  ||'
'        ||  \e[1;33m_██_\e[1;32m    \\ \\        / /    \e[1;33m_██_\e[1;32m  ||'
'        || \e[1;33m[████]\e[1;32m    \\ \\  /\\  / /    \e[1;33m[████]\e[1;32m ||'
'        ||            \\ \\/  \\/ /            ||'
'        ||             \\__/\\__/             ||'
'        ||                                  ||'
'        ||  \e[1;33m_██_\e[1;32m       .------.       \e[1;33m_██_\e[1;32m  ||'
'        || \e[1;33m[████]\e[1;32m      | \e[1;33m████\e[1;32m |      \e[1;33m[████]\e[1;32m ||'
'        ||_____________|______|_____________||'
)

# Composizione dei Fotogrammi LUCI SPENTE
logo_off_f1=("${logo_base[@]}" "${smoke_1[@]}" "${house_off[@]}")
logo_off_f2=("${logo_base[@]}" "${smoke_2[@]}" "${house_off[@]}")
logo_off_f3=("${logo_base[@]}" "${smoke_3[@]}" "${house_off[@]}")

# Composizione dei Fotogrammi LUCI ACCESE
logo_on_f1=("${logo_base[@]}" "${smoke_1[@]}" "${house_on[@]}")
logo_on_f2=("${logo_base[@]}" "${smoke_2[@]}" "${house_on[@]}")
logo_on_f3=("${logo_base[@]}" "${smoke_3[@]}" "${house_on[@]}")

# 1. Comparsa riga per riga dall'alto verso il basso (Effetto drop)
for line in "${logo_off_f1[@]}"; do
    printf "%b%b\e[0m\n" "\e[1;36m" "$line"
    sleep 0.1
done
sleep 0.3

# 2. Effetto RGB Lampeggiante per l'avvio del sistema (Luci spente)
colors=("\e[1;31m" "\e[1;35m" "\e[1;34m" "\e[1;36m" "\e[1;32m" "\e[1;33m" "\e[1;37m")
for i in {1..12}; do
    clear
    color=${colors[$RANDOM % ${#colors[@]}]}
    
    if [ $((i % 3)) -eq 0 ]; then current_frame=("${logo_off_f1[@]}"); fi
    if [ $((i % 3)) -eq 1 ]; then current_frame=("${logo_off_f2[@]}"); fi
    if [ $((i % 3)) -eq 2 ]; then current_frame=("${logo_off_f3[@]}"); fi

    for line in "${current_frame[@]}"; do
        printf "%b%b\e[0m\n" "$color" "$line"
    done
    sleep 0.15
done

# 3. Fissaggio in Verde Fluo (Il sistema si è avviato)
for i in {1..4}; do
    clear
    if [ $((i % 3)) -eq 0 ]; then current_frame=("${logo_off_f1[@]}"); fi
    if [ $((i % 3)) -eq 1 ]; then current_frame=("${logo_off_f2[@]}"); fi
    if [ $((i % 3)) -eq 2 ]; then current_frame=("${logo_off_f3[@]}"); fi

    for line in "${current_frame[@]}"; do
        printf "%b%b\e[0m\n" "\e[1;32m" "$line"
    done
    sleep 0.2
done

# 4. ACCENSIONE LUCI - Effetto "Flicker" (Bzz-bzz.. ON!)
for state in "on" "off" "on" "off" "on"; do
    clear
    if [ "$state" == "on" ]; then
        current_frame=("${logo_on_f1[@]}")
        delay=0.1
    else
        current_frame=("${logo_off_f1[@]}")
        delay=0.15
    fi

    for line in "${current_frame[@]}"; do
        printf "%b%b\e[0m\n" "\e[1;32m" "$line"
    done
    sleep $delay
done

# 5. Animazione finale del fumo con LE LUCI ACCESE FISSE
for i in {1..8}; do
    clear
    if [ $((i % 3)) -eq 0 ]; then current_frame=("${logo_on_f1[@]}"); fi
    if [ $((i % 3)) -eq 1 ]; then current_frame=("${logo_on_f2[@]}"); fi
    if [ $((i % 3)) -eq 2 ]; then current_frame=("${logo_on_f3[@]}"); fi

    for line in "${current_frame[@]}"; do
        printf "%b%b\e[0m\n" "\e[1;32m" "$line"
    done
    sleep 0.2
done

# Testo finale stampato a schermo
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