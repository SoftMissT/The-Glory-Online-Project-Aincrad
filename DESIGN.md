# DESIGN.md The Glory Online (Foundry VTT)

> Régua visual do sistema e da ficha. Estado: **BRUTA** direção herdada dos
> protótipos em `.concepts/` (`MATRIX` v14 e `ULTIMATE` v13); nada foi verificado
> em runtime nesta sessão. Tokens reais em `styles/the-glory-online.css`.

## 1. Essência

- HUD de MMO/SAO: denso, escuro, técnico. Informação primeiro, decoração depois.
- Arma escolhida: **martelo** hierarquia dura, número grande, rótulo discreto. Sem ornamento solto.
- Contexto: mesa privada (4–5 jogadores + GM). Não é vitrine de marca.

## 2. Cor (papéis)

| Papel       | Token              | Valor                   | Uso                                                  |
| ----------- | ------------------ | ----------------------- | ---------------------------------------------------- |
| Fundo 0     | `--tgo-bg-0`       | `#070d16`               | janela, fundo de input                               |
| Fundo 1     | `--tgo-bg-1`       | `#0c1626`               | gradiente de painel                                  |
| Painel      | `--tgo-panel`      | `rgba(13,22,38,.85)`    | cabeçalho, células                                   |
| Linha       | `--tgo-line`       | `rgba(0,243,255,.35)`   | borda de destaque                                    |
| Linha suave | `--tgo-line-soft`  | `rgba(148,163,184,.25)` | borda neutra                                         |
| Texto       | `--tgo-text`       | `#e0f2fe`               | corpo                                                |
| Texto dim   | `--tgo-text-dim`   | `#94a3b8`               | apoio, vazio                                         |
| Acento      | `--tgo-accent`     | `#00f3ff`               | rótulo, foco, CA                                     |
| Acento dim  | `--tgo-accent-dim` | `rgba(0,243,255,.12)`   | fundo do destaque                                    |
| Ouro        | `--tgo-gold`       | `#ffd700`               | XP/nível                                             |
| Perigo      | `--tgo-danger`     | `#ff2b4a`               | morte/zonas (F2+)                                    |
| Raro        | `--tgo-rare`       | `#b026ff`               | decoração de Sword Skill única (F3+) **nunca texto** |

Ciano é o acento dominante (herança do protótipo). Ouro, perigo e raro só entram com significado de estado.

## 3. Tipografia

- Alvo: **Orbitron** (display), **Rajdhani** (UI), **Share Tech Mono** (dados) OFL.
- Estado: **não auto-hospedadas**; o CSS usa pilha deliberada (Bahnschrift/Segoe/Cascadia) até o OK para embutir os arquivos.
- Escala: `0.6875rem` micro-rótulo · `0.8125rem` apoio · `0.9375rem` corpo · `1.25rem` número de atributo · `1.375rem` nome · `1.75rem` CA.
- Entrelinha: 1,5 no corpo; 1,1 no display.
- CAIXA ALTA só em micro-rótulo (`.tgo-k`) e no nome (display), com tracking 0.04–0.08em. O guia anti-slop trata caixa alta genérica como sinal de IA; aqui é marca do HUD herdada, restrita a poucas palavras.

## 4. Espaço e forma

- Base 4px: `--tgo-space-1..4` = 0.25 / 0.5 / 0.75 / 1rem.
- Raio 2px, borda 1px, sem sombra pesada. Glow só onde o protótipo já usava não na ficha F1.

## 5. Layout da ficha (F1)

- **Cabeçalho:** retrato 4rem · nome · nível/classe/trilha · XP à direita.
- **STATUS:** Vida e Mana (valor/máx) + CA · grade de 4 atributos · lista de Maestrias.
- Abas futuras: STATUS · INFORMATION · INVENTORY · EQUIPMENT · SKILLS. Navegação só entra com a segunda aba.

## 6. Componentes

| Componente         | Classe              | Regra                                    |
| ------------------ | ------------------- | ---------------------------------------- |
| Micro-rótulo       | `.tgo-k`            | mono, caixa alta, tracking 0.08em, ciano |
| Célula de atributo | `.tgo-attribute`    | painel + input centralizado              |
| Campo vital        | `.tgo-bar`          | valor / máximo, inputs mono              |
| Selo de CA         | `.tgo-ca`           | borda ciano + fundo dim                  |
| Lista de maestrias | `.tgo-mastery-list` | linha painel, tipo + valor               |
| Vazio              | `.tgo-empty`        | texto dim                                |

## 7. Movimento

- F1 sem animação. Quando existir: só hover/focus, ≤120ms, e `prefers-reduced-motion` respeitado.

## 8. Acessibilidade

- Foco visível em todo input: contorno 2px ciano (`:focus-visible`).
- Contraste conferido por cálculo WCAG 2.x contra `#0c1626` (2026-10-17): texto **15.80:1** · apoio **7.07:1** · ciano **13.18:1** · ouro **12.93:1** · perigo **4.92:1** · roxo **3.94:1** (reprova como texto decorativo apenas).
- Todo input tem rótulo visível; placeholder não substitui rótulo.

## 9. Anti-padrões

- Gradiente roxo-azul genérico, glassmorphism, sombra difusa de template.
- Emoji em UI (política do protótipo: zero emojis).
- Caixa alta fora de micro-rótulo/nome.
- Arte ou logo oficial de SAO/The King's Avatar inspiração apenas, sem redistribuir material de terceiros.
