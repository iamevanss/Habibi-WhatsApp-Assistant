// features/todos.js — per-user todo list with reminders
const { Collection } = require('../db');

const todosStore = new Collection('user_todos', {});

function getTodos(userId) {
  return todosStore.get(userId, []) || [];
}

function addTodo(userId, text, dueAt = null) {
  const todo = {
    id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: String(text || '').trim(),
    done: false,
    created: Date.now(),
    dueAt: dueAt ? Number(dueAt) : null,
    reminderSent: false,
  };
  const list = getTodos(userId);
  list.unshift(todo);
  todosStore.set(userId, list);
  return todo;
}

function completeTodo(userId, id) {
  const list = getTodos(userId);
  const idx = list.findIndex(t => t.id === id);
  if (idx === -1) return null;
  list[idx].done = true;
  todosStore.set(userId, list);
  return list[idx];
}

function deleteTodo(userId, id) {
  const list = getTodos(userId);
  const idx = list.findIndex(t => t.id === id);
  if (idx === -1) return null;
  list.splice(idx, 1);
  todosStore.set(userId, list);
  return true;
}

function listTodos(userId, showAll = false) {
  const list = getTodos(userId);
  return showAll ? list : list.filter(t => !t.done).slice(0, 20);
}

function checkDueTodos() {
  const now = Date.now();
  const alerts = [];
  for (const [userId, todos] of Object.entries(todosStore.all())) {
    for (const todo of todos) {
      if (todo.dueAt && !todo.done && !todo.reminderSent && todo.dueAt <= now) {
        todo.reminderSent = true;
        todosStore.set(userId, todos);
        alerts.push({ userId, todo });
      }
    }
  }
  return alerts;
}

module.exports = { addTodo, completeTodo, deleteTodo, listTodos, getTodos, checkDueTodos };
