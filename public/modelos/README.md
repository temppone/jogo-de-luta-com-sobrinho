# Modelos de lutadores

O projeto já tem quatro lutadores procedurais e as skins atuais, incluindo Palito Fogo e
Palito Rei Pirata. A skin pirata tem coroa, tapa-olho e duas lâminas presas aos braços.
Esses modelos continuam como padrão e funcionam sem arquivos adicionais.

Para substituir um visual por um modelo `.glb`, coloque o arquivo nesta pasta e preencha
o campo `gltf` da entrada correspondente no `manifest.json`. Exemplo:
`"padrao": { "modeloAtual": "procedural", "gltf": "/modelos/palito.glb" }`.

O GLB pode incluir animações. O jogo procura primeiro uma animação com o mesmo nome da ação
(por exemplo, `socoAlto`) e depois nomes comuns como `Idle`, `Walk`, `Punch`, `Kick`, `Block`
e `GetUp`. Se não houver animação compatível, usa a primeira animação disponível. O personagem
deve estar em pé, com os pés próximos à origem, e olhando para a frente do arquivo GLB
(convenção usual: -Z).

Se o campo `gltf` estiver vazio ou o arquivo não carregar, o lutador procedural atual continua aparecendo.
