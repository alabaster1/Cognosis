declare module '@polkadot/api' {
  export class WsProvider {
    constructor(url: string);
  }

  export class ApiPromise {
    static create(options: { provider: WsProvider }): Promise<ApiPromise>;
    isConnected: boolean;
    isReady: Promise<ApiPromise>;
    query: {
      system: {
        account(address: string): Promise<unknown>;
      };
      assets?: {
        account: {
          entries(address: string): Promise<[{ args: [{ toString(): string }] }, { toJSON(): unknown }][]>;
        };
      };
    };
    rpc: {
      author: {
        submitExtrinsic(tx: string): Promise<{ toString(): string }>;
      };
      chain: {
        getBlock(hash?: string): Promise<{
          block: {
            header: {
              number: { toNumber(): number };
            };
          };
        } | null>;
      };
    };
    disconnect(): Promise<void>;
  }
}

declare module '@polkadot/api/types' {
  export interface SubmittableExtrinsic<T extends string = 'promise'> {
    send(): Promise<{ toString(): string }>;
    toHex(): string;
  }
}
