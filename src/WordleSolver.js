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
    return this.solutions.map(([word]) => word);
  }

  judgeGuess(word, finalGuess = false) {
    const check = this.allowed.find((v) => (v[0] == word));
    if (!check) {
      throw new Error('Invalid guess word!');
    }
    if (finalGuess && !this.solutions.includes(check)) {
      return Number.POSITIVE_INFINITY; // bad choice for a final guess
    }
    return judge(this.solutions, this.adversarial)(check);
  }

  judgeGuesses(finalGuess = false) {
    const options = finalGuess ? this.solutions : this.allowed;
    const j = judge(this.solutions, this.adversarial);
    return options
      .map((check) => [check[0], j(check)])
      .sort((a, b) => (a[1] - b[1]));
  }

  guess(finalGuess = false) {
    // optimised version of return judgeGuesses(finalGuess)[0][0];

    if (!this.solutions.length) {
      throw new Error('No possible solutions!');
    }
    if (this.solutions.length <= 2) {
      return randomElement(this.solutions)[0];
    }
    const options = finalGuess ? this.solutions : this.allowed;
    if (this.solutions.length > 500) {
      // TODO: proper algorithm needs much better speed!
      // ROATE found to be best starting word (18.72 minutes to calculate)
      if (this.solutions.length === 2315) {
        return 'roate';
      }
      return randomElement(this.solutions)[0];
    }
    return minElementBy(options, judge(this.solutions, this.adversarial))[0];
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
        observedLetterCounts.set(c, observedLetterCounts.get(c) || 0);
        knownLetterCounts.add(c);
      } else {
        observedLetterCounts.set(c, (observedLetterCounts.get(c) || 0) + 1);
      }
      return [c, result === CORRECT];
    });
    const requiredLetterCounts = [...observedLetterCounts].map(([c, n]) => ([c, n, knownLetterCounts.has(c)]));

    const check = ([word, letterCounts]) => (
      knownPositions.every(([c, correct], i) => ((word[i] === c) === correct)) &&
      requiredLetterCounts.every(([c, n, exact]) => {
        const wordN = letterCounts.get(c) || 0;
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
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }
  return [word, letterCounts, [...letterCounts]];
}

const judge = (solutions, adversarial) => ([attempt, _, attemptLetterCountsList]) => {
  // judge for best ability to bisect solutions (on average since each solution has equal probability)

  const count = solutions.length;
  const length = attempt.length;
  const letters = attemptLetterCountsList.length;

  const precalcSolutions = solutions.map(([word, letterCounts]) => {
    let matchMask = 0;
    for (let i = 0; i < length; ++i) {
      matchMask = (matchMask << 1) | (word[i] === attempt[i] ? 1 : 0);
    }
    const matchCounts = new Uint8Array(attemptLetterCountsList.map(([c]) => (letterCounts.get(c) || 0)));
    return [matchMask, matchCounts];
  });

  const clusterSizes = [];
  const counts = new Uint8Array(letters * 2);
  for (let a = 0; a < count; ++a) {
    if (!precalcSolutions[a]) {
      continue;
    }
    const [actualPositionMask, actualLetterCounts] = precalcSolutions[a];
    for (let i = 0; i < letters; ++i) {
      const attemptN = attemptLetterCountsList[i][1];
      const actualN = actualLetterCounts[i];
      counts[i] = (attemptN > actualN) ? actualN : attemptN;
      counts[i + letters] = (attemptN > actualN);
    }
    let clusterSize = 1;
    for (let b = a + 1; b < count; ++b) {
      if (!precalcSolutions[b]) {
        continue;
      }
      const [possiblePositionMask, possibleLetterCounts] = precalcSolutions[b];
      if (actualPositionMask !== possiblePositionMask) {
        continue;
      }
      let match = true;
      for (let i = 0; i < letters; ++i) {
        const feedbackN = counts[i];
        const wordN = possibleLetterCounts[i];
        if (wordN < feedbackN || (wordN !== feedbackN && counts[i + letters])) {
          match = false;
          break;
        }
      }
      if (match) {
        ++clusterSize;
        precalcSolutions[b] = null;
      }
    }
    clusterSizes.push(clusterSize);
  }
  if (adversarial) {
    return Math.max(...clusterSizes);
  } else {
    return clusterSizes.reduce((acc, v) => (acc + (v * v)), 0) / solutions.length;
  }
};
