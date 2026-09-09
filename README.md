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
│   │   └── Parser.js                 # Syntax analyzer (Parser)
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
│   └── lexical-errors.recurse        # Sample program with lexical tests
│
├── tests/
│   └── lexer.test.js                 # Lexer validation and limit test cases
│
├── app.js                            # Compiler driver script
├── package.json                      # Project metadata and start scripts
└── README.md                         # Documentation
```

---

## 🏷️ Token Representation

Each token produced by the Lexer contains:

- **`lexeme`**: The actual substring from the source code.
- **`token`**: The token symbol / classification (e.g. `RK`, `DT`, `ID`, `DIGIT-C`, `DECIMAL-C`, `WORD-C`, operators, delimiters).
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

## 🚀 How to Run

### 1. Run the Compiler Driver
```bash
npm start
# or
node app.js
```

### 2. Run Test Cases
```bash
node tests/lexer.test.js
```
