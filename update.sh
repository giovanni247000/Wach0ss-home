#!/bin/bash

# Forza le variabili di ambiente per evitare blocchi senza sessione
export HOME="/root"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Scrive i log per debug in caso di problemi
exec > /opt/wach_os/update_debug.log 2>&1

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
# Cerca dinamicamente l'eseguibile di python dentro il venv, ovunque esso sia, 
# evitando errori di percorso assoluto "No such file or directory"
if [ -f "$INSTALL_DIR/venv/bin/python" ]; then
    PYTHON_BIN="$INSTALL_DIR/venv/bin/python"
elif [ -f "$INSTALL_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$INSTALL_DIR/.venv/bin/python"
else
    PYTHON_BIN="python3"
fi

echo "Aggiornamento librerie con: $PYTHON_BIN"
"$PYTHON_BIN" -m pip install -r requirements.txt

echo "Aggiornamento completato. Riavvio..."

# 4. Riavvio del servizio
systemctl restart wach_os