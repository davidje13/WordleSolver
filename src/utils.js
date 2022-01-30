'use strict';

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
