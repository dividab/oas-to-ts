import fs from "fs";
import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";
import { specOps, isRefObj } from "../shared";
import { schemaObjectToTypescriptType, transformRef } from "./schema-to-ts";

export async function documentToTypefile(inputFile: string, outputFile: string): Promise<void> {
  const content = await documentToType(inputFile);
  fs.writeFileSync(outputFile, content);
}

/**
 * Generate a type that is bascially one-to-one with an OpenAPI specification document
 */
async function documentToType(specDocument: string): Promise<string> {
  const specUnbundled = (await SwaggerParser.parse(specDocument)) as OpenAPIV3.Document;
  if (!specUnbundled.openapi.startsWith("3")) {
    throw new Error(`Only OpenAPI 3 is supported, the provided spec document had ${specUnbundled.openapi}.`);
  }
  // Make all $ref internal (no external document)
  const spec = (await SwaggerParser.bundle(specUnbundled)) as OpenAPIV3.Document;

  let content = "";

  content = addLine(content, "/* eslint-disable */", 0);
  content = addLine(content, "export interface Spec {", 0);
  // paths
  content = addLine(content, "readonly paths: {", 1);
  for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
    content = addLine(content, `readonly "${pathKey}": {`, 2);
    for (const opKey of specOps) {
      const foundOperation = pathItem[opKey];
      if (foundOperation !== undefined) {
        content = addLine(content, `readonly ${opKey}: {`, 3);
        // parameters
        content = addLine(content, "readonly parameters: {", 4);
        let contentParamsPath = "";
        let contentParamsQuery = "";
        let contentParamsHeader = "";
        let contentParamsCookie = "";
        if (foundOperation.parameters) {
          for (const paramOrRef of foundOperation.parameters) {
            const p = isRefObj(paramOrRef) ? dereferenceParam(spec, paramOrRef) : paramOrRef;
            const paramType = p.schema ? schemaObjectToTypescriptType(p.schema) : "UNKNOWN!!!";
            switch (p.in) {
              case "path":
                contentParamsPath = addLine(contentParamsPath, `readonly ${p.name}: ${paramType}`, 6);
                break;
              case "query":
                contentParamsQuery = addLine(contentParamsQuery, `readonly ${p.name}: ${paramType}`, 6);
                break;
              case "header":
                contentParamsHeader = addLine(contentParamsHeader, `readonly ${p.name}: ${paramType}`, 6);
                break;
              case "cookie":
                contentParamsCookie = addLine(contentParamsCookie, `readonly ${p.name}: ${paramType}`, 6);
                break;
              default:
                throw new Error(`Unkown parameter.in ${p.in}`);
            }
          }
        }
        content = addLine(content, "readonly path: {", 5);
        content = add(content, contentParamsPath, 0);
        content = addLine(content, "};", 5);
        content = addLine(content, "readonly query: {", 5);
        content = add(content, contentParamsQuery, 0);
        content = addLine(content, "};", 5);
        content = addLine(content, "readonly header: {", 5);
        content = add(content, contentParamsHeader, 0);
        content = addLine(content, "};", 5);
        content = addLine(content, "readonly cookie: {", 5);
        content = add(content, contentParamsCookie, 0);
        content = addLine(content, "};", 5);
        content = addLine(content, "}", 4);
        // requestbody
        if (foundOperation.requestBody) {
          const requestBody = foundOperation.requestBody;
          if (isRefObj(requestBody)) {
            content = addLine(content, `readonly "requestBody": ${transformRef(requestBody.$ref)}`, 5);
          } else if (requestBody.content !== undefined) {
            content = addLine(content, `readonly "requestBody": {`, 5);
            content = add(content, contentNodeToContentProperty(requestBody.content, 6), 6);
            content = addLine(content, "}", 5);
          }
        }
        // responses
        if (foundOperation.responses) {
          content = addLine(content, "readonly responses: {", 4);
          for (const [responseCode, responseItem] of Object.entries(foundOperation.responses)) {
            if (isRefObj(responseItem)) {
              content = addLine(content, `readonly "${responseCode}": ${transformRef(responseItem.$ref)}`, 5);
            } else if (responseItem.content !== undefined) {
              content = addLine(content, `readonly "${responseCode}": {`, 5);
              content += contentNodeToContentProperty(responseItem.content, 6);
              content = addLine(content, "}", 5);
            }
          }
          content = addLine(content, "}", 4);
        }
        content = addLine(content, "}", 3);
      }
    }
    content = addLine(content, "}", 2);
  }
  content = addLine(content, "}", 1);
  // components
  if (spec.components !== undefined) {
    content = addLine(content, "readonly components: {", 1);
    // components/schemas
    if (spec.components.schemas !== undefined) {
      content = addLine(content, "readonly schemas: {", 2);
      for (const [schemaKey, schemaItem] of Object.entries(spec.components.schemas)) {
        const schemaType = getSchemaType(schemaItem);
        content = addLine(content, `readonly ${schemaKey}: ${schemaType}`, 3);
      }
      content = addLine(content, "}", 2);
    }
    // requestBodies
    if (spec.components.requestBodies !== undefined) {
      const requestBodies = spec.components.requestBodies;
      if (isRefObj(requestBodies)) {
        content = addLine(content, `readonly "requestBodies": ${transformRef(requestBodies.$ref)}`, 2);
      } else {
        content = addLine(content, "readonly requestBodies: {", 2);
        for (const [reqBodyKey, reqBodyObj] of Object.entries(requestBodies)) {
          if (isRefObj(reqBodyObj)) {
            content = addLine(content, `readonly ${reqBodyKey}: ${transformRef(reqBodyObj.$ref)}`, 3);
          } else if (reqBodyObj.content) {
            content = addLine(content, `readonly ${reqBodyKey}: {`, 3);
            content = add(content, contentNodeToContentProperty(reqBodyObj.content, 4), 4);
            content = addLine(content, "}", 3);
          }
        }
        content = addLine(content, "}", 2);
      }
    }
    content = addLine(content, "}", 1);
  }
  content = addLine(content, "}", 0);
  content += "\n";
  return content;
}

