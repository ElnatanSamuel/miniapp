const stamp = () => new Date().toTimeString().slice(0, 8);

export function createLogger(scope: string) {
  const tag = `[${scope}]`;
  return {
    info: (...args: unknown[]) => console.log(tag, stamp(), ...args),
    warn: (...args: unknown[]) => console.warn(tag, stamp(), ...args),
    error: (...args: unknown[]) => console.error(tag, stamp(), ...args),
  };
}
