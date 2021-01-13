/**
 * This type describes a more general type of the generated type for a OpenAPI spec document
 */
export type RootSpec = {
  readonly paths: PathsSpec;
  readonly components: unknown;
};

/**
 * Describes how the path part looks in the spec
 */
export type PathsSpec = {
  readonly [path: string]: OperationsSpec;
};

/**
 * Describes how the operations part looks in the spec
 */
export type OperationsSpec = {
  readonly [operation: string]: OperationSpec;
};

/**
 * Describes how one operation looks in the spec
 */
export type OperationSpec = {
  readonly parameters: ParametersSpec;
  readonly requestBody?: RequestBodySpec;
  readonly responses: ResponsesSpec;
};

export type ParametersSpec = {
  readonly path: ParamSetSpec;
  readonly query: ParamSetSpec;
  readonly header: ParamSetSpec;
  readonly cookie: ParamSetSpec;
};

export type ParamSetSpec = { readonly [key: string]: unknown };

/**
 * Describes how one operation looks in the spec
 */
export type RequestBodySpec = { readonly content: ContentsSpec };

/**
 * Describes how the responses part looks for an operation in the spec
 */
export type ResponsesSpec = {
  readonly [code: string]: { readonly content?: ContentsSpec };
};

/**
 * Describes how the content part looks for a response in the spec
 */
export type ContentsSpec = {
  readonly [contentType: string]: unknown;
};
