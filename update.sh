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
echo ""
echo "--- Moduli che verranno caricati ---"
CONTROLLO_ASSENTE=0
for MODULO in app controllo_impianto knx_monitor; do
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
systemctl restart wach_os