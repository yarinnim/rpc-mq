import type { Storage } from '../storage';
import type { CallProps } from './type';

export type Middleware = (_props: CallProps) => any | void;

type MiddlewaresExecutor = {
  procedure: string,
  params: any,
  metadata: Storage,
};

function executeHell(callbacks: Middleware[], props: MiddlewaresExecutor) {
  if (callbacks.length === 0) return {};
  const [callback, ...rest] = callbacks;
  const isPromise = callback instanceof Promise;
  const handler = isPromise
    ? callback(props)
    : Promise.resolve(callback(props));

  return handler
    .then((result: unknown = {}) => {
      if (rest.length === 0) return result;
      return executeHell(rest, props);
    });
}

function initializerMiddleware() {
  return Promise.resolve(true);
}

export default function executeMiddlewares(
  middlewares: Middleware[] = [],
  props: MiddlewaresExecutor,
) {
  const { procedure, params, metadata } = props;
  if (middlewares.length == 0) return Promise.resolve({});
  return executeHell([initializerMiddleware, ...middlewares], { procedure, params, metadata });
}
