import { Tuple, type Value } from "recursive-set";

// =========================================================
// 1. AST DEFINITIONEN (Tuple-Typen ohne Tag-Strings)
// =========================================================

export type VariableName = string;
export type FunctionSymbol = string;
export type PredicateSymbol = string;

// --- TERM TYPES ---
export type VarTerm = Tuple<[VariableName]>;
export type FunTerm = Tuple<[FunctionSymbol, Tuple<Value[]>]>;
export type Term = VarTerm | FunTerm;

// --- FORMULA TYPES ---
export type ConstFormula = Tuple<["true" | "false"]>;

export type NotFormula = Tuple<["¬", Formula]>;

export type BinaryOp = "∧" | "∨" | "→" | "↔";
export type BinaryFormula = Tuple<[BinaryOp, Formula, Formula]>;

export type QuantifierOp = "∀" | "∃";
export type QuantifierFormula = Tuple<[QuantifierOp, VariableName, Formula]>;

export type PredFormula = Tuple<[PredicateSymbol, Tuple<Value[]>]>;

export type Formula =
	| ConstFormula
	| NotFormula
	| BinaryFormula
	| QuantifierFormula
	| PredFormula;

export interface Signature {
	functions: Map<string, number>;
	predicates: Map<string, number>;
}

// =========================================================
// 1.5 TYPE-SAFE FACTORY FUNCTIONS
// =========================================================

export function createVarTerm(name: VariableName): VarTerm {
	return new Tuple(name);
}

export function createFunTerm(symbol: FunctionSymbol, args: Term[]): FunTerm {
	const argsTuple = new Tuple(...args);
	return new Tuple(symbol, argsTuple);
}

export function createPredFormula(
	symbol: PredicateSymbol,
	args: Term[],
): PredFormula {
	const argsTuple = new Tuple(...args);
	return new Tuple(symbol, argsTuple);
}

export function createConstFormula(value: "true" | "false"): ConstFormula {
	return new Tuple(value);
}

export function createNotFormula(operand: Formula): NotFormula {
	return new Tuple("¬", operand);
}

export function createBinaryFormula(
	op: BinaryOp,
	left: Formula,
	right: Formula,
): BinaryFormula {
	return new Tuple(op, left, right);
}

export function createQuantifierFormula(
	op: QuantifierOp,
	varName: VariableName,
	body: Formula,
): QuantifierFormula {
	return new Tuple(op, varName, body);
}

// =========================================================
// 2. TOKENIZER
// =========================================================

function tokenize(s: string): string[] {
	const regex = /\s*(?:([()¬∧∨→↔⊤⊥∀∃,])|([a-zA-Z0-9_]+))/g;
	const tokens: string[] = [];
	let match = regex.exec(s);

	while (match !== null) {
		if (match[1]) tokens.push(match[1]);
		else if (match[2]) tokens.push(match[2]);
		match = regex.exec(s);
	}
	return tokens;
}

// =========================================================
// 3. PARSER CLASS
// =========================================================

export class LogicParser {
	private tokens: string[];
	private pos: number = 0;
	private signature: Signature;

	constructor(input: string, signature: Signature) {
		this.tokens = tokenize(input);
		this.signature = signature;
	}

	private current(): string {
		return this.pos < this.tokens.length ? this.tokens[this.pos] : "EOF";
	}

	private consume(expected?: string): string {
		const token = this.current();
		if (expected && token !== expected) {
			throw new Error(
				`Erwartet: '${expected}', Gefunden: '${token}' an Pos ${this.pos}`,
			);
		}
		this.pos++;
		return token;
	}

	// --- Entry Points ---
	public parseAll(): Formula {
		const f = this.parseImplication();
		if (this.current() !== "EOF") {
			throw new Error(`Unerwartetes Token am Ende: ${this.current()}`);
		}
		return f;
	}

	public parseTermEntry(): Term {
		const t = this.parseTerm();
		if (this.current() !== "EOF") {
			throw new Error(`Unerwartetes Token am Ende: ${this.current()}`);
		}
		return t;
	}

	// --- Recursive Descent ---

	// LEVEL 1: Implikation & Äquivalenz (RECHTS-assoziativ)
	private parseImplication(): Formula {
		const left = this.parseOr();
		const op = this.current();

		if (op === "→") {
			this.consume();
			const right = this.parseImplication();
			return createBinaryFormula("→", left, right);
		} else if (op === "↔") {
			this.consume();
			const right = this.parseImplication();
			return createBinaryFormula("↔", left, right);
		}

		return left;
	}

