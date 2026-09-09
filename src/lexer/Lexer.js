import Token from "./Token.js";
import LexicalError from "./LexicalErrors.js";

import {
    KEYWORDS,
    DATA_TYPES,
    OPERATORS,
    SPECIAL_CHARACTERS,
    INVALID_OPERATORS
} from "./TokenTypes.js";


export default class Lexer {

    constructor(code) {

        this.code = code;

        this.tokens = [];
        this.errors = [];

        this.current = 0;
        this.line = 1;
        this.newlineSinceLastToken = true;

    }


    // ==========================
    // HELPER FUNCTIONS
    // ==========================

    isAtEnd() {
        return this.current >= this.code.length;
    }


    peek() {

        if (this.isAtEnd()) {
            return "\0";
        }

        return this.code[this.current];
    }


    peekNext() {

        if (this.current + 1 >= this.code.length) {
            return "\0";
        }

        return this.code[this.current + 1];
    }


    advance() {

        const char = this.code[this.current];
        this.current++;

        return char;
    }


    addToken(lexeme, token) {

        this.tokens.push(
            new Token(
                lexeme,
                token,
                this.line
            )
        );

        this.newlineSinceLastToken = false;

    }


    addError(errorType, value) {

        this.errors.push(
            new LexicalError(
                this.line,
                errorType,
                value
            )
        );

    }


    isIdentifierStart(char) {

        return /[A-Za-z_]/.test(char);

    }


    isIdentifierPart(char) {

        return /[A-Za-z0-9_]/.test(char);

    }


    // ==========================
    // MAIN ANALYZE METHOD
    // ==========================

    analyze() {

        while (!this.isAtEnd()) {

            const ch = this.peek();


            // ==========================
            // 1. WHITESPACE
            // ==========================

            if (/\s/.test(ch)) {

                if (ch === "\n") {
                    this.line++;
                    this.newlineSinceLastToken = true;
                }

                this.advance();

                continue;
            }


            // ==========================
            // 2. COMMENT
            // Single-line: ->.*
            // Multi-line: ->[\s\S]*?<-
            // ==========================

            if (
                this.code.substring(
                    this.current,
                    this.current + 2
                ) === "->"
            ) {

                this.handleComment();

                continue;
            }


            // ==========================
            // 3. STRING
            // "abc" -> Token '"', 'WORD-C', '"'
            // Max length: 50 characters (excluding quotes)
            // ==========================

            if (ch === '"') {

                this.handleString();

                continue;
            }


            // ==========================
            // 4. NEGATIVE NUMBER
            // ==========================

            const lastToken = this.tokens[this.tokens.length - 1];
            const isUnaryMinus = !lastToken || this.newlineSinceLastToken || [
                "=", "(", "[", ",", ";", "+", "-", "*", "/", "%",
                "<", ">", "<=", ">=", "==", "!=", "&&", "||", "!"
            ].includes(lastToken.token);

            if (
                ch === "-" &&
                isUnaryMinus &&
                /[0-9]/.test(this.peekNext())
            ) {

                this.handleNegativeNumber();

                continue;
            }


            // ==========================
            // 5. NUMBER / INVALID ID
            // ==========================

            if (/[0-9]/.test(ch)) {

                this.handleNumber();

                continue;
            }


            // ==========================
            // 6. IDENTIFIER / KEYWORD
            // Max length: 31 characters
            // ==========================

            if (this.isIdentifierStart(ch)) {

                this.handleIdentifier();

                continue;
            }


            // ==========================
            // 7. INVALID OPERATORS
            // ==========================

            const twoChar = this.code.substring(
                this.current,
                this.current + 2
            );

            if (INVALID_OPERATORS.has(twoChar)) {

                this.addError(
                    "Invalid Operator",
                    twoChar
                );

                this.current += 2;

                continue;
            }


            // ==========================
            // 8. VALID OPERATORS
            // ==========================

            if (OPERATORS[twoChar]) {

                this.addToken(
                    twoChar,
                    OPERATORS[twoChar]
                );

                this.current += 2;

                continue;
            }


            if (OPERATORS[ch]) {

                this.addToken(
                    ch,
                    OPERATORS[ch]
                );

                this.current++;

                continue;
            }


            // ==========================
            // 9. SPECIAL CHARACTERS
            // ==========================

            if (SPECIAL_CHARACTERS[ch]) {

                this.addToken(
                    ch,
                    SPECIAL_CHARACTERS[ch]
                );

                this.current++;

                continue;
            }


            // ==========================
            // 10. INVALID CHARACTER
            // ==========================

            this.addError(
                "Invalid Character",
                ch
            );

            this.current++;

        }


        return {
            tokens: this.tokens,
            errors: this.errors
        };

    }


