import TreeNode, { epsilon } from "./TreeNode.js";
import ParseError from "./ParseError.js";
import { KEYWORDS } from "../lexer/TokenTypes.js";


// =====================================================
// RECURSIVE DESCENT PARSER for Recurse
//
// Rule: ONE function for ONE non-terminal of the grammar.
// Each function reads the current token and picks the
// right production (LL(1): one token look-ahead, no
// backtracking). The full grammar is in README.md and
// the production is written above each function.
// =====================================================


// FIRST(Stmt): tokens that can start a statement
const STMT_START = new Set([
    "DT", "ARRAY", "ID", "SHOW", "FEED", "RETURN", "YES", "LIMIT"
]);

// FIRST(Expr): tokens that can start an expression
const EXPR_START = new Set([
    "(", "!", "-", "DIGIT-C", "DECIMAL-C", '"', "ID"
]);

const REL_OPS = new Set(["<", ">", "<=", ">=", "==", "!="]);


// Friendly names for error messages
const NAMES = {
    "ID": "identifier",
    "DT": "data type (number, decimal, word)",
    "DIGIT-C": "integer constant",
    "increment": "\"++\"",
    "decrement": "\"--\"",
    "$": "end of file"
};

// Keyword tokens: LAUNCH, HALT, YES ...
const KEYWORD_TOKENS = new Set(
    [...KEYWORDS].map((k) => k.toUpperCase())
);

function nameOf(kind) {

    // Show a keyword the way it is written in code: HALT -> "HALT"
    if (KEYWORD_TOKENS.has(kind)) return `"${kind.toLowerCase()}"`;

    return NAMES[kind] || `"${kind}"`;

}


// The lexer gives a comment as tokens:  ->  WORD-C  <-
// Comments are not part of the grammar, so remove them first.
function removeComments(tokens) {

    const result = [];
    let i = 0;

    while (i < tokens.length) {

        if (tokens[i].token === "->") {

            i++; // skip ->

            if (tokens[i] && tokens[i].token === "WORD-C") i++; // skip comment text
            if (tokens[i] && tokens[i].token === "<-") i++;     // skip <- (multi-line)

            continue;
        }

        result.push(tokens[i]);
        i++;

    }

    return result;

}


export default class Parser {

    constructor(tokens) {

        this.tokens = removeComments(tokens);
        this.current = 0;
        this.errors = [];

    }


    // ==========================
    // HELPER FUNCTIONS
    // ==========================

    // Grammar name of a token = its token: LAUNCH, HALT, ID, DT, DIGIT-C, ;, + ...
    kind(token) {

        if (!token) return "$"; // end of input

        return token.token;

    }


    peek() {

        return this.tokens[this.current];

    }


    is(kind) {

        return this.kind(this.peek()) === kind;

    }


    // If the current token is the expected one: eat it and make a leaf.
    // Otherwise: syntax error.
    match(kind) {

        if (!this.is(kind)) {
            throw this.error(nameOf(kind));
        }

        const token = this.peek();
        this.current++;

        return new TreeNode(kind, token.lexeme, token.line);

    }


    error(expected) {

        const token = this.peek();

        if (!token) {
            const last = this.tokens[this.tokens.length - 1];
            return new ParseError(last ? last.line : 1, expected, "end of file");
        }

        return new ParseError(token.line, expected, `"${token.lexeme}"`);

    }


    // Panic mode recovery: the statement that started at "start" has an error.
    // Skip tokens until the end of that statement, so parsing can go on:
    //   - normal statements end with ";"
    //   - YES / LIMIT end with the "]" of their block (and their OR parts)
    // Never skip HALT or a "]" that belongs to the outer block.
    synchronize(start) {

        const first = this.kind(this.tokens[start]);
        const isBlockStmt = first === "YES" || first === "LIMIT";

        // "[" and "(" this statement opened but did not close yet
        let depth = 0;
        let parens = 0;

        for (let i = start; i < this.current; i++) {

            const k = this.kind(this.tokens[i]);

            if (k === "[") depth++;
            if (k === "]") depth--;
            if (k === "(") parens++;
            if (k === ")") parens--;

        }

        // LIMIT ( a ; b ; c ) has ";" inside ( ), so first skip to its ")"
        if (first === "LIMIT") {

            while (parens > 0 && !["$", "HALT", "[", "]"].includes(this.kind(this.peek()))) {

                if (this.is("(")) parens++;
                if (this.is(")")) parens--;

                this.current++;

            }
        }

        while (!this.is("$") && !this.is("HALT")) {

            const k = this.kind(this.peek());

            if (k === ";" && (depth === 0 || !isBlockStmt)) {
                this.current++;
                return;
            }

            if (depth === 0 && (STMT_START.has(k) || k === "]")) {
                return;
            }

            this.current++;

            if (k === "[") depth++;

            if (k === "]") {

                depth--;

                if (isBlockStmt && depth === 0 && !this.is("OR")) return;
            }

        }

    }


