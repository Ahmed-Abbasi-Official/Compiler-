# Recurse Programming Language Compiler

A modular compiler for the **Recurse** programming language, developed for Compiler Construction (Uni 3rd Year).

---

## 📁 Project Structure

```text
Recurse-Compiler/
│
├── src/
│   ├── lexer/
│   │   ├── Lexer.js                  # Main lexical analyzer
│   │   ├── Token.js                  # Token class definition { lexeme, token, line }
│   │   ├── TokenTypes.js             # Keywords, operators, and special characters
│   │   └── LexicalErrors.js          # Lexical error representation
│   │
│   ├── parser/
│   │   ├── Parser.js                 # Syntax analyzer (Recursive Descent Parser)
│   │   ├── TreeNode.js               # Parse tree node + tree printer
│   │   └── ParseError.js             # Syntax error representation { line, expected, found }
│   │
│   ├── semantic/
│   │   └── SemanticAnalyzer.js       # Semantic analyzer
│   │
│   ├── intermediate/
│   │   └── IntermediateCodeGenerator.js
│   │
│   ├── optimizer/
│   │   └── Optimizer.js              # Code optimizer
│   │
│   ├── codegen/
│   │   └── CodeGenerator.js          # Target code generator
│   │
│   └── utils/
│       └── ErrorHandler.js           # Compiler error reporting utility
│
├── examples/
│   ├── valid.recurse                 # Valid sample Recurse program
│   ├── full.recurse                  # Uses every statement of the grammar
│   ├── syntax-errors.recurse         # Sample program with 4 syntax errors
│   └── lexical-errors.recurse        # Sample program with lexical tests
│
├── tests/
│   ├── lexer.test.js                 # Lexer validation and limit test cases
│   └── parser.test.js                # Parser test cases (valid programs + syntax errors)
│
├── app.js                            # Compiler driver script
├── package.json                      # Project metadata and start scripts
└── README.md                         # Documentation
```

---

## 🏷️ Token Representation

Each token produced by the Lexer contains:

- **`lexeme`**: The actual substring from the source code.
- **`token`**: The token symbol / classification (e.g. `DT`, `ID`, `DIGIT-C`, `DECIMAL-C`, `WORD-C`, operators, delimiters). A **keyword's token is the keyword in capital letters**: `halt` → `HALT`, `launch` → `LAUNCH`, `def_func` → `DEF_FUNC`.
- **`line`**: The line number where the token appears.

---

## ⚠️ Supported Lexical Error Types

The Lexical Analyzer identifies and reports **9 distinct types of lexical errors**. When an error occurs, no valid token is generated for the faulty lexeme.

### 1. `Invalid Identifier`
- **Rule:** Identifiers must start with a letter (`A-Z`, `a-z`) or underscore (`_`). If an identifier starts with a number followed by letters or underscores, it is invalid.
- **Examples:**
  - `23abc` &rarr; ❌ `Invalid Identifier`
  - `1_val` &rarr; ❌ `Invalid Identifier`
  - `val1` &rarr; ✅ Valid (`ID`)

### 2. `Invalid Number`
- **Rule:** Numbers must strictly conform to integer (`-?[0-9]+`) or decimal (`-?[0-9]+\.[0-9]+`) formats. Numbers with multiple decimal points or malformed numeric patterns are flagged.
- **Examples:**
  - `12.3.4` &rarr; ❌ `Invalid Number`
  - `12.` &rarr; ❌ `Invalid Number`
  - `12.5` &rarr; ✅ Valid (`DECIMAL-C`)

### 3. `Unterminated String`
- **Rule:** A `word` literal enclosed in double quotes `"` must be closed with a matching `"` on the same line. If the line ends or file ends before closing `"`, an error is raised.
- **Examples:**
  - `"Ahmed` &rarr; ❌ `Unterminated String`
  - `"Ahmed"` &rarr; ✅ Valid

### 4. `Invalid Operator`
- **Rule:** Operators not supported by the Recurse language specification are rejected.
- **Examples:**
  - `:=` &rarr; ❌ `Invalid Operator`
  - `**` &rarr; ❌ `Invalid Operator`
  - `==`, `<=`, `++` &rarr; ✅ Valid

