type LogRequest = {
  id?: unknown;
  method?: string;
  url?: string;
  remoteAddress?: string;
  remotePort?: number;
};

export const httpLogOptions = {
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    remove: true,
  },
  serializers: {
    err: () => ({ type: 'Error', message: 'HTTP request failed' }),
    req: (req: LogRequest) => ({
      id: req.id,
      method: req.method,
      url: req.url?.split(/[?#]/, 1)[0],
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
  },
};
