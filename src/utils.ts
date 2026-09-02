export function getValue(value: any, props: unknown) {
  const callback = (typeof value === 'function') 
    ? value(props)
    : value;
  
  const isPromise = callback instanceof Promise;
  if (!isPromise) return Promise.resolve(callback);
  return callback;
}
