# oas-to-ts

[![npm version][version-image]][version-url]
[![travis build][travis-image]][travis-url]
[![Coverage Status][codecov-image]][codecov-url]
[![code style: prettier][prettier-image]][prettier-url]
[![types][types-image]][types-url]
[![MIT license][license-image]][license-url]

Convert an OpenAPI specifcation document to typescript types

## Introduction

Supports a design-first workflow that only generates types (no runnable code):

1. Edit the openapi.yaml document manually.
2. Genereate types automatically (but no runnable code).
3. Write code manually to implement the types.
4. When changing the API restart at item 1.

The generated type is a full description of the OpenAPI specification document. The structure is as close as possible to the orinal document. Any meta-data is removed and JSON schemas are replaced with typescript types.

From the generated type we can map other types. For example it is possible to map typed handler functions for the server and typed request functions for the client.

## How to install

```
yarn add -D oas-to-ts
```

## How to use

```
node ./packages/server-infra/oas-to-ts/lib/cli.js -i ./packages/server/external-api/src/schema.yml -o ./packages/server/external-api/src/schema.ts
```

## Example

For this openapi.yam:

```yaml
openapi: 3.0.0
info:
  title: Unit Configuration API
  description: Allows to create, read, update, delete, and search of unit configurations.
  version: 0.1.0

paths:
  /units:
    get:
      summary: Returns a list of units.
      responses:
        "200":
          description: A JSON array of unit names
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UnitList"
    post:
      summary: Creates a new unit.
      requestBody:
        $ref: "#/components/requestBodies/UnitBody"
      responses:
        "201":
          description: Created

  /units/{unitId}:
    get:
      summary: Get a unit by ID
      parameters:
        - $ref: "#/components/parameters/unitId"
        - in: query
          name: "unitId"
          schema:
            type: integer
      responses:
        "200":
          description: A JSON array of unit names
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Unit"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

components:
  schemas:
    UnitList:
      type: array
      items:
        $ref: "#/components/schemas/Unit"
    Unit:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
    Error:
      type: object
      properties:
        code:
          type: integer
        description:
          type: string
  parameters:
    unitId:
      in: path
      name: unitId
      schema:
        type: integer
      required: true
      description: ID of the unit to get
  requestBodies:
    UnitBody:
      description: Creates a new unit.
      required: true
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Unit"
```

This type will be genereated:

```ts
/**
 * This type represents the whole OpenAPI spec document
 * We can pick types from there to build handlers, request etc.
 */
export interface Spec {
  readonly paths: {
    readonly "/units": {
      readonly get: {
        readonly parameters: {};
        readonly responses: {
          readonly "200": {
            readonly content: {
              readonly "application/json": Spec["components"]["schemas"]["UnitList"];
            };
          };
        };
      };
      readonly post: {
        readonly parameters: {};
        readonly requestBody: Spec["components"]["requestBodies"]["UnitBody"];
        readonly responses: {
          readonly "201": {};
        };
      };
    };
    readonly "/units/{unitId}": {
      readonly get: {
        readonly parameters: {
          readonly path: {
            readonly unitId: Spec["components"]["parameters"]["path"]["unitId"];
          };
        };
        readonly responses: {
          readonly "404": {
            readonly content: {
              readonly "application/json": Spec["components"]["schemas"]["Error"];
            };
          };
          readonly "200": {
            readonly content: {
              readonly "application/json": Spec["components"]["schemas"]["Unit"];
              readonly "text/plain": string; // for testing
            };
          };
        };
      };
    };
  };
  readonly components: {
    readonly schemas: {
      readonly UnitList: readonly Spec["components"]["schemas"]["Unit"][];
      readonly Unit: { readonly id?: number; readonly name?: string };
      readonly Error: { readonly code?: number; readonly description?: string };
    };
    readonly parameters: {
      readonly path: {
        readonly unitId: number;
      };
    };
    readonly requestBodies: {
      readonly UnitBody: {
        readonly content: {
          readonly "application/json": Spec["components"]["schemas"]["Unit"];
        };
      };
    };
  };
}
```

Then we can use the type mappers to create handler functions:

```ts
// The Context is whatever you want, similar to Context in graphql resolvers
export type HandlerFns<Context> = HandlerFnsFromRootSpec<Spec, Context>;

export const pathOperationHandlers: HandlerFns<Context> = {
  "/units": {
    get: async (ctx, parameters) => {
      console.log(ctx, parameters);
      const theUnits = ctx.db.getUnits();
      return {
        httpCode: "200",
        contentType: "application/json",
        content: theUnits,
      };
    },
    post: async (_ctx, _parameters) => {
      // console.log(ctx, parameters);
      return {
        httpCode: "201",
      };
    },
  },
  "/units/{unitId}": {
    get: async (ctx, parameters) => {
      console.log(ctx, parameters);
      const theUnits = ctx.db.getUnits();
      const foundUnit = theUnits.find((u) => u.id === parameters.path.unitId);
      if (foundUnit) {
        return {
          httpCode: "200",
          contentType: "application/json",
          content: foundUnit,
        };
      } else {
        return {
          httpCode: "404",
          contentType: "application/json",
          content: {},
        };
      }
    },
  },
};
```

After mapping the types can be hard to visualize in vscode. They look something like this:

```ts
export type PathOperationFns<Context> = {
  readonly "/units": {
    readonly get: (
      ctx: Context,
      parameters: Spec["paths"]["/units"]["get"]["parameters"]
    ) => Promise<
      HandlerResponseFromSpec<Spec["paths"]["/units"]["get"]["responses"]>
    >;
    readonly post: (
      ctx: Context,
      parameters: Spec["paths"]["/units"]["post"]["parameters"],
      requestBody: Spec["paths"]["/units"]["post"]["requestBody"]
    ) => Promise<
      HandlerResponseFromSpec<Spec["paths"]["/units"]["post"]["responses"]>
    >;
  };
  readonly "/units/{unitId}": {
    readonly get: (
      ctx: Context,
      parameters: Spec["paths"]["/units/{unitId}"]["get"]["parameters"]
    ) => Promise<
      HandlerResponseFromSpec<
        Spec["paths"]["/units/{unitId}"]["get"]["responses"]
      >
    >;
  };
};
```

## Using with fastify

There is a built-in fastify adapter that can be used with the generated types.

## Future work

- Perhaps we should generate handler funciton types explicitly instead of mapping them. Mapping is technically better since the generated type can be simple and support many types of mapping. But generating explicit types makes it easier to read/visualize the types.

## Notes about design-first approach vs code-first

https://apisyouwonthate.com/blog/theres-no-reason-to-write-openapi-by-hand/
https://apisyouwonthate.com/blog/api-design-first-vs-code-first

## How to publish

```
yarn version --patch
yarn version --minor
yarn version --major
```

[version-image]: https://img.shields.io/npm/v/oas-to-ts.svg?style=flat
[version-url]: https://www.npmjs.com/package/oas-to-ts
[travis-image]: https://travis-ci.com/dividab/oas-to-ts.svg?branch=master&style=flat
[travis-url]: https://travis-ci.com/dividab/oas-to-ts
[codecov-image]: https://codecov.io/gh/dividab/oas-to-ts/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/dividab/oas-to-ts
[prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat
[prettier-url]: https://github.com/prettier/prettier
[types-image]: https://img.shields.io/npm/types/scrub-js.svg
[types-url]: https://www.typescriptlang.org/
[license-image]: https://img.shields.io/github/license/dividab/oas-to-ts.svg?style=flat
[license-url]: https://opensource.org/licenses/MIT
