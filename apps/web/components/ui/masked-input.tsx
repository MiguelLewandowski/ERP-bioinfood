import * as React from 'react';
import { Input } from './input';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Formata o valor bruto a cada tecla (ver `lib/masks.ts`). */
  format: (raw: string) => string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

// Reformata o valor no próprio evento antes de repassar ao onChange — assim
// funciona direto com `{...register('campo')}` do react-hook-form (não
// controlado), sem precisar trocar os forms existentes para Controller.
const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ format, onChange, inputMode = 'numeric', ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      e.target.value = format(e.target.value);
      onChange?.(e);
    }
    return <Input ref={ref} inputMode={inputMode} onChange={handleChange} {...props} />;
  },
);
MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };
