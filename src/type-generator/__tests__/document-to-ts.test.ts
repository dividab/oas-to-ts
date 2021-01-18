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
  const actualOutput = await DocmentToTs.inputFileToTypeString(inputFile);
  // fs.writeFileSync(outputFile, actualOutput);
  expect(actualOutput).toEqual(expctedOutput);
});

test("Nullable example", async () => {
  const inputFile = path.join(__dirname, "data/demo.yml");
  const outputFile = path.join(__dirname, "data/demo-output.txt");
  const expctedOutput = fs.readFileSync(outputFile, "utf8");
  const actualOutput = await DocmentToTs.inputFileToTypeString(inputFile);
  // fs.writeFileSync(outputFile, actualOutput);
  expect(actualOutput).toEqual(expctedOutput);
});
