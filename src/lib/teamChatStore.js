import { useSyncExternalStore } from "react";

let state = { open: false, unread: 0 };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const teamChat = {
  toggle: () => set({ open: !state.open }),
  setOpen: (open) => set({ open }),
  setUnread: (unread) => { if (state.unread !== unread) set({ unread }); },
};

export const useTeamChat = () => useSyncExternalStore(subscribe, () => state);