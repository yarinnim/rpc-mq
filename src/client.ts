/* eslint-disable no-console */
import { randomUUID } from 'crypto';
import type { ChannelModel, Channel, RPCClient } from './types';

type Client = {
  name: string,
  uuid?: string,
  secretKey?: string,
};

type MetaData = {
  client: Client,
} & Record<string, any>;

const decodeResult = (content: any) => {
  const { result } = JSON.parse(content);
  return result;
};

type HeadersResult = Promise<Record<string, string>>;

type HeadersProps = {
  metadata?: MetaData,
  service: string,
  procedure: string,
  params: any[],
};

const getMetadata = (props: HeadersProps): HeadersResult | any => {
  const { metadata, ...restProps } = props;
  const withMetadata = metadata || false;
  try {
    if (!withMetadata) return Promise.resolve({});
    const isFun = typeof metadata === 'function';
    const result: MetaData = isFun
      ? (metadata as CallableFunction)(restProps)
      : metadata;

    const isPromise = result instanceof Promise;
    if (isPromise) return result.then((pResult: any) => pResult);
    return Promise.resolve(result);
  } catch (error: any) {
    const { message } = error;
    return Promise.reject({ ...error, message });
  }
};

const closeChannel = (channel: ChannelModel | any) => {
  const channelInitialized = channel || false;
  if (!channelInitialized) return false;
  channel.close();
  return true;
};

const waitForResponse = (props: any) => {
  const { channel, resolve, reject, queue, service, correlationId } = props;
  let hasReceived = false;

  channel.consume(queue.queue, (message: any) => {
    if (message.properties.correlationId === correlationId) {
      hasReceived = true;
      const result = decodeResult(message.content.toString());
      try {
        if (!(result || false)) return resolve(result);
        const { error = false } = result;
        if (error) return reject(result);
        return resolve(result);
      } catch {
        return resolve(result);
      } finally {
        closeChannel(channel);
      }
    }
  }, { noAck: true });

  setTimeout(() => {
    if (!hasReceived) {
      closeChannel(channel);
      reject(new Error(`- [rpc-client] Request to ${service} timeout`));
    }
  }, 1000 * 5);
};

const consume = (props: any, procedure: string, ...params: any[]) => {
  const { channel, queue, service, metadata, metadataInterceptor } = props;
  const correlationId = randomUUID();

  return new Promise((resolve, reject) => {
    const metadataProps = { metadata, service, procedure, params };
    getMetadata(metadataProps)
      .then((cleanMetadata: any) => {
        const intercepted = metadataInterceptor || false;
        if (!intercepted) return cleanMetadata;
        return metadataInterceptor(cleanMetadata);
      })
      .then((metadataData: any) => {

        waitForResponse({
          channel, resolve, reject,
          queue, service, correlationId,
        });

        const metadata = { ...metadataData, correlationId };

        const data = JSON.stringify({ procedure, params, metadata });
        channel.sendToQueue(service, Buffer.from(data), {
          correlationId,
          replyTo: queue.queue,
        });
      })
      .catch((error: any) => {
        closeChannel(channel);
        const { message } = error;
        reject({ message, code: 'UNKNOWN_ERROR', status: 400, ...error });
      });
  });
};

type InitRequest = {
  connection: ChannelModel,
  service: string,
  metadata?: MetaData,
  metadataInterceptor?: any,
};

const initRequest = (props: InitRequest, procedure: string, ...params: any[]) => {
  const { connection, service, metadata, metadataInterceptor } = props;
  return connection.createChannel()
    .then((channel: Channel) => {
      console.log('[RPC Client] Channel is created.');
      return channel
        .assertQueue('', {
          exclusive: true,
          autoDelete: true,
        })
        .then((queue: any) => {
          const consumeProps = { channel, service, queue, metadata, metadataInterceptor };
          return consume(consumeProps, procedure, ...params);
        });
    });
};

type RPCClientProps = {
  connection: ChannelModel,
  metadata?: MetaData,
  metadataInterceptor?: CallableFunction,
};

/**
 * Initialize the rpc client and ready to be called to call
 * server procedure
 * @param {string} service - rpc server name to call to
 * @param {MessageQueue} props - The Message Queue connection configuration
 * @return {makeRequest} callback - The make request callback
 */

export default function initRpcClient(service: string, props: RPCClientProps): RPCClient {
  const { connection, metadata, metadataInterceptor } = props;
  return (procedure: string, ...params: any[]) => {
    const reqProps = { connection, service, metadata, metadataInterceptor };
    return initRequest(reqProps, procedure, ...params);
  };
}
