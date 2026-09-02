# Remote Procedure Call (rpc)

In distributed computing, a remote procedure
call is when a computer program causes a
procedure to execute in a different address space,
which is coded as if it were a normal procedure call,
without the programmer explicitly coding the
details for the remote interaction.

## Configuration

To make the application/service communicate
with each other, we need to have RabbitMQ server
up and running, so the client side (requester)
and server need to connect to the RabbitMQ server.
OR, we just define the environment variables as
the following:

```bash
MQ_HOST=localhost
MQ_PORT=5672
MQ_USER=guest
MQ_PASSWORD=guest
```

## Init the Server

To start the, you need to importhe `server`  from `@core/rpc` and call it with by providing
what the server/service name, and functions that are exposed the the rpc client.

The following example will create a new rpc server named `rpc-auth` that exposes 2 functions (`login` and `logout`).

```ts
import { server } from '@core/rpc'
import { login, logout } from './login';

const rpcServerName = 'rpc-auth';
server(rpcServerName, { login, logout });
```

## Init the Client

rpc Client is the caller to call the server function
and returns response value as `Promise`. The following
example will connect to Message Queue server 
and ready to call the `login` function of `rpc-auth`.

```ts
import { client } from '@core/rpc';

const rpcServerName = 'rpc-auth';
const authRpc = client(rpcServerName);
authRpc('login')
  .then((result: any) => console.log({ result }))
  .catch((error: any) => console.log({ error }));
```
