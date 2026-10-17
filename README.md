<h1 align="center">The Glory Online: Project Aincrad</h1>

<p align="center"><em>Sistema de Foundry VTT do RPG de fãs The Glory Online a ficha nativa é o sistema.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/Foundry_VTT-v14%2B-ff6400?style=for-the-badge" alt="Foundry VTT v14+">
  <img src="https://img.shields.io/badge/Vers%C3%A3o-0.0.1-e11c4b?style=for-the-badge" alt="Versão 0.0.1">
  <img src="https://img.shields.io/badge/Licen%C3%A7a-CC0_1.0-8fd3ff?style=for-the-badge" alt="Licença CC0 1.0">
  <img src="https://img.shields.io/badge/Status-Em_desenvolvimento-orange?style=for-the-badge" alt="Em desenvolvimento">
</p>

<p align="center">
  <a href="#-instalação">Instalação</a> ·
  <a href="#-o-que-é">O que é</a> ·
  <a href="#-como-usar">Como usar</a> ·
  <a href="#-fases">Fases</a> ·
  <a href="#-licença">Licença</a>
</p>

> [!WARNING]
> **Em desenvolvimento.** A F1 (base) está escrita e validada em estático; o runtime no Foundry **ainda não foi testado**. Regras em rascunho nenhum número está fechado.

## 📥 Instalação

No Foundry: **Game Systems → Install System → Manifest URL** e cole:

```text
https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/releases/latest/download/system.json
```

_O manifesto resolve a partir da primeira release publicada._

- **[Download direto](https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/releases)** baixe o `system.zip` e extraia em `Data/systems/the-glory-online`.

Para desenvolvimento (editar e testar na hora, sem build):

```bash
git clone https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad.git
cmd /c mklink /J "%localappdata%\FoundryVTT\Data\systems\the-glory-online" "C:\caminho\do\clone"
```

Editar → **F5** no Foundry.

## 🎲 O que é

- Quatro atributos, Vida e Mana
- Maestria por tipo de arma e Sword Skills
- Morte por zonas: Segura, de Ameaça e de Perigo
- Seis classes-base com trilhas
- A ficha é **nativa do sistema** substitui a macro antiga

## 🧭 Como usar

1. Crie um mundo com o sistema **The Glory Online**.
2. **Actors → Create Actor → Personagem**.
3. A ficha abre na aba **STATUS** (vitais, atributos, Maestrias). Edite e salve.

## 🗺️ Fases

| Fase   | Entrega                                                                       | Estado                         |
| ------ | ----------------------------------------------------------------------------- | ------------------------------ |
| **F1** | Manifesto, modelo do personagem, ficha STATUS, tokens e lang                  | ✅ escrita runtime não testado |
| **F2** | Tipos de item + INVENTORY/EQUIPMENT (mãos esquerda/direita) + aba INFORMATION | ⏳ pendente                    |
| **F3** | SKILLS + Sword Skills como dados (custo de mana, pós-atraso)                  | ⏳ pendente                    |
| **F4** | UI de mundo, ficha de guilda, relógio de boss, compêndios                     | ⏳ pendente                    |

## 🔧 Compatibilidade

| Item            | Valor               |
| --------------- | ------------------- |
| Foundry VTT     | **v14 ou superior** |
| Dependências    | Nenhuma             |
| Sistema de jogo | Este nada de dnd5e  |

## 📜 Licença

**CC0 1.0 Universal** veja [LICENSE](LICENSE).

Projeto não oficial, feito por fãs, sem fins lucrativos e sem afiliação com os detentores dos direitos de Sword Art Online ou The King's Avatar. Todos os nomes e marcas pertencem a seus respectivos donos.

<p align="center">
  Criado por <a href="https://github.com/SoftMissT">SoftMissT</a> ·
  <a href="https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/issues">Reportar bug</a> ·
  <a href="https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/releases">Releases</a>
</p>
