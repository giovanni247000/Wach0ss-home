#!/bin/bash

# Deve essere eseguito come root
if [ "$EUID" -ne 0 ]; then
  echo "Permessi insufficienti. Usa sudo."
  exit 1
fi

INSTALL_DIR="/opt/wach_os"
cd $INSTALL_DIR

# Scarica forzatamente l'ultima versione dal tuo Git
git fetch --all
git reset --hard origin/main

# Installa eventuali nuove librerie aggiunte nel file requirements.txt
$INSTALL_DIR/venv/bin/pip install -r requirements.txt > /dev/null 2>&1

# Riavvia il servizio per applicare il nuovo codice
systemctl restart wach_os