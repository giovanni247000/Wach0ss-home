#!/bin/bash

# Forza le variabili di ambiente per evitare blocchi senza sessione
export HOME="/root"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Il log va SIA nel file (per il debug) SIA allo standard output, perche' e'
# da li' che il server legge l'avanzamento e lo mostra nella schermata di
# aggiornamento. Con la sola redirezione su file la barra restava ferma e la
# console dell'interfaccia non si riempiva mai.
exec > >(tee /opt/wach_os/update_debug.log) 2>&1

echo "=== INIZIO AGGIORNAMENTO UNIVERSALE ==="

INSTALL_DIR="/opt/wach_os"
cd "$INSTALL_DIR" || exit 1

# 1. RISOLUZIONE DEFINITIVA GIT: 
# Dice a Git di ignorare i controlli di proprietà su questa cartella per QUALSIASI utente
git config --global --add safe.directory "$INSTALL_DIR"
git config --local --add safe.directory "$INSTALL_DIR"

# 2. Aggiornamento forzato del codice
echo "Scaricamento aggiornamenti..."
git fetch --all
git reset --hard origin/main

# 3. RISOLUZIONE DEFINITIVA PIP/PYTHON:
# Ordine di ricerca: prima il Python 3.11 dedicato installato da install.sh
# (quello per cui app.so e' compilato), poi eventuali venv storici, infine il
# python di sistema come ultima spiaggia.
if [ -x "$INSTALL_DIR/python/bin/python3.11" ]; then
    PYTHON_BIN="$INSTALL_DIR/python/bin/python3.11"
elif [ -f "$INSTALL_DIR/venv/bin/python" ]; then
    PYTHON_BIN="$INSTALL_DIR/venv/bin/python"