	// LEVEL 2: Disjunktion (LINKS-assoziativ)
	private parseOr(): Formula {
		let left = this.parseAnd();
		while (this.current() === "∨") {
			this.consume();
			const right = this.parseAnd();
			left = createBinaryFormula("∨", left, right);
		}
		return left;
	}

	// LEVEL 3: Konjunktion (LINKS-assoziativ)
	private parseAnd(): Formula {
		let left = this.parseNot();
		while (this.current() === "∧") {
			this.consume();
			const right = this.parseNot();
			left = createBinaryFormula("∧", left, right);
		}
		return left;
	}

	// LEVEL 4: Negation & Quantoren
	private parseNot(): Formula {
		const token = this.current();

		if (token === "¬") {
			this.consume();
			const operand = this.parseNot();
			return createNotFormula(operand);
		}

		// Quantoren
		if (token === "∀" || token === "∃") {
			const op = token;
			this.consume();

			const varName = this.current();
			if (!/^[a-zA-Z0-9_]+$/.test(varName) || varName === "EOF") {
				throw new Error("Nach Quantor muss eine Variable folgen.");
			}
			this.consume();

			const body = this.parseNot();
			return createQuantifierFormula(op, varName, body);
		}

		return this.parseAtom();
	}

	// LEVEL 5: Atome
	private parseAtom(): Formula {
		const token = this.current();

		// Klammern
		if (token === "(") {
			this.consume();
			const f = this.parseImplication();
			this.consume(")");
			return f;
		}

		// Konstanten
		if (token === "⊤") {
			this.consume();
			return createConstFormula("true");
		}
		if (token === "⊥") {
			this.consume();
			return createConstFormula("false");
		}

		// Prädikat
		const name = token;

		if (this.signature.predicates.has(name)) {
			const expectedArity = this.signature.predicates.get(name);
			this.consume();
			let args: Term[] = [];

			if (this.current() === "(") {
				this.consume();
				if (this.current() !== ")") {
					args = this.parseTermList();
				}
				this.consume(")");
			}

			// Arität prüfen
			if (args.length !== expectedArity) {
				throw new Error(
					`Prädikat '${name}' erwartet ${expectedArity} Argumente, aber ${args.length} gefunden.`,
				);
			}

			return createPredFormula(name, args);
		}

		if (this.signature.functions.has(name)) {
			throw new Error(
				`Symbol '${name}' ist eine Funktion, wird aber als Formel genutzt (Prädikat erwartet).`,
			);
		}

		throw new Error(`Unerwartetes Token oder unbekanntes Prädikat: '${name}'`);
	}

	// --- Term Parsing ---

	private parseTerm(): Term {
		const name = this.current();

		if (!/^[a-zA-Z0-9_]+$/.test(name)) {
			throw new Error(`Ungültiger Term-Start: '${name}'`);
		}
		this.consume();

		// Funktion
		if (this.signature.functions.has(name)) {
			const expectedArity = this.signature.functions.get(name);
			let args: Term[] = [];

			if (this.current() === "(") {
				this.consume();
				if (this.current() !== ")") {
					args = this.parseTermList();
				}
				this.consume(")");
			}

			// Arität prüfen
			if (args.length !== expectedArity) {
				throw new Error(
					`Funktion '${name}' erwartet ${expectedArity} Argumente, aber ${args.length} gefunden.`,
				);
			}

			return createFunTerm(name, args);
		}

		// Prädikat im Term nicht erlaubt
		if (this.signature.predicates.has(name)) {
			throw new Error(
				`Symbol '${name}' ist ein Prädikat, darf nicht im Term stehen.`,
			);
		}

		// Variable
		return createVarTerm(name);
	}

	private parseTermList(): Term[] {
		const args: Term[] = [];
		args.push(this.parseTerm());
		while (this.current() === ",") {
			this.consume();
			args.push(this.parseTerm());
		}
		return args;
	}
}

// =========================================================
// 4. MAIN EXPORTS
// =========================================================

export function parse(input: string, signature: Signature): Formula {
	const parser = new LogicParser(input, signature);
	return parser.parseAll();
}

export function parseTerm(input: string, signature: Signature): Term {
	const parser = new LogicParser(input, signature);
	return parser.parseTermEntry();
}
