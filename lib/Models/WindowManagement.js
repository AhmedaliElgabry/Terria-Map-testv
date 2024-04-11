export function createWindowsManagementState() {
  return { list: [] };
}

export const WindowsManager = {
  closeWindow(state, id) {
    const win = state.list.find(w => w.id == id);
    if (!win) return state;
    if (win.onClose) win.onClose();
    return {
      ...state,
      list: state.list.filter(w => w.id != id)
    };
  },
  minimizeWindow(state, id) {
    return {
      ...state,
      list: state.list.map(w => ({
        ...w,
        minimized: w.id == id ? true : w.minimized
      }))
    };
  },
  restoreWindow(state, id) {
    return {
      ...state,
      list: state.list.map(w => ({
        ...w,
        minimized: w.id == id ? false : w.minimized
      }))
    };
  },
  addWindow(state, id, title, icon, onClose) {
    return {
      ...state,
      list: [...state.list, { id, title, icon, minimized: false, onClose }]
    };
  }
};
