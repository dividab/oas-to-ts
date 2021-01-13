import * as path from "path";
import * as fs from "fs";
import * as DocmentToTs from "../document-to-ts";

test("documentToTypefile exists", () => {
  expect(DocmentToTs.documentToTypefile).toBeInstanceOf(Function);
});

test("documentToTypeString example", async () => {
  const inputFile = path.join(__dirname, "data/example-input.yaml");
  const outputFile = path.join(__dirname, "data/example-output.txt");
  const expctedOutput = fs.readFileSync(outputFile, "utf8");
  const actualOutput = await DocmentToTs.documentToTypeString(inputFile);
  // fs.writeFileSync(outputFile, actualOutput);
  expect(actualOutput).toEqual(expctedOutput);
});
