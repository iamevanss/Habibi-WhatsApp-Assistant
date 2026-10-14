'use strict';
const choices = ['rock', 'paper', 'scissors'];
function rps(choice) { const user = String(choice || '').toLowerCase(); if (!choices.includes(user)) throw new Error('Choose rock, paper, or scissors'); const bot = choices[Math.floor(Math.random() * 3)]; const winner = user === bot ? 'draw' : ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper')) ? 'user' : 'bot'; return { user, bot, winner }; }
function guessNumber(max = 10) { max = Math.max(2, Math.min(100, Math.floor(Number(max) || 10))); return { answer: Math.floor(Math.random() * max) + 1, max }; }
function coinFlip() { return Math.random() < 0.5 ? 'heads' : 'tails'; }
function rollDice(sides = 6) { sides = Math.max(2, Math.min(100, Math.floor(Number(sides) || 6))); return Math.floor(Math.random() * sides) + 1; }
module.exports = { rps, guessNumber, coinFlip, rollDice };
