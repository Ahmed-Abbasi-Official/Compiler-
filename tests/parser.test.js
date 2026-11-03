import fs from "fs";
import Lexer from "../src/lexer/Lexer.js";
import Parser from "../src/parser/Parser.js";


function parse(code) {

    const { tokens } = new Lexer(code).analyze();

    return new Parser(tokens).parse();

}


function program(body) {

    return `launch\n[\n${body}\nhalt\n]`;

}


// errors: how many syntax errors we expect
// line / expected: details of the first error (optional)
const tests = [

    // ---------- valid programs ----------
    { name: "examples/valid.recurse", code: fs.readFileSync("examples/valid.recurse", "utf-8"), errors: 0 },
    { name: "examples/full.recurse", code: fs.readFileSync("examples/full.recurse", "utf-8"), errors: 0 },
    { name: "empty program", code: program(""), errors: 0 },
    { name: "declaration without value", code: program("number a;"), errors: 0 },
    { name: "precedence and brackets", code: program("number x = (2 + 3) * -4 % 5 - 6 / 2;"), errors: 0 },
    { name: "logic and compare", code: program("yes (!(a < b) || a == b && c != 0) [ show(a); ]"), errors: 0 },
    { name: "if / else if / else", code: program("yes (a > 1) [ ] or yes (a > 0) [ ] or [ show(a); ]"), errors: 0 },
    { name: "empty word", code: program("word w = \"\";"), errors: 0 },
    { name: "comments are ignored", code: program("-> one line\nnumber a = 1; -> two\nlines <-\nshow(a);"), errors: 0 },
    { name: "array declare, read, write", code: program("array decimal d[2] = [1.5, 2.5];\nd[1] = d[0] + 1;"), errors: 0 },
    { name: "function with no params", code: "def_func hello() [ show(\"hi\"); ]\n" + program("hello();"), errors: 0 },
    { name: "loop with -- update", code: program("limit(i = 10; i > 0; i--) [ show(i); ]"), errors: 0 },

    // ---------- syntax errors ----------
    { name: "examples/syntax-errors.recurse", code: fs.readFileSync("examples/syntax-errors.recurse", "utf-8"), errors: 4 },
    { name: "missing ;", code: program("number a = 1\nshow(a);"), errors: 1, line: 4, expected: "\";\"" },
    { name: "missing value", code: program("number a = ;"), errors: 1, line: 3, expected: "a value (number, decimal, word, identifier or \"(\")" },
    { name: "missing )", code: program("show(a;"), errors: 1, expected: "\")\"" },
    { name: "missing launch", code: "[ halt ]", errors: 1, expected: "\"launch\"" },
    { name: "missing halt", code: "launch [ show(a); ]", errors: 1, expected: "\"halt\"" },
    { name: "missing ] at end", code: "launch [ show(a);\nhalt", errors: 1, expected: "\"]\"" },
    { name: "code after the end", code: program("") + "\nshow(a);", errors: 1, expected: "end of file" },
    { name: "bad statement start", code: program(") show(a);"), errors: 1, expected: "a statement" },
    { name: "assignment without =", code: program("a 5;"), errors: 1, expected: "\"=\", \"[\", \"++\", \"--\" or \"(\"" },
    { name: "if without block", code: program("yes (a) show(a);"), errors: 1, expected: "\"[\"" },
    { name: "array size must be integer", code: program("array number m[2.5];"), errors: 1, expected: "integer constant" },
    { name: "missing ; inside block", code: program("limit(i = 0; i < 3; i++) [ show(i) ]\nshow(1);"), errors: 1, expected: "\";\"" },
    { name: "bad loop header, next line still checked", code: program("limit(;;) [ show(1); ]\nnumber x = ;"), errors: 2 },
    { name: "bad if condition skips its block", code: program("yes (a > ) [ show(a); ] or [ show(b); ]\nshow(c);"), errors: 1 },
    { name: "bad array index", code: program("a[1 = 5;\nshow(a);"), errors: 1, expected: "\"]\"" },
    { name: "block not closed before halt", code: program("yes (a) [ show(a);"), errors: 1, expected: "\"]\"" }

];


let passed = 0;

for (const t of tests) {

    const { errors } = parse(t.code);
    const first = errors[0];

    const ok =
        errors.length === t.errors &&
        (t.line === undefined || first.line === t.line) &&
        (t.expected === undefined || first.expected === t.expected);

    if (ok) {

        passed++;
        console.log(`PASS  ${t.name}`);

    } else {

        console.log(`FAIL  ${t.name}`);
        console.log(`      wanted ${t.errors} error(s), got ${errors.length}`);
        errors.forEach((e) => console.log(`      ${e.message}`));

    }

}


console.log(`\n${passed} / ${tests.length} tests passed`);

if (passed !== tests.length) {
    process.exitCode = 1;
}
