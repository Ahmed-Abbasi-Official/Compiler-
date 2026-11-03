// One node of the parse tree.
// Non-terminal: name = "Stmt", "Expr" ...  (has children)
// Terminal:     name = token kind ("ID", ";", "launch" ...) + lexeme + line
export default class TreeNode {

    constructor(name, lexeme = null, line = null) {

        this.name = name;
        this.lexeme = lexeme;
        this.line = line;
        this.children = [];

    }


    add(...nodes) {

        this.children.push(...nodes);

        return this;

    }


    label() {

        if (this.lexeme === null || this.lexeme === this.name) {
            return this.name;
        }

        return `${this.name} (${this.lexeme})`;

    }


    // Print the tree with ├── └── lines
    print(prefix = "", isLast = true, isRoot = true) {

        const connector = isRoot ? "" : (isLast ? "└── " : "├── ");
        const lines = [prefix + connector + this.label()];

        const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");

        this.children.forEach((child, i) => {
            lines.push(
                child.print(childPrefix, i === this.children.length - 1, false)
            );
        });

        return lines.join("\n");

    }

}


// ε (epsilon) leaf: the rule produced the empty string
export function epsilon() {

    return new TreeNode("ε");

}
