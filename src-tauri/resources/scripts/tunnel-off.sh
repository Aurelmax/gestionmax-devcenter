#!/bin/bash
# Arrêter le tunnel SSH (port 27017)

LOCAL_MONGO="${PROJECT_LOCAL_MONGO:-27017}"

echo "🛑 Fermeture du tunnel SSH sur le port $LOCAL_MONGO..."

PIDS=$(lsof -ti tcp:"$LOCAL_MONGO")

if [ -z "$PIDS" ]; then
    echo "ℹ️ Aucun tunnel actif sur le port $LOCAL_MONGO."
else
    kill -9 $PIDS
    echo "✔️ Tunnel SSH arrêté."
fi


