import fs from "fs";
import Lexer from "./src/lexer/Lexer.js";
import Parser from "./src/parser/Parser.js";


// Read Recurse Source Code
// Usage: node app.js [file]   (default: examples/lexical-errors.recurse)
const file = process.argv[2] || "./examples/lexical-errors.recurse";

const code = fs.readFileSync(
    file,
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


// =============================
// SYNTAX ANALYSIS (Recursive Descent Parser)
// =============================

console.log("\n========== SYNTAX ANALYSIS ==========\n");


if (result.errors.length > 0) {

    console.log("Fix the lexical errors first. The parser did not run.");

} else {

    const parser = new Parser(result.tokens);
    const { tree, errors } = parser.parse();

    if (errors.length === 0) {

        console.log("No syntax errors found! The program is valid.");

        console.log("\n========== PARSE TREE ==========\n");

        console.log(tree.print());

    } else {

        console.log(`${errors.length} syntax error(s) found:\n`);

        errors.forEach((e) => console.log(`Syntax Error -> ${e.message}`));

    }

}
