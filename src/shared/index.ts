import { OpenAPIV3 } from "openapi-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRefObj(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj.$ref !== undefined;
}

export type SpecOp = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";
export const specOps: readonly SpecOp[] = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
