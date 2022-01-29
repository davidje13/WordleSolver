'use strict';

const solver = new WordleSolver(data, false);

window.addEventListener('DOMContentLoaded', () => {
  const beginButton = make('button', {}, ['New Game']);
  const hardMode = make('input', { type: 'checkbox' });
  const gameDOM = make('div');

  function begin() {
    clearDOM(gameDOM);
    const game = solver.game({ hardMode: hardMode.checked });
    let latestGuess = '';

    const history = make('ol');
    const guess = make('output');
    const feedback = make('input', { type: 'text', placeholder: '?'.repeat(game.length) });
    const form = make('form', {}, [guess, feedback]);
    const possible = make('ul');

    function next() {
      clearDOM(possible);
      latestGuess = game.guess();
      guess.value = latestGuess;
      feedback.value = '';

      const n = game.possibileSolutionsCount();
      if (n < 50) {
        game.possibileSolutions().forEach((word) => possible.appendChild(make('li', {}, [word])));
      } else {
        possible.appendChild(make('li', {}, [`${n} possible solutions`]));
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!feedback.value) {
        return;
      }
      const f = readFeedback(game.length, feedback.value);
      game.feedback(latestGuess, f);
      history.appendChild(make('li', {}, f.map((r, i) => make('span', { class: `result res-${r}` }, [latestGuess[i]]))));
      next();
    });

    gameDOM.appendChild(history);
    gameDOM.appendChild(form);
    gameDOM.appendChild(possible);
    next();
  }

  beginButton.addEventListener('click', begin);

  document.body.appendChild(beginButton);
  document.body.appendChild(make('label', {}, [hardMode, 'Hard Mode']));
  document.body.appendChild(gameDOM);

  begin();
});

function readFeedback(size, v) {
  const trimmed = v.trim().toLowerCase();
  if (trimmed.length !== size) {
    throw new Error('Incorrect feedback length');
  }
  return [...trimmed].map((c) => {
    switch (c) {
      case '-':
      case 'a':
      case 'n':
      case 'x':
        return ABSENT;
      case '~':
      case 'p':
        return PRESENT;
      case 'c':
      case 'y':
        return CORRECT;
      default:
        throw new Error(`Unknown feedback value: ${c}`);
    }
  });
}
