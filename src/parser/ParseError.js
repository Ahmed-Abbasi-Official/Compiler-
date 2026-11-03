// A syntax error found by the parser
export default class ParseError extends Error {

    constructor(line, expected, found) {

        super(`Line ${line}: expected ${expected} but found ${found}`);

        this.line = line;
        this.expected = expected;
        this.found = found;

    }

}
