/* esltin-disable console.log */

const encode = (params: any): string => {
  const content = JSON.stringify(params || []);
  return Buffer.from(content).toString('base64');
};

function writeLog(props: any) {
  return new Promise((resolve) => {
    const { procedure, metadata, result } = props;
    const { client = {}, correlationId } = metadata.get();
    const info = [
      '[REQUEST-LOG]',
      `[${((result?.error || false) ? 'FAILED' : 'SUCCESS')}]`,
      procedure,
      `client/${client.name || 'N/A'}`,
      `correlation/${correlationId}`,
    ];
    /* eslint-disable-next-line no-console */
    console.log(info.join(' '));
    resolve(true);
  });
}

export default function loggerCallback(logger: any, props: any) {
  const { result, params, procedure, metadata } = props;

  writeLog({ procedure, metadata, result });

  const hasLogger = logger || false;
  if (!hasLogger) return false;

  const { correlationId, client = {} } = metadata.get();
  const encodedParams = encode(params);
  const logInfo = {
    error: result?.error || false,
    procedure,
    params: encodedParams,
    correlation: correlationId,
    client: client.name || 'N/A',
  };
  logger().log(logInfo, { severity: 'request-log' });
  return true;
}
