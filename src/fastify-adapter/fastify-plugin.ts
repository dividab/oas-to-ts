import {
  HTTPMethods,
  RouteHandlerMethod,
  RouteOptions,
  FastifySchema,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { HandlerFn, HandlerResponse, ContentWithType, HandlerParameters, ParamSet } from "../type-mapper/type-mappers";
import { specOps, SpecOp, isRefObj } from "../shared";
import { Service } from "../type-mapper/service";

type UnknownHandlerFn = HandlerFn<
  unknown,
  HandlerParameters<ParamSet, ParamSet, ParamSet, ParamSet>,
  ContentWithType<string, unknown>,
  HandlerResponse<string, string, unknown>
>;

export const adoptHandlerFn: (
  handler: UnknownHandlerFn,
  contextDecoratorName: "myHandlerContext"
) => RouteHandlerMethod = (handler, contextDecoratorName) => async (request, reply) => {
  const ctx = ((request as unknown) as { [key: string]: unknown })[contextDecoratorName];
  const path = request.params as {};
  const query = request.query as {};
  const header = request.headers as {};
  const cookie = {};
  const parameters: HandlerParameters<ParamSet, ParamSet, ParamSet, ParamSet> = { path, query, header, cookie };
  const requestBody: ContentWithType<string, unknown> = request.body
    ? {
        contentType: request.headers["content-type"],
        content: request.body,
      }
    : {};
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const handlerResult = await handler(ctx, parameters, requestBody);
  reply.statusCode = Number.parseInt(handlerResult.httpCode, 10);
  if (handlerResult.contentType && handlerResult.content) {
    reply.type(handlerResult.contentType);
    return handlerResult.content;
  }
  return undefined;
};

export const createFastifyPlugin: (
  // spec: string | OpenAPI.Document,
  // handlers: HandlerFns,
  // createContext: () => {}
  service: Service<FastifyRequest, unknown>
) => FastifyPluginAsync = (service) => async (fastify) => {
  const { spec, handlers, createContext } = service;
  // Decoreate to say that we will have this property (the value is just the default value if it is not overwritten)
  // Decorating core objects with this API allows the underlying JavaScript engine to optimize handling of the server, request, and reply objects.
  // This is accomplished by defining the shape of all such object instances before they are instantiated and used.
  fastify.decorateRequest("myHandlerContext", undefined);
  // Add hook to update context for each request
  fastify.addHook("preHandler", async (req) => {
    const ctx = await createContext(req);
    ((req as unknown) as { [key: string]: unknown }).myHandlerContext = ctx;
  });

  // This method calls dereference internally, so the returned Swagger object is fully dereferenced. (resolves all $ref, even extrnal ones)
  const parsedSpec: OpenAPIV3.Document = (await SwaggerParser.validate(spec)) as OpenAPIV3.Document;
  if (!parsedSpec.openapi.startsWith("3")) {
    throw new Error(`Only OpenAPI 3 is supported, the provided spec document had ${parsedSpec.openapi}.`);
  }

  // For each operation in the spec, add a route and handler to fastify
  for (const path of Object.keys(parsedSpec.paths)) {
    for (const possibleOp of specOps) {
      const op: SpecOp = possibleOp as SpecOp;
      const pathObj = parsedSpec.paths[path];
      const foundOperation = pathObj[op];
      if (foundOperation) {
        const handlerFn: UnknownHandlerFn = handlers[path] && (handlers[path][possibleOp] as UnknownHandlerFn);
        if (!handlerFn) {
          throw new Error(`Missing handler function for path ${path}, operation ${op}`);
        }
        const routeConfig = oasOperationToFastifyRouteConfig(path, op, foundOperation, handlerFn);
        // console.log("foundOperation", foundOperation);
        // console.log("path, operation:", path, op);
        // console.log("config", JSON.stringify(routeConfig, undefined, 2));
        fastify.route(routeConfig);
      }
    }
  }
};

function oasOperationToFastifyRouteConfig(
  pathKey: string,
  opKey: SpecOp,
  opObj: OpenAPIV3.OperationObject,
  handlerFn: UnknownHandlerFn
): RouteOptions {
  return {
    url: makeFastifyUrl(pathKey),
    method: makeFastifyMethod(opKey),
    schema: makeFastifySchema(opObj),
    handler: adoptHandlerFn(handlerFn, "myHandlerContext"),
  };
}

function makeFastifySchema(opObj: OpenAPIV3.OperationObject): FastifySchema {
  const params: { [key: string]: OpenAPIV3.SchemaObject } = {};
  const querystring: { [key: string]: OpenAPIV3.SchemaObject } = {};
  const headers: { [key: string]: OpenAPIV3.SchemaObject } = {};
  for (const p of opObj.parameters || []) {
    if (isRefObj(p)) {
      throw new Error("Document should be fully dereferrenced but found $ref object.");
    }
    const schema = p.schema;
    if (schema) {
      if (isRefObj(schema)) {
        throw new Error("Document should be fully dereferrenced but found $ref object.");
      }
      switch (p.in) {
        case "path":
          params[p.name] = schema;
          break;
        case "query":
          querystring[p.name] = schema;
          break;
        case "header":
          headers[p.name] = schema;
          break;
        default:
          throw new Error(`Unknown parameter "in" value: ${p.in}`);
      }
    }
  }
  return { params, querystring, headers };
}

function makeFastifyMethod(specOp: SpecOp): HTTPMethods {
  return specOp.toUpperCase() as HTTPMethods;
}

function makeFastifyUrl(path: string): string {
  // fastify wants 'path/:param' instead of openapis 'path/{param}'
  return path.replace(/{(\w+)}/g, ":$1");
}
