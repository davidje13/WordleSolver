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
    if (this.length > 11) {
      // judge uses numbers to match clusters,
      // and javascript numbers can store ints up to 2^53-1 (i.e. 52 bits).
      // We use 1 bit per char to record exact matches,
      // and log2(length) bits per letter (letters <= chars) to record counts,
      // => total bits used = (1 + log2(length)) * length
      // => max length = 11 chars
      throw new Error('unable to calculate exact solution for words this long!');
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

  judgeGuess(word, finalGuess = false) {
    const check = this.allowed.find((v) => (v.w == word));
    if (!check) {
      throw new Error('Invalid guess word!');
    }
    if (finalGuess && !this.solutions.includes(check)) {
      return Number.POSITIVE_INFINITY; // bad choice for a final guess
    }
    return judge(this.length, this.solutions, this.adversarial)(check);
  }

  judgeGuesses(finalGuess = false) {
    const options = finalGuess ? this.solutions : this.allowed;
    const j = judge(this.length, this.solutions, this.adversarial);
    return options
      .map((check) => [check.w, j(check)])
      .sort((a, b) => (a[1] - b[1]));
  }

  guess(finalGuess = false) {
    // optimised version of return judgeGuesses(finalGuess)[0].w;

    if (!this.solutions.length) {
      throw new Error('No possible solutions!');
    }
    if (this.solutions.length <= 2) {
      return randomElement(this.solutions).w;
    }
    const options = finalGuess ? this.solutions : this.allowed;
    return minElementBy(options, judge(this.length, this.solutions, this.adversarial)).w;
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
  const attemptLetterCounts = attempt.x;
  const clusters = new Map();
  for (const s of solutions) {
    let mask = 0;
    for (let i = 0; i < length; ++i) {
      mask = (mask << 1) | (s.w[i] === attempt.w[i]);
    }
    for (const lc of attemptLetterCounts) {
      const wordCount = s.l.get(lc.c) ?? 0;
      mask = (mask * length) + ((wordCount < lc.n) ? wordCount : lc.n);
    }
    clusters.set(mask, (clusters.get(mask) ?? 0) + 1);
  }

  const clusterSizes = [...clusters.values()];
  if (adversarial) {
    return Math.max(...clusterSizes);
  } else {
    // judge for best ability to bisect solutions (on average since each solution has equal probability)
    return clusterSizes.reduce((acc, v) => (acc + (v * v)), 0) / solutions.length;
  }
};
