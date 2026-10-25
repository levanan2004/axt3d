const functions: Record<string, (args: number[]) => number> = {
  ceil1000: args => {
    if (args.length !== 1 || !Number.isFinite(args[0])) throw new Error('Công thức báo giá không hợp lệ.');
    return Math.ceil(args[0] / 1000) * 1000;
  },
  max: args => {
    if (args.length !== 2 || args.some(item => !Number.isFinite(item))) throw new Error('Công thức báo giá không hợp lệ.');
    return Math.max(args[0], args[1]);
  },
};

/** Evaluate a shop-config formula: + - * / ( ) and the functions the config names. */
export function evalFormula(formula: string, vars: Record<string, number>): number {
  let index = 0;
  const skip = () => { while (formula[index] === ' ') index += 1; };
  const parseExpr = (): number => parseAdd();
  function parseAdd() {
    let left = parseMul();
    skip();
    while (formula[index] === '+' || formula[index] === '-') {
      const operator = formula[index];
      index += 1;
      const right = parseMul();
      left = operator === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseMul() {
    let left = parseUnary();
    skip();
    while (formula[index] === '*' || formula[index] === '/') {
      const operator = formula[index];
      index += 1;
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new Error('Công thức báo giá không hợp lệ.');
      left = operator === '*' ? left * right : left / right;
    }
    return left;
  }
  function parseUnary(): number {
    skip();
    return parsePrimary();
  }
  function parsePrimary(): number {
    skip();
    if (formula[index] === '(') {
      index += 1;
      const value = parseExpr();
      skip();
      if (formula[index] !== ')') throw new Error('Công thức báo giá không hợp lệ.');
      index += 1;
      return value;
    }
    if (/[0-9.]/.test(formula[index] || '')) {
      const start = index;
      while (/[0-9.]/.test(formula[index] || '')) index += 1;
      const value = Number(formula.slice(start, index));
      if (!Number.isFinite(value)) throw new Error('Công thức báo giá không hợp lệ.');
      return value;
    }
    if (/[A-Za-z_]/.test(formula[index] || '')) {
      const start = index;
      while (/[A-Za-z0-9_]/.test(formula[index] || '')) index += 1;
      const name = formula.slice(start, index);
      skip();
      if (formula[index] === '(') {
        index += 1;
        const args: number[] = [];
        skip();
        if (formula[index] !== ')') {
          args.push(parseExpr());
          skip();
          while (formula[index] === ',') {
            index += 1;
            args.push(parseExpr());
            skip();
          }
        }
        if (formula[index] !== ')') throw new Error('Công thức báo giá không hợp lệ.');
        index += 1;
        const fn = functions[name];
        if (!fn) throw new Error('Công thức báo giá không hợp lệ.');
        return fn(args);
      }
      if (!Object.prototype.hasOwnProperty.call(vars, name)) throw new Error(`Thiếu biến ${name}.`);
      return vars[name];
    }
    throw new Error('Công thức báo giá không hợp lệ.');
  }
  const value = parseExpr();
  skip();
  if (index !== formula.length || !Number.isFinite(value)) throw new Error('Công thức báo giá không hợp lệ.');
  return value;
}
