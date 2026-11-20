import { passwordStrength } from '../lib/validation';

export function PasswordMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  return (
    <div className="pw-meter" data-score={score}>
      <div className="pw-meter-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span>Força da senha: {label}</span>
    </div>
  );
}
