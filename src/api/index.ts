import { httpCommands } from './http';
import { commands as tauriCommands } from './tauri';

function hasRemote() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any)?.env;
  const base = env?.VITE_SERVER_BASE_URL || localStorage.getItem('server_base_url');
  return !!base;
}

export const commands = hasRemote() ? httpCommands : tauriCommands;

