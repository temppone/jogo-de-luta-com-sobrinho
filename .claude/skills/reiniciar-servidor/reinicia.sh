#!/usr/bin/env bash
# Reinicia o servidor do jogo (node server.js, porta 8081) em segundo plano.
cd "$(dirname "$0")/../../.." || exit 1
node --check server.js || { echo "server.js com erro de sintaxe; não reiniciei"; exit 1; }
# só processos cujo comando é exatamente "node server.js" nesta pasta (não pega shells que citam o texto)
for pid in $(pgrep -x node); do
  args=$(tr '\0' ' ' < /proc/$pid/cmdline)
  [[ "$args" =~ (^|/)node\ server\.js\ ?$ ]] && [ "$(readlink /proc/$pid/cwd)" = "$PWD" ] && kill "$pid"
done
sleep 0.5
setsid nohup node server.js > /tmp/luta-3d-server.log 2>&1 < /dev/null &
sleep 1
if curl -sf -o /dev/null "http://localhost:${PORT:-8081}/"; then echo "servidor no ar: http://localhost:${PORT:-8081}"; else echo "falhou; log:"; tail -20 /tmp/luta-3d-server.log; exit 1; fi
