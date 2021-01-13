#!/usr/bin/env node

import { program } from "commander";
import { documentToTypefile } from "./type-generator";

program.version("0.0.1");

program
  .requiredOption("-i, --input <file>", "A OpenAPI3 specfication json or yaml document")
  .requiredOption("-o, --output <file>", "The resulting typescript file.");

program.parse(process.argv);

const inputFile = program.input;
const outputFile = program.output;

documentToTypefile(inputFile, outputFile);
