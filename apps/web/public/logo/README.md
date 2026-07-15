# Logos

Coloque os PNGs da marca aqui. Convenção de nomes usada no código:

| Arquivo                      | Uso                                             |
| ---------------------------- | ----------------------------------------------- |
| `logotipo-horizontal.png`    | Sidebar expandida, cabeçalhos, tela de login    |
| `logotipo-vertical.png`      | Espaços estreitos / centralizados               |

Servidos a partir da raiz: `public/logo/logotipo-horizontal.png` → `/logo/logotipo-horizontal.png`

Uso no código:

```tsx
import Image from 'next/image';

<Image src="/logo/logotipo-horizontal.png" alt="Bioinfood ERP" width={140} height={32} priority />
```

> Logo é verde + laranja sobre fundo transparente — legível tanto em fundo
> claro quanto no escuro da sidebar (`#1D1D1B`).
