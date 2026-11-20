import { useCallback, useMemo, useState, type ChangeEvent, type FocusEvent } from 'react';

type Validators<T> = { [K in keyof T]?: (value: T[K], values: T) => string | undefined };

/** Gerencia valores, erros e "campos tocados" de formulários simples. */
export function useForm<T extends Record<string, string>>(initial: T, validators: Validators<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const allErrors = useMemo(() => {
    const result: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const msg = validators[key]?.(values[key], values);
      if (msg) result[key] = msg;
    }
    return result;
  }, [values, validators]);

  const errorFor = useCallback(
    (key: keyof T) => (submitted || touched[key] ? allErrors[key] : undefined),
    [allErrors, submitted, touched],
  );

  const bind = useCallback(
    (key: keyof T) => ({
      name: String(key),
      value: values[key],
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
      onBlur: (e: FocusEvent<HTMLInputElement>) => {
        if (e.target.value) setTouched((t) => ({ ...t, [key]: true }));
      },
      error: errorFor(key),
    }),
    [errorFor, values],
  );

  /** Marca o formulário como enviado e informa se é válido. */
  const validate = useCallback(() => {
    setSubmitted(true);
    return Object.keys(allErrors).length === 0;
  }, [allErrors]);

  return { values, bind, validate, setValues };
}
