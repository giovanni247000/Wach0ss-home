#!/bin/bash

# Controllo permessi root
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[1;31mPer favore, esegui questo script con sudo\e[0m"
  exit
fi

INSTALL_DIR="/opt/wach_os"

# --- Python 3.11 PORTATILE ---------------------------------------------------
# app.so e' compilato per Python 3.11: invece di sperare che la distro abbia
# quella versione (Debian 12 si', Ubuntu 22.04/24.04 e Debian 11/13 no),
# installiamo noi un CPython 3.11 gia' compilato e ridistribuibile dentro
# $INSTALL_DIR/python. Richiede solo glibc 2.17+, quindi funziona su qualsiasi
# Debian/Ubuntu in circolazione, e non tocca il Python di sistema.
PY_RELEASE="20260825"
PY_VERSION="3.11.16"
PY_DIR="$INSTALL_DIR/python"
PY_BIN="$PY_DIR/bin/python3.11"

echo -e "\e[1;36m[>] Preparazione del sistema Wach OS in corso...\e[0m"

# 1. Dipendenze di sistema (niente python3/pip: ce lo portiamo dietro noi)
apt-get update -y > /dev/null 2>&1
apt-get install git curl ca-certificates libglib2.0-0 libsm6 libxext6 libxrender-dev -y > /dev/null 2>&1

mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 2. Installazione del Python 3.11 dedicato
case "$(uname -m)" in
    aarch64|arm64)  PY_ARCH="aarch64" ;;
    x86_64|amd64)   PY_ARCH="x86_64" ;;
    *)
        echo -e "\e[1;31m[X] Architettura $(uname -m) non supportata.\e[0m"
        echo -e "\e[1;33m    Wach OS gira su ARM 64 bit (Raspberry) e su PC/server x86 64 bit.\e[0m"
        exit 1
        ;;
esac

if [ -x "$PY_BIN" ] && "$PY_BIN" -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,11) else 1)' 2>/dev/null; then
    echo -e "\e[1;36m[>] Python 3.11 dedicato gia' presente: lo riutilizzo.\e[0m"
else
    PY_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PY_RELEASE}/cpython-${PY_VERSION}+${PY_RELEASE}-${PY_ARCH}-unknown-linux-gnu-install_only_stripped.tar.gz"
    echo -e "\e[1;36m[>] Scarico Python ${PY_VERSION} per ${PY_ARCH} (circa 31 MB)...\e[0m"
    rm -rf "$PY_DIR"
    if ! curl -fsSL "$PY_URL" -o /tmp/wach_python.tar.gz; then
        echo -e "\e[1;31m[X] Download di Python non riuscito: controlla la connessione.\e[0m"
        exit 1
    fi
    tar -xzf /tmp/wach_python.tar.gz -C "$INSTALL_DIR"
    rm -f /tmp/wach_python.tar.gz
    if [ ! -x "$PY_BIN" ]; then
        echo -e "\e[1;31m[X] Estrazione di Python non riuscita.\e[0m"
        exit 1
    fi
fi

# 3. Librerie Python dentro il nostro Python (nessun conflitto col sistema)
echo -e "\e[1;36m[>] Installazione delle librerie necessarie...\e[0m"
"$PY_BIN" -m pip install --quiet --upgrade pip > /dev/null 2>&1
PIP_LOG="/tmp/wach_pip.log"
# requirements.txt contiene le versioni BLOCCATE: senza di lui non si procede.
# Installare "le ultime versioni" come ripiego era peggio del fallire: metteva
# sull'impianto librerie mai collaudate senza che nessuno se ne accorgesse.
if [ ! -f "$INSTALL_DIR/requirements.txt" ]; then
    echo -e "\e[1;31m[X] File requirements.txt mancante in $INSTALL_DIR\e[0m"
    echo -e "\e[1;33m    Il download del progetto e' incompleto: ripeti l'installazione.\e[0m"
    exit 1
fi
"$PY_BIN" -m pip install --quiet -r "$INSTALL_DIR/requirements.txt" > "$PIP_LOG" 2>&1
if [ $? -ne 0 ]; then
    echo -e "\e[1;31m[X] Installazione delle librerie non riuscita.\e[0m"
    echo -e "\e[1;33m    Ultime righe dell'errore:\e[0m"
    tail -n 8 "$PIP_LOG"
    exit 1
fi

# 3b. Verifica decisiva: il modulo compilato si carica su QUESTA macchina?
# Meglio accorgersene adesso, con un messaggio chiaro, che avere un servizio
# che non parte e nessuno che capisce perche'.
echo -e "\e[1;36m[>] Verifica del modulo di sistema...\e[0m"
if ! (cd "$INSTALL_DIR" && "$PY_BIN" -c "import app" > /tmp/wach_import.log 2>&1); then
    echo -e "\e[1;31m[X] Il modulo compilato non e' compatibile con questa macchina.\e[0m"
    echo -e "\e[1;33m    Architettura rilevata: $(uname -m)  (serve il modulo per ${PY_ARCH})\e[0m"
    echo -e "\e[1;33m    Dettaglio:\e[0m"
    tail -n 3 /tmp/wach_import.log
    exit 1
fi

# 4. Rendiamo eseguibile lo script di aggiornamento (se esiste)
chmod +x $INSTALL_DIR/update.sh 2>/dev/null || true

# 5. Creazione del servizio Systemd (per l'avvio automatico con il lanciatore protetto)
cat <<EOF > /etc/systemd/system/wach_os.service
[Unit]
Description=Wach OS System
After=network.target

[Service]
User=root
WorkingDirectory=$INSTALL_DIR
# Esegue il lanciatore (run.py) con il Python 3.11 dedicato, quello per cui
# app.so e' stato compilato: cosi' la versione di sistema e' irrilevante.
ExecStart=$PY_BIN $INSTALL_DIR/run.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 6. Avvio del servizio
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