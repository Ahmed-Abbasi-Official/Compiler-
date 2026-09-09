import fs from "fs";
import Lexer from "./src/lexer/Lexer.js";


// Read Recurse Source Code
const code = fs.readFileSync(
    "./examples/lexical-errors.recurse",
    "utf-8"
);


// Create Lexer
const lexer = new Lexer(code);


// Run Lexical Analysis
const result = lexer.analyze();


// =============================
// PRINT TOKENS
// =============================

console.log("\n========== TOKENS ==========\n");

console.table(result.tokens);


// =============================
// PRINT ERRORS
// =============================

console.log("\n========== LEXICAL ERRORS ==========\n");


if (result.errors.length === 0) {

    console.log("No lexical errors found!");

} else {

    console.table(result.errors);

}