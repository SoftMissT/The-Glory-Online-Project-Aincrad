# Segurança The Glory Online: Project Aincrad

Projeto de fãs, privado, sem fins lucrativos e sem afiliação com os detentores de Sword Art Online ou The King's Avatar.

## Reportar

- Canal privado do GitHub: **Security → Advisories → Report a vulnerability** ([link direto](https://github.com/SoftMissT/The-Glory-Online-Project-Aincrad/security/advisories/new)).
- Falha explorável não vai em issue pública.
- Inclua: versão do Foundry, passos para reproduzir, sistema e módulos ativos, e o efeito observado.
- Projeto de mesa: sem SLA. Resposta quando der.

## Escopo

Vale para este repositório (o sistema: `system.json`, `src/`, `templates/`, `styles/`, `lang/`). Foundry VTT e módulos de terceiros têm os próprios canais.

## Falhas que valem reporte

- **Permissão**: jogador conseguir alterar dados que só o GM deveria alterar via ficha ou formulário do sistema.
- **Vazamento**: informação privada do mundo (notas do GM, atores ocultos) exposta a jogadores.
- **Injeção**: conteúdo de ator/item virando script em template Handlebars.
- **Excesso de dados**: o sistema entregando a jogador mais dados do que a ficha exibe.

## Segredos

- Nenhuma chave, token, senha ou caminho pessoal entra no repositório nem em exemplo de configuração.
- Configuração local do Foundry (junction, mundos) vive fora do git.

## Fora de escopo

Conteúdo de terceiros (Sword Art Online, The King's Avatar): este projeto não redistribui material de seus donos.
