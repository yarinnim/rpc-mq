/* eslint-disable no-unused-vars */
export type MessageQueue = {
  host: string;
  port: string | number;
  user: string;
  password: string;
  retryInterval?: number;
};

export type RPCClient = (procedureName: string, ...params: any[]) => Promise<any>;

export {
  ChannelModel,
  Channel,
} from 'amqplib';
