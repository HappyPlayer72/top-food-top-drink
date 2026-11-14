'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  MapPin,
  Radar,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Restaurant, Vertical, formatScore } from '../../types';

export interface TrapBlitzMinigameProps {
  vertical: Vertical;
  restaurants: Restaurant[];
  onSelectRestaurant: (r: Restaurant) => void;
}

type QuizStyle = 'trap-or-gem' | 'higher-score';
type TrapBucket = 'local' | 'mixed' | 'trap';

interface TrapQuestion {
  kind: 'trap-or-gem';
  venue: Restaurant;
  correctBucket: TrapBucket;
}

interface ScoreComparisonQuestion {
  kind: 'higher-score';
  left: Restaurant;
  right: Restaurant;
  metric: 'foodQualityScore' | 'localsScore';
  correctSide: 'left' | 'right';
}

type QuizQuestion = TrapQuestion | ScoreComparisonQuestion;

const TOTAL_ROUNDS = 5;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTrapBucket(index: number): TrapBucket {
  if (index <= 25) return 'local';
  if (index <= 50) return 'mixed';
  return 'trap';
}

function bucketLabel(bucket: TrapBucket): string {
  if (bucket === 'local') return 'Autentic de Localnici (≤ 25%)';
  if (bucket === 'mixed') return 'Zonă de Mijloc (26–50%)';
  return 'Capcană Turistică (> 50%)';
}

function buildQuestions(
  restaurants: Restaurant[],
  style: QuizStyle
): QuizQuestion[] {
  if (restaurants.length === 0) return [];

  if (style === 'trap-or-gem') {
    // Prioritize including variety (traps/mixed + locals) when available
    const nonLocal = shuffle(
      restaurants.filter((r) => r.touristTrapIndex > 25)
    );
    const locals = shuffle(
      restaurants.filter((r) => r.touristTrapIndex <= 25)
    );
    const chosen: Restaurant[] = [
      ...nonLocal.slice(0, 3),
      ...locals.slice(0, TOTAL_ROUNDS),
    ].slice(0, TOTAL_ROUNDS);

    while (chosen.length < TOTAL_ROUNDS && restaurants.length > 0) {
      const next =
        restaurants[Math.floor(Math.random() * restaurants.length)];
      chosen.push(next);
    }

    return shuffle(chosen).map((venue) => ({
      kind: 'trap-or-gem',
      venue,
      correctBucket: getTrapBucket(venue.touristTrapIndex),
    }));
  }

  // higher-score mode
  const questions: ScoreComparisonQuestion[] = [];
  const shuffled = shuffle(restaurants);
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const pairPool = shuffle(shuffled);
    const left = pairPool[0];
    const metric: 'foodQualityScore' | 'localsScore' =
      i % 2 === 0 ? 'foodQualityScore' : 'localsScore';
    const right =
      pairPool.find(
        (r) => r.id !== left.id && r[metric] !== left[metric]
      ) ?? pairPool[1] ?? left;
    const correctSide: 'left' | 'right' =
      left[metric] >= right[metric] ? 'left' : 'right';
    questions.push({
      kind: 'higher-score',
      left,
      right,
      metric,
      correctSide,
    });
  }
  return questions;
}

function getRankBadge(score: number): {
  title: string;
  subtitle: string;
} {
  if (score >= 4) {
    return {
      title: 'Localnic de Onoare',
      subtitle: 'Ai miros fin la capcane turistice — nu te păcălește niciun meniu cu poze.',
    };
  }
  if (score >= 2) {
    return {
      title: 'Cunoscător de Cartier',
      subtitle: 'Știi destul de bine orașul, dar mai verifică din când în când scorul localnicilor.',
    };
  }
  return {
    title: 'Turist cu Harta-n Mână',
    subtitle: 'Ai picat în câteva capcane clasice — noroc că ai Radarul de pe topfood!',
  };
}

