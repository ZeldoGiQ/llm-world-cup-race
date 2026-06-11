import { describe, expect, it } from 'vitest';
import { computeStandings, scorePrediction, scoreForDisplay } from './scoring';
import type { Match, Model, PredictionsFile } from './types';

describe('scorePrediction (Kicktipp-Schema)', () => {
  it('gibt 4 Punkte für das exakte Ergebnis (Heimsieg)', () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 })).toEqual({
      points: 4,
      category: 'exact',
    });
  });

  it('gibt 4 Punkte für das exakte Remis', () => {
    expect(scorePrediction({ home: 1, away: 1 }, { home: 1, away: 1 })).toEqual({
      points: 4,
      category: 'exact',
    });
    expect(scorePrediction({ home: 0, away: 0 }, { home: 0, away: 0 })).toEqual({
      points: 4,
      category: 'exact',
    });
  });

  it('gibt 3 Punkte für die richtige Tordifferenz bei Heimsieg', () => {
    expect(scorePrediction({ home: 3, away: 2 }, { home: 2, away: 1 })).toEqual({
      points: 3,
      category: 'goalDiff',
    });
  });

  it('gibt 3 Punkte für die richtige Tordifferenz bei Auswärtssieg', () => {
    expect(scorePrediction({ home: 0, away: 2 }, { home: 1, away: 3 })).toEqual({
      points: 3,
      category: 'goalDiff',
    });
  });

  it('wertet ein nicht-exaktes Remis nur als Tendenz, nie als Tordifferenz', () => {
    // 2:2 getippt, 1:1 gespielt -> Differenz wäre 0=0, zählt aber als Tendenz
    expect(scorePrediction({ home: 2, away: 2 }, { home: 1, away: 1 })).toEqual({
      points: 2,
      category: 'tendency',
    });
  });

  it('gibt 2 Punkte für die richtige Tendenz (Heimsieg)', () => {
    expect(scorePrediction({ home: 1, away: 0 }, { home: 3, away: 1 })).toEqual({
      points: 2,
      category: 'tendency',
    });
  });

  it('gibt 2 Punkte für die richtige Tendenz (Auswärtssieg)', () => {
    expect(scorePrediction({ home: 0, away: 1 }, { home: 1, away: 4 })).toEqual({
      points: 2,
      category: 'tendency',
    });
  });

  it('gibt 0 Punkte bei falscher Tendenz', () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 1, away: 1 })).toEqual({
      points: 0,
      category: 'none',
    });
    expect(scorePrediction({ home: 0, away: 2 }, { home: 2, away: 0 })).toEqual({
      points: 0,
      category: 'none',
    });
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 0 })).toEqual({
      points: 0,
      category: 'none',
    });
  });

  it('respektiert konfigurierbare Punktwerte', () => {
    const config = { exact: 10, goalDiff: 5, tendency: 1 };
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 }, config).points).toBe(10);
    expect(scorePrediction({ home: 3, away: 2 }, { home: 2, away: 1 }, config).points).toBe(5);
    expect(scorePrediction({ home: 1, away: 0 }, { home: 4, away: 0 }, config).points).toBe(1);
  });
});

/* ------------------------------------------------------------------ */

const MODELS: Model[] = [
  { id: 'gpt', name: 'GPT', provider: 'OpenAI', color: '#10a37f' },
  { id: 'gemini', name: 'Gemini', provider: 'Google', color: '#4285f4' },
  { id: 'claude', name: 'Claude', provider: 'Anthropic', color: '#d97757' },
];

function match(partial: Partial<Match> & { id: number }): Match {
  return {
    stage: 'GROUP_STAGE',
    group: 'A',
    utcDate: '2026-06-11T19:00:00Z',
    status: 'FINISHED',
    home: { id: 1, name: 'Mexico', tla: 'MEX' },
    away: { id: 2, name: 'South Africa', tla: 'RSA' },
    score: { home: 2, away: 1 },
    ...partial,
  };
}

