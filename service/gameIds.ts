import { adjectives, nouns } from './gameIdWords.ts';

const slug = (word: string) =>
  word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const pick = (words: string[]) => slug(words[Math.floor(Math.random() * words.length)]);

// A readable game id like "grand-harbor-42". Two games can draw the same one, so check it's free.
export const newGameId = () =>
  `${pick(adjectives)}-${pick(nouns)}-${10 + Math.floor(Math.random() * 90)}`;
