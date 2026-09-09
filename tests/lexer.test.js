import Lexer from "../src/lexer/Lexer.js";

const testCode = `
1234567890
-1234567890
12345678901
-12345678901
123456789.123456
1234567890.123456
1.1234567
"${"a".repeat(50)}"
"${"a".repeat(51)}"
${"x".repeat(31)}
${"x".repeat(32)}
`;

const lexer = new Lexer(testCode);
const result = lexer.analyze();

console.log("\n========== TOKENS ==========\n");
console.table(result.tokens);

console.log("\n========== LEXICAL ERRORS ==========\n");
console.table(result.errors);
