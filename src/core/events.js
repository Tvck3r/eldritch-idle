// Tiny event bus so core logic can announce things without knowing about the DOM.
//   'log'            (msg)    a line for the omen log
//   'summoned'       (gain)   a summoning completed
//   'state-replaced' ()       state was swapped wholesale (summon, reset, import)
//   'settings'       (settings)

const listeners = {};

export function on(type, fn) {
  (listeners[type] ??= []).push(fn);
  return () => { listeners[type] = listeners[type].filter(f => f !== fn); };
}

export function emit(type, payload) {
  for (const fn of listeners[type] ?? []) fn(payload);
}
