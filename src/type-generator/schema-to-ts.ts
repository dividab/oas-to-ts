/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenAPIV3 } from "openapi-types";
import { isRefObj } from "../shared";

function createKeys(obj: { readonly [key: string]: any }, required?: readonly string[]): string {
  let output = "";

  Object.entries(obj).forEach(([key, value]) => {
    // 1. JSDoc comment (goes above property)
    if (value.description) {
      output += comment(value.description);
    }

    // 2. name (with “?” if optional property)
    output += `readonly "${key}"${!required || !required.includes(key) ? "?" : ""}: `;

    // 3. open nullable
    if (value.nullable) {
      output += "(";
    }

    // 4. transform
    output += schemaObjectToTypescriptType(value);

    // 5. close nullable
    if (value.nullable) {
      output += ") | null";
    }

    // 6. close type
    output += ";\n";
  });

  return output;
}

// type converter
export function schemaObjectToTypescriptType(node: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string {
  if (isRefObj(node)) {
    return transformRef(node.$ref);
  }
  if (isArraySchemaObject(node)) {
    return tsArrayOf(schemaObjectToTypescriptType(node.items as any));
  }
  switch (nodeType(node)) {
    // case "ref": {
    //   return transformRef(node.$ref);
    // }
    case "string":
      if (node.pattern) {
        return `"${node.pattern}"`;
      }
      return "string";
    case "number":
    case "boolean": {
      return nodeType(node) || "any";
    }
    case "enum": {
      return tsUnionOf((node.enum as string[]).map((item) => `'${item}'`));
    }
    case "oneOf": {
      return tsUnionOf((node.oneOf as any[]).map(schemaObjectToTypescriptType));
    }
    case "anyOf": {
      return tsIntersectionOf((node.anyOf as any[]).map((anyOf) => tsPartial(schemaObjectToTypescriptType(anyOf))));
    }
    case "object": {
      // if empty object, then return generic map type
      if ((!node.properties || !Object.keys(node.properties).length) && !node.allOf && !node.additionalProperties) {
        return `{ readonly [key: string]: any }`;
      }

      let properties = createKeys(node.properties || {}, node.required);

      // if additional properties, add to end of properties
      if (node.additionalProperties) {
        properties += `readonly [key: string]: ${nodeType(node.additionalProperties) || "any"};\n`;
      }

      return tsIntersectionOf([
        ...(node.allOf ? (node.allOf as any[]).map(schemaObjectToTypescriptType) : []), // append allOf first
        ...(properties ? [`{ ${properties} }`] : []), // then properties + additionalProperties
      ]);
    }
    // case "array": {
    //   return tsArrayOf(transform(node.items as any));
    // }
    default:
      return "";
  }
}

function isArraySchemaObject(obj: any): obj is OpenAPIV3.ArraySchemaObject {
  return nodeType(obj) === "array";
}

/** Convert $ref to TS ref */
export function transformRef(ref: string): string {
  const parts = ref.replace(/^#\//, "").split("/");
  return `Spec["${parts[0]}"]["${parts.slice(1).join('"]["')}"]`;
}

/** Convert T into T[]; */
function tsArrayOf(type: string): string {
  return `(${type})[]`;
}

/** Convert T, U into T & U; */
function tsIntersectionOf(types: readonly string[]): string {
  return `(${types.join(") & (")})`;
}

/** Convert T into Partial<T> */
function tsPartial(type: string): string {
  return `Partial<${type}>`;
}

/** Convert [X, Y, Z] into X | Y | Z */
function tsUnionOf(types: readonly string[]): string {
  return `(${types.join(") | (")})`;
}

function comment(text: string): string {
  return `/**
    * ${text.trim().replace("\n+$", "").replace(/\n/g, "\n  * ")}
    */
  `;
}

/** Return type of node (works for v2 or v3, as there are no conflicting types) */
type SchemaObjectType = "anyOf" | "array" | "boolean" | "enum" | "number" | "object" | "oneOf" | "ref" | "string";
function nodeType(obj: any): SchemaObjectType | undefined {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  if (obj["$ref"]) {
    return "ref";
  }

  // enum
  if (Array.isArray(obj.enum)) {
    return "enum";
  }

  // boolean
  if (obj.type === "boolean") {
    return "boolean";
  }

  // string
  if (["binary", "byte", "date", "dateTime", "password", "string"].includes(obj.type)) {
    return "string";
  }

  // number
  if (["double", "float", "integer", "number"].includes(obj.type)) {
    return "number";
  }

  // anyOf
  if (Array.isArray(obj.anyOf)) {
    return "anyOf";
  }

  // oneOf
  if (Array.isArray(obj.oneOf)) {
    return "oneOf";
  }

  // array
  if (obj.type === "array" || obj.items) {
    return "array";
  }

  // return object by default
  return "object";
}