    // ==========================
    // HANDLE COMMENT
    // ==========================

    handleComment() {

        const startLine = this.line;
        const afterArrow = this.current + 2;

        const end = this.code.indexOf("<-", afterArrow);
        const nextStart = this.code.indexOf("->", afterArrow);
        const newline = this.code.indexOf("\n", afterArrow);

        // Multi-line comment if <- exists and no intervening ->
        if (end !== -1 && (nextStart === -1 || end < nextStart)) {

            const commentText = this.code.substring(afterArrow, end);

            this.addToken("->", "->");

            const trimmed = commentText.trim();
            if (trimmed.length > 0) {
                this.addToken(trimmed, "WORD-C");
            }

            this.line += (commentText.match(/\n/g) || []).length;

            this.addToken("<-", "<-");

            this.current = end + 2;

        } else {

            // Single-line comment: ->.* up to newline or EOF
            const endOfLine = newline !== -1 ? newline : this.code.length;
            const commentText = this.code.substring(afterArrow, endOfLine);

            this.addToken("->", "->");

            const trimmed = commentText.trim();
            if (trimmed.length > 0) {
                this.addToken(trimmed, "WORD-C");
            }

            this.current = endOfLine;

        }

    }


    // ==========================
    // HANDLE STRING
    // Rule: Maximum 50 characters (excluding quotes)
    // Error: "Word Length Exceeded"
    // ==========================

    handleString() {

        const startLine = this.line;
        const start = this.current;

        this.advance(); // consume opening quote

        const contentStart = this.current;

        while (
            !this.isAtEnd() &&
            this.peek() !== '"' &&
            this.peek() !== "\n"
        ) {

            this.advance();

        }


        if (
            this.isAtEnd() ||
            this.peek() !== '"'
        ) {

            const value = this.code.substring(
                start,
                this.current
            );

            this.addError(
                "Unterminated String",
                value
            );

            return;
        }


        const value = this.code.substring(
            contentStart,
            this.current
        );

        this.advance(); // consume closing quote
        const fullLexeme = this.code.substring(start, this.current);

        // Word Length validation: max 50 characters (excluding quotes)
        if (value.length > 50) {

            this.addError(
                "Word Length Exceeded",
                fullLexeme
            );

            return;
        }

        // Valid word: emit quotes and WORD-C token
        this.addToken('"', '"');

        if (value.length > 0) {
            this.addToken(value, "WORD-C");
        }

        this.addToken('"', '"');

    }


    // ==========================
    // HANDLE NUMBER
    // ==========================