elif [ -f "$INSTALL_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$INSTALL_DIR/.venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "Aggiornamento librerie con: $PYTHON_BIN"
if ! "$PYTHON_BIN" -m pip install -r requirements.txt; then
    echo ""
    echo "=================================================================="
    echo "[X] INSTALLAZIONE DELLE LIBRERIE NON RIUSCITA"
    echo ""
    echo "    Il servizio NON viene riavviato: resta attivo con la versione"
    echo "    precedente, che funziona. Meglio un impianto fermo a ieri che"
    echo "    un impianto riavviato a meta' aggiornamento."
    echo ""
    echo "    Causa tipica: connessione assente o instabile durante il"
    echo "    download. Rilancia l'aggiornamento quando la rete e' tornata."
    echo "=================================================================="
    exit 1
fi

# 3-bis. CHE COSA GIRERA' DAVVERO
# Python, trovando sia modulo.py sia modulo.so, carica SEMPRE il .so. Quindi un
# .so vecchio rimasto sul disco nasconde per sempre un .py aggiornato: il codice
# nuovo arriva, git lo scrive, e non viene mai eseguito. Nessun errore, nessun
# avviso: e' il guasto piu' difficile da diagnosticare che questo sistema possa
# avere. Qui non si corregge niente, si DICE soltanto che cosa verra' caricato.
# Programmi di sistema per l'NVR (registrazioni): ffmpeg salva il video, cifs-utils monta le
# cartelle di rete. Se mancano si installano; se non si riesce (niente internet) si va avanti:
# la domotica non dipende da loro, e la card NVR offre il tasto "Installa ffmpeg".
if ! command -v ffmpeg > /dev/null 2>&1 || ! command -v mount.cifs > /dev/null 2>&1; then
    echo "Installazione di ffmpeg e cifs-utils per l'NVR..."
    (apt-get update -y > /dev/null 2>&1; apt-get install -y ffmpeg cifs-utils > /dev/null 2>&1) || echo "[!] ffmpeg/cifs-utils non installati: si potra' fare dalla card NVR"
fi

echo ""
echo "--- Moduli che verranno caricati ---"
CONTROLLO_ASSENTE=0
for MODULO in app controllo_impianto knx_monitor smart_tv nvr; do
    SO=$(ls "$INSTALL_DIR/$MODULO".*.so "$INSTALL_DIR/$MODULO.so" 2>/dev/null | head -1)
    PY="$INSTALL_DIR/$MODULO.py"
    if [ -n "$SO" ] && [ -f "$PY" ]; then
        if [ "$PY" -nt "$SO" ]; then
            echo "[!] $MODULO: gira il COMPILATO $(basename "$SO"), ma $MODULO.py e' PIU' RECENTE."
            echo "    Il codice appena scaricato NON verra' eseguito finche' non ricompili:"
            echo "    cd $INSTALL_DIR && python/bin/python3.11 linux/compila.py build_ext --inplace"
        else
            echo "[ok] $MODULO: compilato ($(basename "$SO"))"
        fi
    elif [ -n "$SO" ]; then
        echo "[ok] $MODULO: compilato ($(basename "$SO"))"
    elif [ -f "$PY" ]; then
        echo "[ok] $MODULO: sorgente ($MODULO.py, non compilato)"
    else
        echo "[X] $MODULO: NON TROVATO ne' compilato ne' sorgente."
        [ "$MODULO" = "controllo_impianto" ] && CONTROLLO_ASSENTE=1
    fi
done

if [ "$CONTROLLO_ASSENTE" = "1" ]; then
    echo ""
    echo "    Il Controllo Impianto non partira': app.py lo importa dentro un"
    echo "    try/except, quindi la domotica funziona lo stesso, ma la console"
    echo "    remota non ricevera' piu' rapporti e dopo 3 minuti dara' l'impianto"
    echo "    offline. Verifica di aver committato controllo_impianto.py (o .so)."
fi
echo ""

echo "Aggiornamento completato. Riavvio..."

# 4. Riavvio del servizio
# Questo script e' figlio del processo del server (Popen in app.py), quindi vive nel
# cgroup del servizio wach_os. Un `systemctl restart wach_os` lanciato da qui fa mandare
# da systemd (KillMode predefinito = control-group) SIGTERM a TUTTO il gruppo: al server,
# ma anche a sudo, bash, tee e allo stesso systemctl. Lo script moriva ucciso (uscita
# -15/143) e il server, che legge questa pipe, segnava come "Errore" un aggiornamento
# riuscito. Il riavvio va quindi chiesto a systemd da FUORI del gruppo: una unita'
# transitoria (systemd-run fa parte di systemd, nessun pacchetto in piu') che scatta fra
# qualche secondo, quando questo script e' gia' uscito con 0 e il server ha gia' scritto
# "Aggiornamento completato" in update_status.json.
RITARDO_RIAVVIO=4
UNITA_RIAVVIO="wach-os-riavvio-$$-$(date +%s)"
SYSTEMCTL_BIN="$(command -v systemctl 2>/dev/null || echo /usr/bin/systemctl)"
if ! command -v systemd-run > /dev/null 2>&1; then
    echo "[!] systemd-run assente: riavvio diretto del servizio."
else
    systemd-run --quiet --collect --unit="$UNITA_RIAVVIO" \
        --description="Riavvio di wach_os dopo l'aggiornamento" \
        --on-active="$RITARDO_RIAVVIO" --timer-property=AccuracySec=1s \
        "$SYSTEMCTL_BIN" restart wach_os
    RC_RUN=$?
    if [ "$RC_RUN" -eq 0 ]; then
        echo "Riavvio del servizio programmato fra ${RITARDO_RIAVVIO} s."
        exit 0
    fi
    echo "[!] systemd-run fallito (codice $RC_RUN): riavvio diretto del servizio."
fi

# Ripiego: riavvio diretto come prima. Lo script verra' ucciso da SIGTERM insieme al
# server; il server sa riconoscere il caso (riga "Aggiornamento completato. Riavvio..."
# gia' stampata) e non lo segna come errore.
"$SYSTEMCTL_BIN" restart wach_os
