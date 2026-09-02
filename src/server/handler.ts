type Handlers = Record<string, CallableFunction>;

let singleton: Handlers;

export default function getHandler(handlers: Handlers | any , props: any): Handlers {
  if (singleton || false) return singleton;

  /* eslint-disable-next-line no-console */
  console.log('[INFO] Registering RPC handlers...');
  const isFunction = handlers instanceof Function;
  if (!isFunction) {
    singleton = handlers;
    return singleton;
  }
  singleton = handlers(props);
  return singleton;
}