export const TrapBlitzMinigame: React.FC<TrapBlitzMinigameProps> = ({
  vertical,
  restaurants,
  onSelectRestaurant,
}) => {
  const isDrink = vertical === 'drink';

  const [quizStyle, setQuizStyle] = useState<QuizStyle>('trap-or-gem');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    buildQuestions(restaurants, 'trap-or-gem')
  );
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const startQuiz = (style: QuizStyle = quizStyle) => {
    setQuizStyle(style);
    setQuestions(buildQuestions(restaurants, style));
    setRoundIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSelectedAnswer(null);
    setIsFinished(false);
  };

  const currentQuestion = questions[roundIdx];
  const hasAnswered = selectedAnswer !== null;

  const isAnswerCorrect = (() => {
    if (!currentQuestion || !selectedAnswer) return false;
    if (currentQuestion.kind === 'trap-or-gem') {
      return selectedAnswer === currentQuestion.correctBucket;
    }
    return selectedAnswer === currentQuestion.correctSide;
  })();

  const handleSelectAnswer = (answer: string) => {
    if (!currentQuestion || hasAnswered) return;
    setSelectedAnswer(answer);
    const correct =
      currentQuestion.kind === 'trap-or-gem'
        ? answer === currentQuestion.correctBucket
        : answer === currentQuestion.correctSide;

    if (correct) {
      const nextStreak = streak + 1;
      setScore((s) => s + 1);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
    } else {
      setStreak(0);
    }
  };

  const handleNextRound = () => {
    if (roundIdx + 1 >= questions.length) {
      setIsFinished(true);
      return;
    }
    setRoundIdx((i) => i + 1);
    setSelectedAnswer(null);
  };

  const rankBadge = getRankBadge(score);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Radar
            className={`w-4 h-4 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}
          />
          <h2 className="font-display text-[24px] sm:text-[28px] leading-tight">
            Radar de Capcane — Quiz de Localnic
          </h2>
        </div>
        <p
          className={`text-[13px] sm:text-[14px] ${
            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
          }`}
        >
          5 runde rapide pe date reale din Timișoara. Testează cât de bine
          deosebești locurile autentice de capcanele turistice.
        </p>
      </div>

      {/* Quiz Mode Switcher & Score Strip */}
      <div
        className={`rounded-[6px] border p-4 flex flex-wrap items-center justify-between gap-3 ${
          isDrink
            ? 'bg-[#143025] border-[#285443]'
            : 'bg-[#FAF8F5] border-[#E6DFD5]'
        }`}
      >
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => startQuiz('trap-or-gem')}
            className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
              quizStyle === 'trap-or-gem'
                ? isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                  : 'bg-[#3A2418] text-white border-[#3A2418]'
                : isDrink
                ? 'border-[#2D5947] text-[#F4EEE2]/80'
                : 'border-[#D6CFC5] text-[#3A2418]'
            }`}
          >
            Comoară sau Capcană?
          </button>
          <button
            type="button"
            onClick={() => startQuiz('higher-score')}
            className={`btn-press px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border ${
              quizStyle === 'higher-score'
                ? isDrink
                  ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                  : 'bg-[#3A2418] text-white border-[#3A2418]'
                : isDrink
                ? 'border-[#2D5947] text-[#F4EEE2]/80'
                : 'border-[#D6CFC5] text-[#3A2418]'
            }`}
          >
            Cine are scorul mai mare?
          </button>
        </div>

        <div className="flex items-center gap-4 text-[12px] font-bold tabular-nums">
          <span>
            Runda {Math.min(roundIdx + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
          </span>
          <span className={isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}>
            Scor: {score}/{TOTAL_ROUNDS}
          </span>
          {streak >= 2 && (
            <span className="px-2 py-0.5 rounded-[3px] bg-[#E0A526] text-[#3A2418]">
              Serie {streak}x
            </span>
          )}
        </div>
      </div>

      {/* Active Question */}
      {!isFinished && currentQuestion && (
        <div
          className={`rounded-[6px] border p-5 space-y-4 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#2D5947]'
              : 'bg-white border-[#E6DFD5] shadow-sm'
          }`}
        >
          {currentQuestion.kind === 'trap-or-gem' ? (
            <>
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                  Ce verdict are acest local?
                </div>
                <h3 className="font-display text-[26px] sm:text-[30px] leading-tight">
                  {currentQuestion.venue.name}
                </h3>
                <div
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${
                    isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentQuestion.venue.neighborhood}
                  </span>
                  <span>· {currentQuestion.venue.cuisine}</span>
                  <span className="tabular-nums">
                    · ~{currentQuestion.venue.avgMealPriceRon} lei (
                    {currentQuestion.venue.priceTier})
                  </span>
                </div>
              </div>

              <p className="text-[14px] leading-relaxed">
                {currentQuestion.venue.editorialHeadline}
              </p>

              <div className="grid sm:grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: 'local',
                      label: 'Autentic de Localnici',
                      sub: 'Trap Index ≤ 25%',
                    },
                    {
                      id: 'mixed',
                      label: 'Zonă de Mijloc',
                      sub: 'Trap Index 26–50%',
                    },
                    {
                      id: 'trap',
                      label: 'Capcană Turistică',
                      sub: 'Trap Index > 50%',
                    },
                  ] as const
                ).map((opt) => {
                  const isChosen = selectedAnswer === opt.id;
                  const isRight = currentQuestion.correctBucket === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleSelectAnswer(opt.id)}
                      className={`btn-press rounded-[4px] border p-3 text-left transition-all ${
                        hasAnswered
                          ? isRight
                            ? 'bg-[#1F4E8C] border-[#1F4E8C] text-white'
                            : isChosen
                            ? 'bg-[#B3261E] border-[#B3261E] text-white'
                            : isDrink
                            ? 'border-[#285443] opacity-55'
                            : 'border-[#E6DFD5] opacity-55'
                          : isDrink
                          ? 'bg-[#143025] border-[#2D5947] hover:border-[#F2A33A]'
                          : 'bg-[#FAF8F5] border-[#D6CFC5] hover:border-[#3A2418]'
                      }`}
                    >
                      <div className="text-[13px] font-bold">{opt.label}</div>
                      <div className="text-[11px] opacity-75">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              {hasAnswered && (
                <div
                  className={`rounded-[4px] border p-4 space-y-3 ${
                    isDrink
                      ? 'bg-[#143025] border-[#2D5947]'
                      : 'bg-[#FAF8F5] border-[#E6DFD5]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
                      {isAnswerCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-[#E0A526]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#B3261E]" />
                      )}
                      {isAnswerCorrect
                        ? 'Corect!'
                        : `Aproape — este ${bucketLabel(currentQuestion.correctBucket)}`}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums">
                      Trap Index: {currentQuestion.venue.touristTrapIndex}%
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] tabular-nums">
                    <span>
                      Scor Onest:{' '}
                      <strong>
                        {formatScore(currentQuestion.venue.foodQualityScore)}
                      </strong>
                    </span>
                    <span>
                      Localnici:{' '}
                      <strong>
                        {formatScore(currentQuestion.venue.localsScore)}
                      </strong>
                    </span>
                    <span>
                      Turiști:{' '}
                      <strong>
                        {formatScore(currentQuestion.venue.touristsScore)}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleNextRound}
                      className={`btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-bold ${
                        isDrink
                          ? 'bg-[#F2A33A] text-[#17382C]'
                          : 'bg-[#3A2418] text-white'
                      }`}
                    >
                      <span>
                        {roundIdx + 1 >= TOTAL_ROUNDS
                          ? 'Vezi rezultatul final'
                          : 'Următoarea întrebare'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectRestaurant(currentQuestion.venue)}
                      className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border text-[12px] font-semibold ${
                        isDrink
                          ? 'border-[#2D5947] text-[#F4EEE2]'
                          : 'border-[#D6CFC5] text-[#3A2418]'
                      }`}
                    >
                      <span>Deschide localul</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                  {currentQuestion.metric === 'foodQualityScore'
                    ? 'Care local are Scorul Onest mai mare?'
                    : 'Care local are scorul mai mare la Localnici?'}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    { side: 'left', venue: currentQuestion.left },
                    { side: 'right', venue: currentQuestion.right },
                  ] as const
                ).map(({ side, venue }) => {
                  const isChosen = selectedAnswer === side;
                  const isRight = currentQuestion.correctSide === side;
                  return (
                    <button
                      key={`${side}-${venue.id}`}
                      type="button"
                      disabled={hasAnswered}
                      onClick={() => handleSelectAnswer(side)}
                      className={`btn-press rounded-[6px] border p-4 text-left space-y-2 transition-all ${
                        hasAnswered
                          ? isRight
                            ? 'bg-[#1F4E8C] border-[#1F4E8C] text-white'
                            : isChosen
                            ? 'bg-[#B3261E] border-[#B3261E] text-white'
                            : isDrink
                            ? 'border-[#285443] opacity-60'
                            : 'border-[#E6DFD5] opacity-60'
                          : isDrink
                          ? 'bg-[#143025] border-[#2D5947] hover:border-[#F2A33A]'
                          : 'bg-[#FAF8F5] border-[#D6CFC5] hover:border-[#3A2418]'
                      }`}
                    >
                      <div className="font-display text-[22px] leading-tight">
                        {venue.name}
                      </div>
                      <div className="text-[12px] opacity-80">
                        {venue.neighborhood} · {venue.cuisine} · ~
                        {venue.avgMealPriceRon} lei
                      </div>
                      {hasAnswered && (
                        <div className="pt-1 text-[13px] font-bold tabular-nums">
                          Scor Onest: {formatScore(venue.foodQualityScore)} ·
                          Localnici: {formatScore(venue.localsScore)} · Turiști:{' '}
                          {formatScore(venue.touristsScore)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {hasAnswered && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
                    {isAnswerCorrect ? (
                      <ShieldCheck className="w-4 h-4 text-[#E0A526]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#B3261E]" />
                    )}
                    {isAnswerCorrect
                      ? 'Ai ghicit corect!'
                      : 'Altă dată o să nimerești din prima!'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectRestaurant(
                          currentQuestion.correctSide === 'left'
                            ? currentQuestion.left
                            : currentQuestion.right
                        )
                      }
                      className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border text-[12px] font-semibold ${
                        isDrink
                          ? 'border-[#2D5947] text-[#F4EEE2]'
                          : 'border-[#D6CFC5] text-[#3A2418]'
                      }`}
                    >
                      <span>Inspectează câștigătorul</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextRound}
                      className={`btn-press inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] text-[13px] font-bold ${
                        isDrink
                          ? 'bg-[#F2A33A] text-[#17382C]'
                          : 'bg-[#3A2418] text-white'
                      }`}
                    >
                      <span>
                        {roundIdx + 1 >= TOTAL_ROUNDS
                          ? 'Vezi rezultatul final'
                          : 'Următoarea întrebare'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Final Score Card */}
      {isFinished && (
        <div
          className={`rounded-[6px] border p-5 sm:p-6 text-center space-y-3 stagger-fade-in ${
            isDrink
              ? 'bg-[#17382C] border-[#F2A33A]'
              : 'bg-white border-[#B3261E] shadow-sm'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-[11px] font-bold uppercase tracking-wide bg-[#1F4E8C] text-white">
            <Award className="w-3.5 h-3.5" />
            <span>Verdict Quiz</span>
          </div>

          <h3 className="font-display text-[32px] sm:text-[38px] leading-tight">
            {rankBadge.title}
          </h3>

          <div
            className={`text-[18px] font-bold tabular-nums ${
              isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
            }`}
          >
            Scor final: {score} / {TOTAL_ROUNDS} · Cea mai lungă serie: {bestStreak}
          </div>

          <p
            className={`text-[13px] max-w-md mx-auto ${
              isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
            }`}
          >
            {rankBadge.subtitle}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => startQuiz(quizStyle)}
              className={`btn-press inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[4px] font-bold text-[13px] ${
                isDrink
                  ? 'bg-[#F2A33A] text-[#17382C]'
                  : 'bg-[#3A2418] text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Joacă un quiz nou</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
