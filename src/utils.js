'use strict';

function randomElement(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function retainIf(list, predicate) {
  let del = 0;
  for (let i = 0; i < list.length; ++i) {
    if (!predicate(list[i])) {
      ++del;
    } else if (del) {
      list[i - del] = list[i];
    }
  }
  list.length -= del;
}

function minElementBy(list, fn) {
  let best = list[0];
  let bestV = Number.POSITIVE_INFINITY;
  for (const i of list) {
    const v = fn(i);
    if (v < bestV) {
      best = i;
      bestV = v;
    }
  }
  return best;
}
