import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  {
    rules: {
      // Regras novas do react-hooks v6 (Next 16): apontam padrões legados de
      // fetch-em-effect que funcionam mas merecem refactor gradual — warn, não erro.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            'Cor hex em className é proibida — use tokens semânticos (bg-primary, text-muted-foreground…). Ver docs/design/design-tokens.md.',
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message:
            'Cor hex em className é proibida — use tokens semânticos (bg-primary, text-muted-foreground…). Ver docs/design/design-tokens.md.',
        },
        {
          selector: "JSXAttribute[name.name='style'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            'Cor hex em style inline é proibida — use classes com tokens semânticos. Ver docs/design/design-tokens.md.',
        },
      ],
    },
  },
];

export default config;