function dereferenceParam(
  spec: OpenAPIV3.Document,
  paramRef: OpenAPIV3.ReferenceObject,
  level: number = 0
): OpenAPIV3.ParameterObject {
  if (level > 50) {
    // Failsafe
    throw new Error("Too deep param reference.");
  }
  // Some params can be a reference object and we don't know the name of that param without dereferencing
  // eg. "#/components/parameters/unitId"
  const parts = paramRef.$ref.split("/");
  const paramName = parts[3];
  const param = spec.components?.parameters?.[paramName];
  if (param === undefined) {
    throw new Error(`Could not find referenced param ${paramRef.$ref}.`);
  }
  if (isRefObj(param)) {
    // The dereferenced param itself points to a reference...
    return dereferenceParam(spec, param, level + 1);
  }
  return param;
}

function contentNodeToContentProperty(
  contentNode: { readonly [media: string]: OpenAPIV3.MediaTypeObject },
  indentLevel: number
): string {
  let content = "";
  content = addLine(content, "readonly content: {", indentLevel);
  for (const [contentKey, contentItem] of Object.entries(contentNode)) {
    if (contentItem.schema) {
      if (isRefObj(contentItem.schema)) {
        content = addLine(
          content,
          `readonly "${contentKey}": ${transformRef(contentItem.schema.$ref)}`,
          indentLevel + 1
        );
      } else {
        const schemaType = getSchemaType(contentItem.schema);
        content = addLine(content, `readonly "${contentKey}": ${schemaType}`, indentLevel + 1);
      }
    }
  }
  content = addLine(content, "}", indentLevel);
  return content;
}

function addLine(content: string, textToAdd: string, indentLevel: number): string {
  return content + indent(textToAdd, indentLevel) + "\n";
}

function indent(text: string, indentLevel: number): string {
  return (
    Array(indentLevel * 2)
      .fill(" ")
      .join("") + text
  );
}

function add(content: string, textToAdd: string, indentLevel: number): string {
  return content + indent(textToAdd, indentLevel);
}

function getSchemaType(schemaObj: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string {
  const compiledSchemaType = schemaObjectToTypescriptType(schemaObj);
  return compiledSchemaType;
}
