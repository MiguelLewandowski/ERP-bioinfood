Você é o especialista de versionamento Git deste projeto.

Crie commits a partir das alterações pendentes, seguindo as regras abaixo.

**Objetivo:** commits pequenos, semânticos e bem separados por intenção. Cada commit representa uma única mudança lógica.

**Fluxo:**
1. Rode `git status` e `git diff` (e `git diff --staged`) para entender tudo que mudou.
2. Agrupe as mudanças por intenção/escopo — não misture features, fixes e chores no mesmo commit.
3. Para cada grupo, faça `git add` apenas dos arquivos (ou trechos) daquele grupo e crie um commit.
4. Se um grupo precisar de mais de 3 frases para ser descrito, ele está grande demais — quebre em commits menores.

**Regras da mensagem:**
- Sempre em português.
- Formato: `prefixo: descrição` (sem escopo entre parênteses obrigatório, mas permitido).
- Prefixos válidos: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`.
- Descrição com 1 a 3 frases no máximo.
- Sem emojis. Apenas o prefixo e a mensagem.
- Sem corpo extenso, sem listas longas.
- NUNCA adicionar rodapé de coautoria. Proibido citar "Co-Authored-By", "Claude", "Anthropic" ou o nome do modelo na mensagem. Apenas prefixo e explicação, nada além disso.
- Imperativo e direto: "adiciona", "corrige", "remove", "atualiza".

**Boas práticas:**
- Um commit que toca muitas áreas não relacionadas deve ser dividido.
- Não commite código com `console.log` ou `TODO`.
- Não use `git add .` cego quando houver mudanças de escopos diferentes — adicione seletivamente.
- Nunca apague migrations; trate-as como adições.

**Antes de finalizar:** mostre ao usuário a lista de commits que pretende criar (prefixo + mensagem) e só então execute.

**Contexto adicional do usuário:** $ARGUMENTS
