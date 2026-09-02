import type { ChannelModel } from 'amqplib';
import { type Channel } from '../types';
import executeMiddlewares, { type Middleware } from './middleware';
import initStorage from '../storage';
import log from './logger';
import getHandlers from './handler';
import type { CallProps, ErrorResponse } from './type';

let loggerPrv: any;

/**
 * Tries to execute the requested function
 * and returns the value back to the client.
 * @param {callback} handler - Callback function of the called function
 * @param {any[]} params - Function parameters
 * @return any | error
 */
const execute = (handler: any, params: any[]): any => {
  try {
    const result = handler(...params);
    const isPromise = result instanceof Promise;
    if (isPromise) return result;
    return Promise.resolve(result);
  } catch (error: any) { const { message } = error;
    return Promise.resolve({ ...error, error: true, message });
  }
};

type ResponseProps = { channel: any,
  properties: any,
  metadata: any,
  params: any,
  procedure: string,
};

const sendResponse = (props: ResponseProps, result: any) => {
  const { channel, properties, metadata, params, procedure } = props;
  const loggerProps = { result, metadata, params, procedure };
  log(loggerPrv, loggerProps);
  channel.sendToQueue(
    properties.replyTo,
    Buffer.from(JSON.stringify({ result })),
    { correlationId: properties.correlationId },
  );
};

const sendErrorResponse = (
  props: ResponseProps,
  errorRes: ErrorResponse,
)  => sendResponse(props, errorRes);

type ConsumeProps = {
  channel: Channel,
  queueName: string,
  handlers: any,
  middlewares?: any,
};

/**
 * Starts consuming the message queue. This just
 * consumes on specific queueue (queueName)
 * @param {ConsumeProps} props - Consuming properties
 * @return Proise
 */
export const startConsuming = (props: ConsumeProps) => {
  const { channel, queueName, handlers: pHandlers, middlewares = [] } = props;

  return channel.consume(queueName, (message: any) => {
    const { procedure, params, metadata: resHeaders } = JSON.parse(message.content.toString());
    const { properties } = message;
    const metadata = initStorage(resHeaders);
    const handlers = getHandlers(pHandlers, { metadata });

    const handler = handlers[procedure] || false;
    const resProps = { channel, metadata, params, procedure, properties };

    if (!handler) {
      const notFoundMsg = {
        error: true,
        status: 404,
        message: `Function/Procedure [${procedure}] does not exist`,
        code: 'PROCEDURE_NOT_FOUND',
      };
      sendErrorResponse(resProps, notFoundMsg);
      channel.ack(message);
      return true;
    }

    return executeMiddlewares(middlewares, { procedure, params, metadata })
      .then(() => execute(handler, params))
      .then((promiseResult: any) => sendResponse(resProps, promiseResult))
      .catch((error: any)  => {
        const errorMsg = {
          error: true,
          message: error.message,
          status: error.status || 400,
          code: error.code || 'UNKNOWN_ERROR',
        };
        return sendErrorResponse(resProps, errorMsg);
      })
      .finally(() => {
        channel.ack(message);
      });
  });
};

type RPCServer = {
  middlewares?: Middleware[],
  connection: ChannelModel,
  logger?: any,
};

type Handler = Record<string, CallableFunction>;
type HandlerWrapper = (_props: CallProps) => Handler;

/**
 * Starts the Consumer of RabbitMQ
 * @param {string} service - String to rpc server name
 * @param {Record<string, unknown>} exposedServices - The exposed functions to be called
 * @param {MessageQueue} config - The message queue connection configuration
 */
export default function startRpcServer(
  service: string,
  exposedServices: Handler | HandlerWrapper,
  props: RPCServer,
) {
  const { connection, middlewares, logger } = props;
  loggerPrv = logger || false;
  return connection.createChannel()
    .then((channel: Channel) => {
      channel.assertQueue(service, { durable: false });
      channel.prefetch(1);
      return startConsuming({
        channel,
        middlewares,
        queueName: service,
        handlers: exposedServices,
      });
    });
}
