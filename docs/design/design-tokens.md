## Paleta

| Token | Hex | Uso |
|---|---|---|
| `green-900` | `#156D1D` | primary-dark — ênfase, hover |
| `green-800` | `#147F23` | primary — ações principais, CTA |
| `green-600` | `#46AD48` | primary-mid — ícones ativos, badges |
| `green-500` | `#52B552` | primary-light — bordas de foco, tags |
| `green-300` | `#86C175` | primary-lighter — backgrounds de destaque suave |
| `gray-950` | `#1D1D1B` | surface-dark — sidebar, navbar |
| `gray-900` | `#303030` | surface — cards escuros |
| `gray-800` | `#3C3C3B` | border-dark |
| `gray-700` | `#575756` | text-secondary |
| `gray-600` | `#706F6F` | text-muted, placeholder |
| `gray-400` | `#878787` | disabled |
| `black` | `#000000` | texto em fundo claro (raramente) |
| `amber-800` | `#C16C06` | warning-dark — alertas críticos |
| `amber-700` | `#DD8005` | warning — badges de atenção |
| `amber-600` | `#FF910A` | warning-mid — intermediário (CMYK 0,43,96,0; hex no PDF incorreto) |
| `amber-500` | `#FFB000` | accent — destaques, highlights |
| `amber-400` | `#FFB727` | accent-light |
| `amber-300` | `#FDC75F` | accent-lighter — backgrounds de aviso suave |
| `white` | `#FFFFFF` | surface-light — fundo de página, texto em fundo escuro |

## Classes Tailwind Mapeadas

```css
/* Primárias */
bg-[#147F23]       /* primary */
bg-[#156D1D]       /* primary-dark / hover */
bg-[#46AD48]       /* primary-mid */
bg-[#86C175]       /* primary-lighter / surface highlight */
text-[#147F23]     /* primary text */
text-[#46AD48]     /* primary-mid text */
border-[#52B552]   /* foco / input ativo */

/* Neutros */
bg-[#1D1D1B]       /* sidebar / navbar */
bg-[#303030]       /* card escuro */
text-[#575756]     /* texto secundário */
text-[#706F6F]     /* placeholder / muted */
text-[#878787]     /* desabilitado */
border-[#3C3C3B]   /* borda escura */

/* Accent / Warning */
bg-[#DD8005]       /* warning badge */
bg-[#FFB000]       /* accent highlight */
bg-[#FDC75F]       /* aviso suave */
text-[#C16C06]     /* warning text em fundo claro */

/* Superfícies */
bg-white           /* page background */
text-white         /* texto em fundos escuros */
```

## Regras de Uso

- O verde `#147F23` é a cor primária da marca — usar em CTAs, botões principais e elementos de navegação ativa.
- O laranja/âmbar é exclusivo para alertas, avisos e destaques de atenção — nunca usá-lo como cor primária de ação.
- Texto branco (`#FFFFFF`) apenas sobre fundos verdes escuros (`#156D1D`, `#147F23`) ou neutros escuros (`#1D1D1B`, `#303030`).
- Nunca combinar âmbar (`#DD8005`, `#FFB000`) com fundo verde — baixo contraste e conflito de identidade.
- Os tons de cinza (`#575756` a `#878787`) são exclusivos para texto secundário, bordas e estados desabilitados — não usar como fundo de componentes interativos.
- `#000000` puro deve ser evitado em textos corridos; preferir `#1D1D1B` para suavizar.
- A escala de verdes deve ser usada em gradação de hierarquia: mais escuro = maior peso visual/prioridade.
- Nunca usar `#86C175` (verde claro) para texto — contraste insuficiente em fundo branco.
