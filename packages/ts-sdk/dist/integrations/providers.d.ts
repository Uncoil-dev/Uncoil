import { type IntegrationOptions } from "./observation";
export type { IntegrationOptions } from "./observation";
export declare const isInsideWrapped: () => boolean;
/** Record one provider call. `call` receives the (possibly adjusted) params and returns the provider's result. */
export declare function traced(provider: string, endpoint: string, call: (params: any) => any, rawParams: any, options: IntegrationOptions, markWrapped?: boolean): any;
export declare function wrapOpenAI<T extends object>(client: T, options?: IntegrationOptions): T;
export declare function wrapAnthropic<T extends object>(client: T, options?: IntegrationOptions): T;
