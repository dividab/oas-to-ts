import { HandlerFns } from "./type-mappers";

export type Service<RequestType, ContextType> = {
  readonly spec: string;
  readonly handlers: HandlerFns;
  readonly createContext: (request: RequestType) => Promise<ContextType>;
};
