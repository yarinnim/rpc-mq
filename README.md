# RPC Package

A lightweight and efficient Remote Procedure Call (RPC) package built on top of RabbitMQ, providing a simple way to implement distributed function calls across your microservices architecture.

## Features

- Simple client-server RPC implementation
- Built on RabbitMQ for reliable message delivery
- Automatic correlation ID handling
- Timeout handling
- Error handling and propagation
- TypeScript support
- Promise-based API

## Installation

```bash
$> npm install rpc-mq
```

## Usage

### Server Setup

```typescript
import { server } from 'rpc-mq';
import amqp from 'amqplib';

// Define your RPC handlers
const handlers = {
  add: (a: number, b: number) => a + b,
  getUser: async (id: string) => {
    // Simulate database call
    return { id, name: 'John Doe' };
  },
  processData: async (data: any) => {
    // Complex processing
    return { processed: true, data };
  }
};

// Create RabbitMQ connection
const connection = await amqp.connect({
  hostname: process.env.RABBITMQ_HOST,
  port: process.env.RABBITMQ_PORT,
  username: process.env.RABBITMQ_USER,
  password: process.env.RABBITMQ_PASS
});

// Start RPC server
await server('user-service', handlers, { connection });
```

### Client Setup

```typescript
import { client } from 'rpc-mq';
import amqp from 'amqplib';

// Create RabbitMQ connection
const connection = await amqp.connect({
  hostname: process.env.RABBITMQ_HOST,
  port: process.env.RABBITMQ_PORT,
  username: process.env.RABBITMQ_USER,
  password: process.env.RABBITMQ_PASS
});

// Initialize RPC client
const rpcClient = client('user-service', { connection });

// Call remote procedures
try {
  // Simple synchronous call
  const sum = await rpcClient('add', 5, 3); // Returns 8

  // Async call
  const user = await rpcClient('getUser', '123');
  console.log(user); // { id: '123', name: 'John Doe' }

  // Complex data processing
  const result = await rpcClient('processData', { 
    items: [1, 2, 3],
    options: { filter: true }
  });
} catch (error) {
  console.error('RPC call failed:', error);
}
```

### Error Handling

```typescript
// Server-side error handling
const handlers = {
  divide: (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
};

// Client-side error handling
try {
  const result = await rpcClient('divide', 10, 0);
} catch (error) {
  console.error('Error:', error.message); // "Division by zero"
}
```

## API Reference

### Server

#### `server(service: string, handlers: Record<string, Function>, config: { connection: ChannelModel }): Promise<void>`

Starts an RPC server that listens for incoming requests.

#### Parameters

- `service`: Name of the service (used as queue name)
- `handlers`: Object containing procedure handlers
- `config`: Configuration object
  - `connection`: RabbitMQ connection instance

### Client

#### `client(service: string, config: { connection: ChannelModel }): (procedure: string, ...params: any[]) => Promise<any>`

Creates an RPC client for calling remote procedures.

#### Parameters

- `service`: Name of the service to connect to
- `config`: Configuration object
  - `connection`: RabbitMQ connection instance

#### Returns

A function that takes:
- `procedure`: Name of the procedure to call
- `...params`: Arguments to pass to the procedure

## Type Definitions

```typescript
type MessageQueue = {
  host: string;
  port: string | number;
  user: string;
  password: string;
  retryInterval?: number;
};

type ChannelModel = {
  createChannel(): Promise<Channel>;
};

type Channel = {
  assertQueue(name: string, options?: any): Promise<any>;
  consume(queue: string, callback: (message: any) => void, options?: any): Promise<any>;
  sendToQueue(queue: string, content: Buffer, options?: any): boolean;
  ack(message: any): void;
  close(): Promise<void>;
  prefetch(count: number): void;
};
```

## Configuration

The package can be configured using environment variables:

```env
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest
```

Or by providing the configuration directly:

```typescript
const config = {
  host: 'localhost',
  port: 5672,
  user: 'guest',
  password: 'guest',
  retryInterval: 5000 // Optional: retry connection interval in ms
};
```

## Best Practices

1. **Error Handling**
   - Always wrap RPC calls in try-catch blocks
   - Use meaningful error messages
   - Handle timeouts appropriately

2. **Connection Management**
   - Reuse connections when possible
   - Implement connection retry logic
   - Handle connection failures gracefully

3. **Type Safety**
   - Define interfaces for your RPC procedures
   - Use TypeScript for better type checking
   - Validate input parameters

4. **Performance**
   - Keep procedures lightweight
   - Use async/await for long-running operations
   - Implement proper timeout values

## License

MIT
