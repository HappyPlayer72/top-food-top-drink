'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { questionsForReview, type Answer, type Question } from '@tftd/scoring/features';

const CHOICES: { value: Answer; label: string }[] = [
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Nu' },
  { value: 'not_observed', label: 'Nu am observat' },
];

/**
 * Întrebările opționale din review: primele 2–3 după preferințele userului și tipul localului,
 * restul sub „Adaugă alte detalii”. Nota și textul rămân câmpurile principale.
 */
export function ReviewQuestions({
  interests,
  vertical,
  answers,
  onChange,
  dark,
}: {
  interests: readonly string[];
  vertical: 'food' | 'drink';
  answers: Record<string, Answer>;
  onChange: (key: string, answer: Answer | undefined) => void;
  dark: boolean;
}) {
  const { initial, more } = questionsForReview(interests, vertical);
  const answeredMore = more.some((q) => answers[q.key]);
  const [showMore, setShowMore] = useState(answeredMore);
  const moreId = useId();

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <span className="text-[13px] font-semibold block">Detalii despre local (opțional)</span>
        <p className={`text-[12px] leading-snug ${dark ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'}`}>
          Răspunde doar la ce ai observat. Ajuți pe alții să afle dacă localul li se potrivește.
        </p>
      </div>
      {initial.map((q) => (
        <QuestionRow key={q.key} q={q} value={answers[q.key]} onChange={onChange} dark={dark} />
      ))}
      {more.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={showMore}
            aria-controls={moreId}
            onClick={() => setShowMore((v) => !v)}
            className={`btn-press min-h-[44px] inline-flex items-center gap-1.5 text-[13px] font-semibold underline underline-offset-4 ${
              dark ? 'text-[#F2A33A]' : 'text-[#3A2418]'
            }`}
          >
            {showMore ? 'Ascunde detaliile' : 'Adaugă alte detalii'}
            <ChevronDown aria-hidden="true" className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
          <div id={moreId} hidden={!showMore} className="space-y-2">
            {more.map((q) => (
              <QuestionRow key={q.key} q={q} value={answers[q.key]} onChange={onChange} dark={dark} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionRow({ q, value, onChange, dark }: { q: Question; value: Answer | undefined; onChange: (key: string, a: Answer | undefined) => void; dark: boolean }) {
  return (
    <fieldset className={`p-3 rounded-[4px] border space-y-2 ${dark ? 'bg-[#143025] border-[#285443]' : 'bg-[#FAF8F5] border-[#E6DFD5]'}`}>
      <legend className="sr-only">{q.question}</legend>
      <div className="flex items-start justify-between gap-2">
        <p aria-hidden="true" className="text-[14px] font-semibold leading-snug">
          {q.question}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(q.key, undefined)}
            className={`text-[12px] font-semibold underline underline-offset-2 shrink-0 min-h-[32px] ${dark ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'}`}
          >
            Șterge răspunsul
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => (
          <label
            key={c.value}
            className={`btn-press min-h-[44px] px-2 py-2 rounded-[4px] border text-[13px] font-semibold text-center flex items-center justify-center cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
              dark
                ? 'has-[:focus-visible]:outline-[#F2A33A] ' +
                  (value === c.value ? 'bg-[#F2A33A] border-[#F2A33A] text-[#17382C]' : 'bg-[#122B22] border-[#2D5947] text-[#F4EEE2] hover:border-[#F2A33A]')
                : 'has-[:focus-visible]:outline-[#B3261E] ' +
                  (value === c.value ? 'bg-[#3A2418] border-[#3A2418] text-white' : 'bg-white border-[#D6CFC5] text-[#3A2418] hover:border-[#3A2418]')
            }`}
          >
            <input
              type="radio"
              name={`q-${q.key}`}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(q.key, c.value)}
              className="sr-only"
            />
            {c.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
