'use strict';
const jokes = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'A SQL query walks into a bar and asks: can I join you?',
  'There are 10 kinds of people: those who understand binary and those who do not.',
  'Debugging: being the detective in a crime movie where you are also the culprit.'
];
const facts = ['Octopuses have three hearts.', 'Honeybees communicate food locations through movement.', 'A day on Venus is longer than its year.'];
function pick(items, random = Math.random) { return items[Math.floor(random() * items.length)]; }
function joke() { return pick(jokes); }
function fact() { return pick(facts); }
function quote() { return pick(['Small steps still move you forward.', 'Consistency beats intensity when repeated.', 'Learn something today that helps tomorrow.']); }
module.exports = { joke, fact, quote, jokes, facts };
