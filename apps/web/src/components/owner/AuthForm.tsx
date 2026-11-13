'use client';

import { useActionState, useState } from 'react';
import { loginAction, registerAction } from '@/app/owner/auth-actions';
import { EMPTY } from '@/lib/form';
import { Field, FormMessage, SubmitButton, inputClass } from './ui';

export function AuthForm() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginState, login] = useActionState(loginAction, EMPTY);
  const [registerState, register] = useActionState(registerAction, EMPTY);

  const tabClass = (active: boolean) =>
    `min-h-11 flex-1 rounded-[4px] px-3 text-[15px] font-semibold ${active ? 'bg-cafea text-white' : 'text-cafea hover:bg-sponsored-food'}`;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-[40px] leading-none text-cafea">Pentru proprietari</h1>
      <p className="mt-2 text-[15px] text-muted-cafea">
        Răspunde la review-uri, scrie pe blogul localului și vezi ce zic localnicii. Banii nu cumpără scor sau loc în top.
      </p>

      <div role="group" aria-label="Cont" className="mt-6 flex gap-1 rounded-[4px] border border-hairline p-1">
        <button type="button" aria-pressed={tab === 'login'} className={tabClass(tab === 'login')} onClick={() => setTab('login')}>
          Intră în cont
        </button>
        <button type="button" aria-pressed={tab === 'register'} className={tabClass(tab === 'register')} onClick={() => setTab('register')}>
          Cont nou
        </button>
      </div>

      {tab === 'login' ? (
        <form key={loginState.seq} action={login} className="mt-6 flex flex-col gap-4">
          <Field label="Nume de utilizator, email sau telefon">
            <input name="login" defaultValue={loginState.values?.login} required autoComplete="username" autoCapitalize="none" spellCheck={false} className={inputClass} />
          </Field>
          <Field label="Parolă">
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <FormMessage state={loginState} />
          <SubmitButton pendingLabel="Se verifică…">Intră în cont</SubmitButton>
        </form>
      ) : (
        <form key={registerState.seq} action={register} className="mt-6 flex flex-col gap-4">
          <Field label="Nume de utilizator" hint="3–30 caractere: litere mici, cifre, punct sau underscore.">
            <input name="username" defaultValue={registerState.values?.username} required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="ex. bistro.ana…" className={inputClass} />
          </Field>
          <Field label="Numele afișat">
            <input name="displayName" defaultValue={registerState.values?.displayName} autoComplete="name" placeholder="ex. Ana Pop…" className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" defaultValue={registerState.values?.email} type="email" required autoComplete="email" spellCheck={false} placeholder="ex. ana@bistro.ro…" className={inputClass} />
          </Field>
          <Field label="Parolă" hint="Cel puțin 8 caractere.">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <FormMessage state={registerState} />
          <SubmitButton pendingLabel="Se creează contul…">Creează contul</SubmitButton>
        </form>
      )}
    </div>
  );
}