### 5. `Invalid Character`
- **Rule:** Any character that does not belong to the Recurse character set (and is not inside a string or comment) is invalid.
- **Examples:**
  - `@`, `$`, `#`, `~` &rarr; ❌ `Invalid Character`

### 6. `Number Limit Exceeded`
- **Rule:** 
  - Represents integer constants (`number`).
  - Maximum allowed digits: **10 digits**.
  - Negative sign (`-`) is **not** counted as a digit.
  - Allowed range: `-9999999999` to `9999999999`.
- **Examples:**
  - `123` &rarr; ✅ Valid
  - `1234567890` &rarr; ✅ Valid (10 digits)
  - `-1234567890` &rarr; ✅ Valid (10 digits)
  - `12345678901` &rarr; ❌ `Number Limit Exceeded` (11 digits)
  - `-12345678901` &rarr; ❌ `Number Limit Exceeded` (11 digits)

### 7. `Decimal Limit Exceeded`
- **Rule:**
  - Represents floating-point constants (`decimal`).
  - Maximum **15 digits total**, excluding the decimal point `.` and optional negative sign `-`.
  - Maximum **6 digits after the decimal point** (fractional part).
- **Examples:**
  - `1.2` &rarr; ✅ Valid
  - `12345678.90` &rarr; ✅ Valid
  - `123456789.123456` &rarr; ✅ Valid (15 total digits, 6 fraction digits)
  - `1234567890.123456` &rarr; ❌ `Decimal Limit Exceeded` (16 total digits)
  - `1.1234567` &rarr; ❌ `Decimal Limit Exceeded` (7 fraction digits)

### 8. `Word Length Exceeded`
- **Rule:**
  - Represents string constants (`word`).
  - Maximum allowed length: **50 characters** (excluding the surrounding quotes).
- **Examples:**
  - `"Ahmed"` &rarr; ✅ Valid (5 characters)
  - `"Hello World"` &rarr; ✅ Valid (11 characters)
  - String with 50 characters &rarr; ✅ Valid
  - String with 51+ characters &rarr; ❌ `Word Length Exceeded`

### 9. `Identifier Length Exceeded`
- **Rule:**
  - Identifiers (variable names, function names) can have a maximum length of **31 characters**.
- **Examples:**
  - `abc` &rarr; ✅ Valid
  - `student_name` &rarr; ✅ Valid
  - Identifier with 31 characters &rarr; ✅ Valid
  - Identifier with 32+ characters &rarr; ❌ `Identifier Length Exceeded`

---

## 🌳 Syntax Analyzer: Recursive Descent Parser

The parser takes the tokens from the Lexer and checks that they follow the grammar of Recurse.
If they do, it builds a **parse tree**. If they do not, it reports **syntax errors** with the line number.

- **Top-down:** it starts from `Program` and goes down to the tokens (leftmost derivation).
- **One function per non-terminal:** `Program()`, `Stmt()`, `Expr()`, `Factor()` ... each function is one grammar rule.
- **LL(1), no backtracking:** each function looks at the current token only and picks the right production.
  This is why the grammar has **no left recursion** and is **left factored**.
- **Comments** (`-> ... <-`) are removed before parsing; they are not part of the grammar.
- The parser runs only when there are **no lexical errors**.

### Grammar (CFG)

Terminals are tokens from the Lexer: `ID`, `DT` (number / decimal / word), `DIGIT-C`, `DECIMAL-C`, `WORD-C`,
keyword tokens (`LAUNCH`, `HALT`, `YES` ...) and symbols. `ε` means empty.
In the code you write keywords in small letters (`halt`); the Lexer gives them the capital token (`HALT`).