describe('computeStandings', () => {
  it('wertet nur FINISHED-Spiele, keine LIVE/UPCOMING/OTHER', () => {
    const matches = [
      match({ id: 1, status: 'FINISHED', score: { home: 2, away: 1 } }),
      match({ id: 2, status: 'LIVE', score: { home: 2, away: 1 } }),
      match({ id: 3, status: 'UPCOMING', score: { home: null, away: null } }),
      match({ id: 4, status: 'OTHER', score: { home: null, away: null } }),
    ];
    const predictions: PredictionsFile = {
      predictions: {
        '1': { gpt: { home: 2, away: 1 } },
        '2': { gpt: { home: 2, away: 1 } },
        '3': { gpt: { home: 1, away: 0 } },
        '4': { gpt: { home: 1, away: 0 } },
      },
    };
    const standings = computeStandings(MODELS, matches, predictions);
    const gpt = standings.find((row) => row.model.id === 'gpt')!;
    expect(gpt.points).toBe(4);
    expect(gpt.scoredMatches).toBe(1);
  });

  it('zählt fehlende Tipps nicht als gewertete Spiele und crasht nicht', () => {
    const matches = [match({ id: 1 })];
    const predictions: PredictionsFile = {
      predictions: { '1': { gpt: { home: 2, away: 1 } } },
    };
    const standings = computeStandings(MODELS, matches, predictions);
    const gemini = standings.find((row) => row.model.id === 'gemini')!;
    expect(gemini.points).toBe(0);
    expect(gemini.scoredMatches).toBe(0);
    expect(standings).toHaveLength(3);
  });

  it('ignoriert FINISHED-Spiele ohne vollständiges Ergebnis', () => {
    const matches = [match({ id: 1, score: { home: null, away: null } })];
    const predictions: PredictionsFile = {
      predictions: { '1': { gpt: { home: 2, away: 1 } } },
    };
    const gpt = computeStandings(MODELS, matches, predictions).find(
      (row) => row.model.id === 'gpt',
    )!;
    expect(gpt.points).toBe(0);
    expect(gpt.scoredMatches).toBe(0);
  });

  it('ignoriert Tipps von unbekannten Modell-IDs', () => {
    const matches = [match({ id: 1 })];
    const predictions: PredictionsFile = {
      predictions: { '1': { unknown_model: { home: 2, away: 1 } } },
    };
    expect(() => computeStandings(MODELS, matches, predictions)).not.toThrow();
    expect(computeStandings(MODELS, matches, predictions)).toHaveLength(3);
  });

  it('sortiert nach Punkten, dann exakten Treffern (Tiebreak 1)', () => {
    // gpt: 1x exakt (4 P.) | gemini: 2x Tendenz (4 P.) -> gpt vor gemini
    const matches = [
      match({ id: 1, score: { home: 2, away: 1 } }),
      match({ id: 2, score: { home: 1, away: 0 } }),
    ];
    const predictions: PredictionsFile = {
      predictions: {
        '1': { gpt: { home: 2, away: 1 }, gemini: { home: 3, away: 0 } },
        '2': { gpt: { home: 0, away: 1 }, gemini: { home: 2, away: 0 } },
      },
    };
    const standings = computeStandings(MODELS, matches, predictions);
    expect(standings[0]!.model.id).toBe('gpt');
    expect(standings[0]!.points).toBe(4);
    expect(standings[1]!.model.id).toBe('gemini');
    expect(standings[1]!.points).toBe(4);
    expect(standings[0]!.rank).toBe(1);
    expect(standings[1]!.rank).toBe(2);
  });

  it('nutzt mehr gewertete Spiele als Tiebreak 2', () => {
    // gpt & gemini: je 2 Punkte, 0 exakte – gemini mit 2 gewerteten Spielen vor gpt mit 1
    const matches = [
      match({ id: 1, score: { home: 2, away: 1 } }),
      match({ id: 2, score: { home: 0, away: 2 } }),
    ];
    const predictions: PredictionsFile = {
      predictions: {
        '1': { gpt: { home: 1, away: 0 }, gemini: { home: 1, away: 0 } },
        '2': { gemini: { home: 2, away: 0 } },
      },
    };
    const standings = computeStandings(MODELS, matches, predictions);
    expect(standings[0]!.model.id).toBe('gemini');
    expect(standings[0]!.scoredMatches).toBe(2);
    expect(standings[1]!.model.id).toBe('gpt');
  });

  it('vergibt bei komplettem Gleichstand denselben Rang und überspringt danach', () => {
    const matches = [match({ id: 1, score: { home: 2, away: 1 } })];
    const predictions: PredictionsFile = {
      predictions: {
        '1': {
          gpt: { home: 1, away: 0 },
          gemini: { home: 1, away: 0 },
          claude: { home: 0, away: 1 },
        },
      },
    };
    const standings = computeStandings(MODELS, matches, predictions);
    expect(standings[0]!.rank).toBe(1);
    expect(standings[1]!.rank).toBe(1);
    expect(standings[2]!.rank).toBe(3);
  });

  it('funktioniert mit leeren Daten', () => {
    expect(computeStandings(MODELS, [], { predictions: {} })).toHaveLength(3);
    expect(
      computeStandings(MODELS, [match({ id: 1 })], undefined as unknown as PredictionsFile),
    ).toHaveLength(3);
  });
});

describe('scoreForDisplay', () => {
  it('liefert endgültige Punkte für FINISHED', () => {
    const result = scoreForDisplay(match({ id: 1 }), { home: 2, away: 1 });
    expect(result).toEqual({ points: 4, category: 'exact', provisional: false });
  });

  it('liefert vorläufige Punkte für LIVE', () => {
    const result = scoreForDisplay(
      match({ id: 1, status: 'LIVE', score: { home: 1, away: 0 } }),
      { home: 2, away: 1 },
    );
    expect(result).toEqual({ points: 3, category: 'goalDiff', provisional: true });
  });

  it('liefert null für UPCOMING oder fehlende Tipps', () => {
    expect(
      scoreForDisplay(match({ id: 1, status: 'UPCOMING', score: { home: null, away: null } }), {
        home: 2,
        away: 1,
      }),
    ).toBeNull();
    expect(scoreForDisplay(match({ id: 1 }), undefined)).toBeNull();
  });
});
