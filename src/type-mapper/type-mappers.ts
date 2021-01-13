/**
 * This file has helper types that map from the specfication type to handler function types.
 */

import {
  ResponsesSpec,
  ContentsSpec,
  RootSpec,
  PathsSpec,
  OperationsSpec,
  OperationSpec,
  RequestBodySpec,
} from "./spec-types";

/**
 * From the root of the spec, create a type for an object with handler functions
 */
export type HandlerFnsFromRootSpec<T extends RootSpec, Context> = HandlerFnsFromPathsSpec<T["paths"], Context>;

/**
 * From the paths of the spec, create a type for an object with handler functions for each path and operation
 */
export type HandlerFnsFromPathsSpec<T extends PathsSpec, Context> = {
  readonly [K in keyof T]: HandlerFnsFromOperationsSpec<T[K], Context>;
};

/**
 * From the operations spec, create function types
 */
export type HandlerFnsFromOperationsSpec<T extends OperationsSpec, Context> = {
  readonly [K in keyof T]: HandlerFnFromOperationSpec<T[K], Context>;
};

/**
 * Create a handler function from the operation spec.
 */
export type HandlerFnFromOperationSpec<T extends OperationSpec, Context> = HandlerFn<
  Context,
  T["parameters"],
  T["requestBody"] extends RequestBodySpec ? HandlerContentFromSpec<T["requestBody"]["content"]> : {},
  HandlerResponseFromSpec<T["responses"]>
>;

/**
 * From the specification, create a union type of possible response types
 */
export type HandlerResponseFromSpec<T extends ResponsesSpec> = {
  readonly [K in keyof T]: { readonly httpCode: K } & (T[K]["content"] extends {}
    ? HandlerContentFromSpec<T[K]["content"]>
    : {});
}[keyof T];

/**
 * From the specification, create a union type of possible content types
 */
export type HandlerContentFromSpec<T extends ContentsSpec | undefined> = {
  readonly [K in keyof T]: { readonly contentType: K; readonly content: T[K] };
}[keyof T];

/**
 * A general description of a handler function
 */
export type HandlerFn<
  Context,
  Parameters extends HandlerParameters<ParamSet, ParamSet, ParamSet, ParamSet>,
  RequestBody extends ContentWithType<unknown, unknown>,
  Response extends HandlerResponse<unknown, unknown, unknown>
> = (ctx: Context, parameters: Parameters, requestBody: RequestBody) => Promise<Response>;

/**
 * A general description of a handler function response
 */
export type HandlerResponse<HttpCode, ContentType, Content> = {
  readonly httpCode: HttpCode;
} & ContentWithType<ContentType, Content>;

export type ContentWithType<ContentType, Content> = {
  // In the generated types, either both contentType and content is required, or both are never.
  // We should not end up with having only one of them specified.
  readonly contentType?: ContentType;
  readonly content?: Content;
};

export type ParamSet = { readonly [key: string]: unknown };

export type HandlerParameters<
  PathParams extends ParamSet,
  QueryParams extends ParamSet,
  HeaderParams extends ParamSet,
  CookieParams extends ParamSet
> = {
  readonly path: PathParams;
  readonly query: QueryParams;
  readonly header: HeaderParams;
  readonly cookie: CookieParams;
};

/**
 * A general description of a handler object with functions for each path/operation
 */
export type HandlerFns = {
  readonly [path: string]: {
    readonly [op: string]: HandlerFn<
      unknown,
      HandlerParameters<ParamSet, ParamSet, ParamSet, ParamSet>,
      ContentWithType<unknown, unknown>,
      HandlerResponse<unknown, unknown, unknown>
    >;
  };
};

// // --- TESTING
// export type Olle = HandlerResponseFromSpec<Spec["paths"]["/units/{unitId}"]["get"]["responses"]>;

// export type OlleExpanded = ExpandRecursively<Olle>;

// export type Olle2 = HandlerResponseFromSpec<Spec["paths"]["/units"]["post"]["responses"]>;

// export type Olle2Expanded = ExpandRecursively<Olle2>;

// // https://stackoverflow.com/questions/57683303/how-can-i-see-the-full-expanded-contract-of-a-typescript-type
// // https://stackoverflow.com/questions/53113031/how-to-see-a-fully-expanded-typescript-type-without-n-more-and/53131824#53131824
// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// type ExpandRecursively<T> = T extends object
//   ? T extends infer O
//     ? { [K in keyof O]: ExpandRecursively<O[K]> }
//     : never
//   : T;

// export type Nisse1 = HandlerFnsFromPathsSpec<Spec["paths"], {}>;
// export type Nisse1Expanded = Expand<Nisse1>;

// export type Nisse2 = HandlerFnFromOperationSpec<Spec["paths"]["/units/{unitId}"]["get"], {}>;
// export type Nisse2Expanded = ExpandRecursively<Nisse2>;

// export type Nisse3 = HandlerFnFromOperationSpec<Spec["paths"]["/units"]["post"], {}>;

// export type Nisse4 = HandlerFnsFromRootSpec<Spec, {}>;

// --- OLD STUFF

// /**
//  * Can these be used both to handle requests on the server, and make request on the client???
//  */
// // export type PathOperationFns3<Context> = {
// //   readonly "/units": {
// //     readonly get: (
// //       ctx: Context,
// //       parameters: Spec["paths"]["/units"]["get"]["parameters"]
// //     ) => Promise<HandlerResponseFromSpec<Spec["paths"]["/units"]["get"]["responses"]>>;
// //     readonly post: (
// //       ctx: Context,
// //       parameters: Spec["paths"]["/units"]["post"]["parameters"],
// //       requestBody: Spec["paths"]["/units"]["post"]["requestBody"]
// //     ) => Promise<HandlerResponseFromSpec<Spec["paths"]["/units"]["post"]["responses"]>>;
// //   };
// //   readonly "/units/{unitId}": {
// //     readonly get: (
// //       ctx: Context,
// //       parameters: Spec["paths"]["/units/{unitId}"]["get"]["parameters"]
// //     ) => Promise<HandlerResponseFromSpec<Spec["paths"]["/units/{unitId}"]["get"]["responses"]>>;
// //   };
// // };

// export type HandlerFns<Context> = HandlerFnsFromRootSpec<Spec, Context>;
