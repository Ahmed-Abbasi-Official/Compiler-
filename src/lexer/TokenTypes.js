export const KEYWORDS = new Set([
    "launch",
    "halt",
    "limit",
    "yes",
    "or",
    "show",
    "feed",
    "return",
    "array",
    "def_func"
]);


export const DATA_TYPES = new Set([
    "number",
    "word",
    "decimal"
]);


export const OPERATORS = {
    // Unary Operators
    "++": "increment",
    "--": "decrement",

    // Relational Operators
    "<=": "<=",
    ">=": ">=",
    "!=": "!=",
    "==": "==",

    // Logical Operators
    "&&": "&&",
    "||": "||",

    // Arithmetic Operators
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    "%": "%",

    // Relational Operators (single char)
    "<": "<",
    ">": ">",

    // Logical Operator
    "!": "!",

    // Assignment Operator
    "=": "="
};


export const SPECIAL_CHARACTERS = {
    "[": "[",
    "]": "]",
    "(": "(",
    ")": ")",
    ",": ",",
    ";": ";",
    ".": ".",
    "_": "_",
    '"': '"'
};


export const INVALID_OPERATORS = new Set([
    ":=",
    "**"
]);