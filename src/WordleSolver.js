'use strict';

const ABSENT = 0;
const PRESENT = 1;
const CORRECT = 2;

class WordleSolver {
  constructor(data) {
    if (!data.solution.length) {
      throw new Error('No possible solutions');
    }
    this.length = data.solution[0].length;
    // judge uses numbers to match clusters,
    // and javascript numbers can store ints up to 2^53-1 (i.e. 52 bits).
    // We use 1 bit per char to record exact matches,
    // and log2(length) bits per letter (letters <= chars) to record counts,
    // => total bits used = (1 + log2(length)) * length
    // => max length = 11 chars
    if (this.length > 11) {
      throw new Error('Unable to calculate exact solution for words this long!');
    }
    if (
      data.solution.some((word) => (word.length !== this.length)) ||
      data.allowed.some((word) => (word.length !== this.length))
    ) {
      throw new Error('All words must have same length');
    }

    this.solutions = data.solution.map(interpret);
    this.allowed = data.allowed.map(interpret);
  }

  game(options) {
    return new WordleSolverGame(this, options);
  }
}

class WordleSolverGame {
  constructor(solver, { hardMode = false, adversarial = false } = {}) {
    this.solutions = [...solver.solutions];
    this.allowed = [...solver.solutions, ...solver.allowed];
    this.length = solver.length;
    this.hardMode = hardMode;
    this.adversarial = adversarial;
  }

  possibileSolutionsCount() {
    return this.solutions.length;
  }

  possibileSolutions() {
    return this.solutions.map((v) => v.w);
  }

  judgeGuess(word, { finalGuess = false } = {}) {
    const check = this.allowed.find((v) => (v.w == word));
    if (!check) {
      throw new Error('Invalid guess word!');
    }
    if (finalGuess && !this.solutions.includes(check)) {
      return Number.POSITIVE_INFINITY; // bad choice for a final guess
    }
    return judge(this.length, this.solutions, this.adversarial)(check).s;
  }

  judgeGuesses({ finalGuess = false } = {}) {
    return (finalGuess ? this.solutions : this.allowed)
      .map(judge(this.length, this.solutions, this.adversarial))
      .sort((a, b) => (a.s - b.s));
  }

  guess({ inferiorScoreThreshold = 0, ...options } = {}) {
    if (!this.solutions.length) {
      throw new Error('No possible solutions!');
    }
    const judged = this.judgeGuesses(options);

    const scoreThreshold = judged[0].s + inferiorScoreThreshold;
    let num = judged.length;
    for (let n = 1; n < judged.length; ++n) {
      if (judged[n].s > scoreThreshold) {
        num = n;
        break;
      }
    }
    return judged[Math.floor(Math.random() * num)].w;
  }

  feedback(attempt, match) {
    if (attempt.length !== this.length || match.length !== this.length) {
      throw new Error('Invalid attempt feedback');
    }

    const observedLetterCounts = new Map();
    const knownLetterCounts = new Set();
    const knownPositions = match.map((result, i) => {
      const c = attempt[i];
      if (result === ABSENT) {
        observedLetterCounts.set(c, observedLetterCounts.get(c) ?? 0);
        knownLetterCounts.add(c);
      } else {
        observedLetterCounts.set(c, (observedLetterCounts.get(c) ?? 0) + 1);
      }
      return [c, result === CORRECT];
    });
    const requiredLetterCounts = [...observedLetterCounts].map(([c, n]) => ([c, n, knownLetterCounts.has(c)]));

    const check = (v) => (
      knownPositions.every(([c, correct], i) => ((v.w[i] === c) === correct)) &&
      requiredLetterCounts.every(([c, n, exact]) => {
        const wordN = v.l.get(c) ?? 0;
        return (wordN >= n && (!exact || wordN === n));
      })
    );

    retainIf(this.solutions, check);
    if (this.hardMode) {
      retainIf(this.allowed, check);
    }
  }
}

function interpret(word) {
  const letterCounts = new Map();
  for (const c of word) {
    letterCounts.set(c, (letterCounts.get(c) ?? 0) + 1);
  }
  return { w: word, l: letterCounts, x: [...letterCounts].map((v) => ({ c: v[0], n: v[1] })) };
}

const judge = (length, solutions, adversarial) => (attempt) => {
  const count = solutions.length;
  const attemptLetterCounts = attempt.x;
  const letters = attemptLetterCounts.length;

  const clusters = new Map();
  for (let s = 0; s < count; ++s) {
    const solution = solutions[s];
    let mask = 0;
    for (let i = 0; i < length; ++i) {
      mask = (mask << 1) | (solution.w[i] === attempt.w[i]);
    }
    for (let i = 0; i < letters; ++i) {
      const lc = attemptLetterCounts[i];
      const wordCount = solution.l.get(lc.c) ?? 0;
      mask = (mask * length) + ((wordCount < lc.n) ? wordCount : lc.n);
    }
    clusters.set(mask, (clusters.get(mask) ?? 0) + 1);
  }

  // if the word we guess solves the challenge, rate that as 0 instead of 1
  let selfMask = (1 << length) - 1;
  for (let i = 0; i < letters; ++i) {
    selfMask = (selfMask * length) + attemptLetterCounts[i].n;
  }
  clusters.set(selfMask, 0);

  const clusterSizes = [...clusters.values()];
  let score;
  if (adversarial) {
    score = Math.max(...clusterSizes);
  } else {
    // judge for best ability to bisect solutions (on average since each solution has equal probability)
    score = clusterSizes.reduce((acc, v) => (acc + (v * v)), 0) / solutions.length;
  }
  return { w: attempt.w, s: score };
};
