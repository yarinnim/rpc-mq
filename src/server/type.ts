import type { Storage } from '../storage';

export type CallProps = {
  metadata: Storage;
};

export type ErrorResponse = {
  error: boolean,
  status: number,
  message: string,
  code: string,
};

export type Response = {
  error: false,
  status: 200,
}
