# Changelog

Todas as mudanças notáveis do sistema **The Glory Online: Project Aincrad**.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.0.7] - 2026-10-22

### Adicionado

- Tipos de Item `weapon`, `equipment` e `consumable` no manifesto, com ficha própria (`ItemSheetV2`) e campos por tipo.
- INVENTORY com criação (`NOVO ITEM`), exclusão e arrastar-e-soltar de Item para a ficha.
- EQUIPMENT com mão esquerda/direita, armas de duas mãos e slots explícitos (`head`, `armor`, `feet`, `acc1`, `acc2`).
- Modo de edição no painel **PLAYER SYSTEM**: nome, nível, XP, Vida, Mana, atributos, classe, trilha e alinhamento. GM edita qualquer personagem; o jogador edita o próprio.
- Aba INFORMATION lendo `system.class`, `system.level`, `system.xp` e `system.details.alignment` do modelo.
- `system.details.alignment` no modelo do personagem.
- Testes estáticos de Item, registro da ficha e edição (`tests/items.test.mjs`).

### Alterado

- CA permanece derivada (Agilidade + maior Maestria) e não é mais editável na ficha.
- Detecção de slot de equipamento por `system.slot`, sem adivinhar pelo nome do Item.
- README com badge de versão dinâmico da última release do GitHub.
- `package.json` sincronizado com a versão do manifesto.

### Corrigido

- `editMode`, `savePlayerEdits()` e `createActorItem()` existiam, mas nunca eram chamados: a ficha era somente leitura.
- Itens eram criados com tipo `equipment`, mas o sistema não declarava nenhum tipo de Item.
- Descrição de Item deixou de ser injetada como HTML cru no modal.

## [0.0.6] - 2026-10-22

### Adicionado

- HUD do mestre com autoria das abas do jogador.
- Controle de visibilidade do HUD, abas no topo e fundo de Aincrad.

## [0.0.5] - 2026-10-22

### Adicionado

- HUD do jogador com sete abas.
- Mapa interativo e atalhos de teclado.

## [0.0.4] - 2026-10-22

### Corrigido

- Rolagem de atributos por delegação.
- INVENTORY na barra lateral e título do tipo de ator.

## [0.0.3] - 2026-10-22

### Adicionado

- Ficha SAO como padrão do tipo de ator.
- Mensagens entre fichas, foto e nome editáveis.
- Rolagem de atributos pela ficha.

## [0.0.2] - 2026-10-22

### Adicionado

- Menu do sistema SAO em `ApplicationV2` e atalho `M`.
- Ponte de leitura entre o menu e o modelo do personagem.

### Corrigido

- Numeração de versão do pacote (mantida na linha `0.0.x`).

## [0.0.1] - 2026-10-17

### Adicionado

- Base F1: manifesto, modelo do personagem, ficha STATUS, tokens e idioma pt-BR.
- Pipeline de release do GitHub Actions.