    // ==========================
    // MAIN PARSE METHOD
    // ==========================

    parse() {

        let tree = null;

        try {

            tree = this.Program();

        } catch (e) {

            if (!(e instanceof ParseError)) throw e;

            this.errors.push(e);

        }

        return {
            tree,
            errors: this.errors
        };

    }


    // ==========================
    // PROGRAM AND FUNCTIONS
    // ==========================

    // Program → FuncList LAUNCH [ StmtList HALT ]
    Program() {

        const node = new TreeNode("Program");

        node.add(
            this.FuncList(),
            this.match("LAUNCH"),
            this.match("["),
            this.StmtList(),
            this.match("HALT"),
            this.match("]")
        );

        if (!this.is("$")) {
            throw this.error(nameOf("$"));
        }

        return node;

    }


    // FuncList → FuncDef FuncList | ε
    FuncList() {

        const node = new TreeNode("FuncList");

        if (this.is("DEF_FUNC")) {
            node.add(this.FuncDef(), this.FuncList());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // FuncDef → DEF_FUNC RetType ID ( ParamList ) Block
    FuncDef() {

        const node = new TreeNode("FuncDef");

        node.add(
            this.match("DEF_FUNC"),
            this.RetType(),
            this.match("ID"),
            this.match("("),
            this.ParamList(),
            this.match(")"),
            this.Block()
        );

        return node;

    }


    // RetType → DT | ε
    RetType() {

        const node = new TreeNode("RetType");

        if (this.is("DT")) {
            node.add(this.match("DT"));
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ParamList → Param ParamTail | ε
    ParamList() {

        const node = new TreeNode("ParamList");

        if (this.is("DT")) {
            node.add(this.Param(), this.ParamTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ParamTail → , Param ParamTail | ε
    ParamTail() {

        const node = new TreeNode("ParamTail");

        if (this.is(",")) {
            node.add(this.match(","), this.Param(), this.ParamTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // Param → DT ID
    Param() {

        const node = new TreeNode("Param");

        node.add(this.match("DT"), this.match("ID"));

        return node;

    }


    // Block → [ StmtList ]
    Block() {

        const node = new TreeNode("Block");

        node.add(this.match("["), this.StmtList(), this.match("]"));

        return node;

    }


    // ==========================
    // STATEMENTS
    // ==========================

    // StmtList → Stmt StmtList | ε
    StmtList() {

        const node = new TreeNode("StmtList");

        if (STMT_START.has(this.kind(this.peek()))) {

            node.add(this.Stmt(), this.StmtList());

            return node;
        }

        // FOLLOW(StmtList) = { HALT, ] }  → choose ε
        if (this.is("HALT") || this.is("]") || this.is("$")) {

            node.add(epsilon());

            return node;
        }

        // This token cannot start a statement: report it, skip it, go on
        this.errors.push(this.error("a statement"));
        this.current++;

        return this.StmtList();

    }


    // Stmt → Decl ; | ArrayDecl ; | IdStmt ; | Show ; | Feed ; | Return ;
    //      | If | For
    Stmt() {

        const node = new TreeNode("Stmt");
        const start = this.current;

        try {

            switch (this.kind(this.peek())) {

                case "DT":
                    node.add(this.Decl(), this.match(";"));
                    break;

                case "ARRAY":
                    node.add(this.ArrayDecl(), this.match(";"));
                    break;

                case "ID":
                    node.add(this.IdStmt(), this.match(";"));
                    break;

                case "SHOW":
                    node.add(this.Show(), this.match(";"));
                    break;

                case "FEED":
                    node.add(this.Feed(), this.match(";"));
                    break;

                case "RETURN":
                    node.add(this.Return(), this.match(";"));
                    break;

                case "YES":
                    node.add(this.If());
                    break;

                case "LIMIT":
                    node.add(this.For());
                    break;

                default:
                    throw this.error("a statement");
            }

        } catch (e) {

            if (!(e instanceof ParseError)) throw e;

            this.errors.push(e);
            this.synchronize(start);

            node.add(new TreeNode("error"));

        }

        return node;

    }


    // Decl → DT ID DeclTail
    Decl() {

        const node = new TreeNode("Decl");

        node.add(this.match("DT"), this.match("ID"), this.DeclTail());

        return node;

    }


    // DeclTail → = Expr | ε
    DeclTail() {

        const node = new TreeNode("DeclTail");

        if (this.is("=")) {
            node.add(this.match("="), this.Expr());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ArrayDecl → ARRAY DT ID [ DIGIT-C ] ArrayInit
    ArrayDecl() {

        const node = new TreeNode("ArrayDecl");

        node.add(
            this.match("ARRAY"),
            this.match("DT"),
            this.match("ID"),
            this.match("["),
            this.match("DIGIT-C"),
            this.match("]"),
            this.ArrayInit()
        );

        return node;

    }


    // ArrayInit → = [ ArgList ] | ε
    ArrayInit() {

        const node = new TreeNode("ArrayInit");

        if (this.is("=")) {
            node.add(this.match("="), this.match("["), this.ArgList(), this.match("]"));
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // IdStmt → ID IdTail
    IdStmt() {

        const node = new TreeNode("IdStmt");

        node.add(this.match("ID"), this.IdTail());

        return node;

    }


    // IdTail → = Expr | [ Expr ] = Expr | ++ | -- | ( ArgList )
    IdTail() {

        const node = new TreeNode("IdTail");

        if (this.is("=")) {
            node.add(this.match("="), this.Expr());
        } else if (this.is("[")) {
            node.add(this.match("["), this.Expr(), this.match("]"), this.match("="), this.Expr());
        } else if (this.is("increment")) {
            node.add(this.match("increment"));
        } else if (this.is("decrement")) {
            node.add(this.match("decrement"));
        } else if (this.is("(")) {
            node.add(this.match("("), this.ArgList(), this.match(")"));
        } else {
            throw this.error("\"=\", \"[\", \"++\", \"--\" or \"(\"");
        }

        return node;

    }


    // Show → SHOW ( ArgList )
    Show() {

        const node = new TreeNode("Show");

        node.add(this.match("SHOW"), this.match("("), this.ArgList(), this.match(")"));

        return node;

    }


    // Feed → FEED ( ID )
    Feed() {

        const node = new TreeNode("Feed");

        node.add(this.match("FEED"), this.match("("), this.match("ID"), this.match(")"));

        return node;

    }


    // Return → RETURN ReturnValue
    Return() {

        const node = new TreeNode("Return");

        node.add(this.match("RETURN"), this.ReturnValue());

        return node;

    }


    // ReturnValue → Expr | ε
    ReturnValue() {

        const node = new TreeNode("ReturnValue");

        if (EXPR_START.has(this.kind(this.peek()))) {
            node.add(this.Expr());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // If → YES ( Expr ) Block ElsePart
    If() {

        const node = new TreeNode("If");

        node.add(
            this.match("YES"),
            this.match("("),
            this.Expr(),
            this.match(")"),
            this.Block(),
            this.ElsePart()
        );

        return node;

    }


    // ElsePart → OR ElseBody | ε
    ElsePart() {

        const node = new TreeNode("ElsePart");

        if (this.is("OR")) {
            node.add(this.match("OR"), this.ElseBody());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ElseBody → If | Block        ("or yes (...)" = else if)
    ElseBody() {

        const node = new TreeNode("ElseBody");

        if (this.is("YES")) {
            node.add(this.If());
        } else {
            node.add(this.Block());
        }

        return node;

    }


    // For → LIMIT ( ForInit ; Expr ; ForUpdate ) Block
    For() {

        const node = new TreeNode("For");

        node.add(
            this.match("LIMIT"),
            this.match("("),
            this.ForInit(),
            this.match(";"),
            this.Expr(),
            this.match(";"),
            this.ForUpdate(),
            this.match(")"),
            this.Block()
        );

        return node;

    }


    // ForInit → Decl | Assign | ε
    ForInit() {

        const node = new TreeNode("ForInit");

        if (this.is("DT")) {
            node.add(this.Decl());
        } else if (this.is("ID")) {
            node.add(this.Assign());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // Assign → ID = Expr
    Assign() {

        const node = new TreeNode("Assign");

        node.add(this.match("ID"), this.match("="), this.Expr());

        return node;

    }


    // ForUpdate → ID UpdateOp | ε
    ForUpdate() {

        const node = new TreeNode("ForUpdate");

        if (this.is("ID")) {
            node.add(this.match("ID"), this.UpdateOp());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // UpdateOp → ++ | -- | = Expr
    UpdateOp() {

        const node = new TreeNode("UpdateOp");

        if (this.is("increment")) {
            node.add(this.match("increment"));
        } else if (this.is("decrement")) {
            node.add(this.match("decrement"));
        } else if (this.is("=")) {
            node.add(this.match("="), this.Expr());
        } else {
            throw this.error("\"++\", \"--\" or \"=\"");
        }

        return node;

    }


    // ArgList → Expr ArgTail | ε
    ArgList() {

        const node = new TreeNode("ArgList");

        if (EXPR_START.has(this.kind(this.peek()))) {
            node.add(this.Expr(), this.ArgTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ArgTail → , Expr ArgTail | ε
    ArgTail() {

        const node = new TreeNode("ArgTail");

        if (this.is(",")) {
            node.add(this.match(","), this.Expr(), this.ArgTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // ==========================
    // EXPRESSIONS
    // Precedence (low → high): ||  &&  relational  + -  * / %  unary
    // Left recursion removed:  E → E + T | T   becomes   E → T E',  E' → + T E' | ε
    // ==========================

    // Expr → AndExpr ExprTail
    Expr() {

        const node = new TreeNode("Expr");

        node.add(this.AndExpr(), this.ExprTail());

        return node;

    }


    // ExprTail → || AndExpr ExprTail | ε
    ExprTail() {

        const node = new TreeNode("ExprTail");

        if (this.is("||")) {
            node.add(this.match("||"), this.AndExpr(), this.ExprTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // AndExpr → RelExpr AndTail
    AndExpr() {

        const node = new TreeNode("AndExpr");

        node.add(this.RelExpr(), this.AndTail());

        return node;

    }


    // AndTail → && RelExpr AndTail | ε
    AndTail() {

        const node = new TreeNode("AndTail");

        if (this.is("&&")) {
            node.add(this.match("&&"), this.RelExpr(), this.AndTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // RelExpr → ArithExpr RelTail
    RelExpr() {

        const node = new TreeNode("RelExpr");

        node.add(this.ArithExpr(), this.RelTail());

        return node;

    }


    // RelTail → RelOp ArithExpr | ε
    RelTail() {

        const node = new TreeNode("RelTail");

        if (REL_OPS.has(this.kind(this.peek()))) {
            node.add(this.RelOp(), this.ArithExpr());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // RelOp → < | > | <= | >= | == | !=
    RelOp() {

        const node = new TreeNode("RelOp");

        node.add(this.match(this.kind(this.peek())));

        return node;

    }


    // ArithExpr → Term ArithTail
    ArithExpr() {

        const node = new TreeNode("ArithExpr");

        node.add(this.Term(), this.ArithTail());

        return node;

    }


    // ArithTail → + Term ArithTail | - Term ArithTail | ε
    ArithTail() {

        const node = new TreeNode("ArithTail");

        if (this.is("+") || this.is("-")) {
            node.add(this.match(this.kind(this.peek())), this.Term(), this.ArithTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // Term → Factor TermTail
    Term() {

        const node = new TreeNode("Term");

        node.add(this.Factor(), this.TermTail());

        return node;

    }


    // TermTail → * Factor TermTail | / Factor TermTail | % Factor TermTail | ε
    TermTail() {

        const node = new TreeNode("TermTail");

        if (this.is("*") || this.is("/") || this.is("%")) {
            node.add(this.match(this.kind(this.peek())), this.Factor(), this.TermTail());
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // Factor → ( Expr ) | ! Factor | - Factor | DIGIT-C | DECIMAL-C | Word | ID IdRest
    Factor() {

        const node = new TreeNode("Factor");

        if (this.is("(")) {
            node.add(this.match("("), this.Expr(), this.match(")"));
        } else if (this.is("!")) {
            node.add(this.match("!"), this.Factor());
        } else if (this.is("-")) {
            node.add(this.match("-"), this.Factor());
        } else if (this.is("DIGIT-C")) {
            node.add(this.match("DIGIT-C"));
        } else if (this.is("DECIMAL-C")) {
            node.add(this.match("DECIMAL-C"));
        } else if (this.is('"')) {
            node.add(this.Word());
        } else if (this.is("ID")) {
            node.add(this.match("ID"), this.IdRest());
        } else {
            throw this.error("a value (number, decimal, word, identifier or \"(\")");
        }

        return node;

    }


    // IdRest → [ Expr ] | ( ArgList ) | ε       (array item, function call, variable)
    IdRest() {

        const node = new TreeNode("IdRest");

        if (this.is("[")) {
            node.add(this.match("["), this.Expr(), this.match("]"));
        } else if (this.is("(")) {
            node.add(this.match("("), this.ArgList(), this.match(")"));
        } else {
            node.add(epsilon());
        }

        return node;

    }


    // Word → " WordBody "
    Word() {

        const node = new TreeNode("Word");

        node.add(this.match('"'), this.WordBody(), this.match('"'));

        return node;

    }


    // WordBody → WORD-C | ε        ("" is an empty word)
    WordBody() {

        const node = new TreeNode("WordBody");

        if (this.is("WORD-C")) {
            node.add(this.match("WORD-C"));
        } else {
            node.add(epsilon());
        }

        return node;

    }

}
