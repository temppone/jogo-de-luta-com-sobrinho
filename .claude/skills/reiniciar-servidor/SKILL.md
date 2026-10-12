---
name: reiniciar-servidor
description: Reinicia o servidor do jogo (server.js) depois de qualquer mudança no projeto. Use SEMPRE ao terminar de criar ou alterar algo (server.js ou public/), antes de responder ao usuário, para ele já testar a versão nova.
---

# Reiniciar servidor

O projeto não tem hot reload: `server.js` só carrega código novo ao reiniciar. Arquivos de `public/` são estáticos (basta F5), mas reinicie também para garantir estado limpo.

Ao terminar qualquer mudança:

1. Rode `.claude/skills/reiniciar-servidor/reinicia.sh`.
   - Checa a sintaxe de `server.js`, mata todo `node server.js` rodando nesta pasta, sobe um novo em segundo plano e confere se a porta 8081 responde.
   - Log em `/tmp/luta-3d-server.log`.
2. Se falhar, leia o log, corrija e rode de novo.
3. Na resposta, diga que o servidor foi reiniciado e que é só dar F5 no navegador.