```text
Program     → FuncList LAUNCH [ StmtList HALT ]

FuncList    → FuncDef FuncList | ε
FuncDef     → DEF_FUNC RetType ID ( ParamList ) Block
RetType     → DT | ε
ParamList   → Param ParamTail | ε
ParamTail   → , Param ParamTail | ε
Param       → DT ID
Block       → [ StmtList ]

StmtList    → Stmt StmtList | ε
Stmt        → Decl ; | ArrayDecl ; | IdStmt ; | Show ; | Feed ; | Return ; | If | For

Decl        → DT ID DeclTail
DeclTail    → = Expr | ε
ArrayDecl   → ARRAY DT ID [ DIGIT-C ] ArrayInit
ArrayInit   → = [ ArgList ] | ε
IdStmt      → ID IdTail
IdTail      → = Expr | [ Expr ] = Expr | ++ | -- | ( ArgList )
Show        → SHOW ( ArgList )
Feed        → FEED ( ID )
Return      → RETURN ReturnValue
ReturnValue → Expr | ε

If          → YES ( Expr ) Block ElsePart
ElsePart    → OR ElseBody | ε
ElseBody    → If | Block

For         → LIMIT ( ForInit ; Expr ; ForUpdate ) Block
ForInit     → Decl | Assign | ε
Assign      → ID = Expr
ForUpdate   → ID UpdateOp | ε
UpdateOp    → ++ | -- | = Expr

ArgList     → Expr ArgTail | ε
ArgTail     → , Expr ArgTail | ε

Expr        → AndExpr ExprTail
ExprTail    → || AndExpr ExprTail | ε
AndExpr     → RelExpr AndTail
AndTail     → && RelExpr AndTail | ε
RelExpr     → ArithExpr RelTail
RelTail     → RelOp ArithExpr | ε
RelOp       → < | > | <= | >= | == | !=
ArithExpr   → Term ArithTail
ArithTail   → + Term ArithTail | - Term ArithTail | ε
Term        → Factor TermTail
TermTail    → * Factor TermTail | / Factor TermTail | % Factor TermTail | ε
Factor      → ( Expr ) | ! Factor | - Factor | DIGIT-C | DECIMAL-C | Word | ID IdRest
IdRest      → [ Expr ] | ( ArgList ) | ε
Word        → " WordBody "
WordBody    → WORD-C | ε
```

**Operator precedence** (low → high): `||`, `&&`, relational, `+ -`, `* / %`, unary `! -`.
The expression rules are the class grammar `E → E + T | T` with left recursion removed:
`E → T E'`, `E' → + T E' | ε`. Here `ArithExpr` is `E`, `ArithTail` is `E'`, `Term` is `T`, `Factor` is `F`.

**FIRST(Stmt)** = { `DT`, `ARRAY`, `ID`, `SHOW`, `FEED`, `RETURN`, `YES`, `LIMIT` } &nbsp; · &nbsp;
**FOLLOW(StmtList)** = { `HALT`, `]` }

### Keyword meaning

| Keyword (lexeme) | Token | Meaning | Example |
|---|---|---|---|
| `launch` / `halt` | `LAUNCH` / `HALT` | start / end of the program | `launch [ ... halt ]` |
| `yes` / `or` | `YES` / `OR` | if / else (`or yes` = else if) | `yes (a > 5) [ ... ] or [ ... ]` |
| `limit` | `LIMIT` | for loop | `limit(number i = 0; i < 5; i++) [ ... ]` |
| `show` | `SHOW` | print | `show("Total", t);` |
| `feed` | `FEED` | input | `feed(name);` |
| `array` | `ARRAY` | array declaration | `array number m[3] = [1, 2, 3];` |
| `def_func` | `DEF_FUNC` | function definition (before `launch`) | `def_func number add(number a, number b) [ return a + b; ]` |
| `return` | `RETURN` | return from a function | `return a + b;` |

### Syntax errors and recovery (panic mode)

Each error says what the parser **expected** and what it **found**:

```text
Syntax Error -> Line 5: expected ";" but found "show"
Syntax Error -> Line 7: expected a value (number, decimal, word, identifier or "(") but found ";"
```

After an error the parser does not stop. It skips tokens to the end of the broken statement
(the next `;`, or the closing `]` of a `yes` / `limit` block) and continues, so it can report many errors in one run.
A missing `;` is reported on the line of the **next** token, because that is where the parser notices it.

---

## 🚀 How to Run

### 1. Run the Compiler Driver
```bash
npm start
# or
node app.js                          # default file: examples/lexical-errors.recurse
node app.js examples/full.recurse    # any .recurse file
node app.js examples/syntax-errors.recurse
```

It prints the tokens, the lexical errors, and then the parse tree or the syntax errors.

### 2. Run Test Cases
```bash
node tests/lexer.test.js
npm test                             # parser tests (node tests/parser.test.js)
```