    handleNumber() {

        const start = this.current;

        while (
            !this.isAtEnd() &&
            /[A-Za-z0-9._]/.test(this.peek())
        ) {

            this.advance();

        }


        const value = this.code.substring(
            start,
            this.current
        );


        // Invalid Identifier (e.g. 23abc)
        if (
            /^\d+[A-Za-z_][A-Za-z0-9_]*$/.test(value)
        ) {

            this.addError(
                "Invalid Identifier",
                value
            );

            return;
        }


        // Invalid Number (multiple dots)
        if (
            (value.match(/\./g) || []).length > 1
        ) {

            this.addError(
                "Invalid Number",
                value
            );

            return;
        }


        // Decimal constant (DECIMAL-C)
        if (
            /^\d+\.\d+$/.test(value)
        ) {

            const [intPart, fracPart] = value.split(".");
            const totalDigits = (intPart ? intPart.length : 0) + (fracPart ? fracPart.length : 0);
            const fracDigits = fracPart ? fracPart.length : 0;

            // Limit: max 15 digits total, max 6 digits after decimal
            if (totalDigits > 15 || fracDigits > 6) {

                this.addError(
                    "Decimal Limit Exceeded",
                    value
                );

                return;
            }

            this.addToken(
                value,
                "DECIMAL-C"
            );

            return;
        }


        // Integer constant (DIGIT-C)
        if (
            /^\d+$/.test(value)
        ) {

            // Limit: max 10 digits
            if (value.length > 10) {

                this.addError(
                    "Number Limit Exceeded",
                    value
                );

                return;
            }

            this.addToken(
                value,
                "DIGIT-C"
            );

            return;
        }


        this.addError(
            "Invalid Number",
            value
        );

    }


    // ==========================
    // HANDLE NEGATIVE NUMBER
    // ==========================

    handleNegativeNumber() {

        const start = this.current;

        this.advance(); // consume '-'


        while (
            !this.isAtEnd() &&
            /[0-9.]/.test(this.peek())
        ) {

            this.advance();

        }


        const value = this.code.substring(
            start,
            this.current
        );


        if (
            (value.match(/\./g) || []).length > 1
        ) {

            this.addError(
                "Invalid Number",
                value
            );

            return;
        }


        // Negative Integer (DIGIT-C)
        if (/^-?\d+$/.test(value)) {

            const digitsOnly = value.slice(1); // excluding minus sign

            // Limit: max 10 digits
            if (digitsOnly.length > 10) {

                this.addError(
                    "Number Limit Exceeded",
                    value
                );

                return;
            }

            this.addToken(
                value,
                "DIGIT-C"
            );

            return;
        }


        // Negative Decimal (DECIMAL-C)
        if (/^-?\d+\.\d+$/.test(value)) {

            const withoutMinus = value.slice(1);
            const [intPart, fracPart] = withoutMinus.split(".");
            const totalDigits = (intPart ? intPart.length : 0) + (fracPart ? fracPart.length : 0);
            const fracDigits = fracPart ? fracPart.length : 0;

            // Limit: max 15 digits total, max 6 digits after decimal
            if (totalDigits > 15 || fracDigits > 6) {

                this.addError(
                    "Decimal Limit Exceeded",
                    value
                );

                return;
            }

            this.addToken(
                value,
                "DECIMAL-C"
            );

            return;
        }


        this.addError(
            "Invalid Number",
            value
        );

    }


    // ==========================
    // HANDLE IDENTIFIER
    // Rule: Maximum 31 characters
    // Error: "Identifier Length Exceeded"
    // ==========================

    handleIdentifier() {

        const start = this.current;

        while (
            !this.isAtEnd() &&
            this.isIdentifierPart(
                this.peek()
            )
        ) {

            this.advance();

        }


        const value = this.code.substring(
            start,
            this.current
        );


        // Data Types (number, word, decimal) -> DT
        if (DATA_TYPES.has(value)) {

            this.addToken(
                value,
                "DT"
            );

            return;
        }


        // Reserved Keywords (launch, halt, limit, yes, or, show, feed, return, array, def_func) -> RK
        if (KEYWORDS.has(value)) {

            this.addToken(
                value,
                "RK"
            );

            return;
        }


        // Identifier Length validation: max 31 characters
        if (value.length > 31) {

            this.addError(
                "Identifier Length Exceeded",
                value
            );

            return;
        }


        // Valid Identifier -> ID
        this.addToken(
            value,
            "ID"
        );

    }

}