const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

export function evalFormula(formula: string, vars: Record<string, number>): number {
  const tokens: string[] = [];
  const matcher = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|([+*/()-]))/y;
  let index = 0;
  while (index < formula.length) {
    if (formula.slice(index).trim() === '') break;
    matcher.lastIndex = index;
    const match = matcher.exec(formula);
    if (!match) throw new Error('Công thức báo giá không hợp lệ.');
    tokens.push((match[1] || match[2] || match[3])!);
    index = matcher.lastIndex;
  }
  const output: string[] = [];
  const operators: string[] = [];
  for (const token of tokens) {
    if (/^\d/.test(token) || /^[A-Za-z_]/.test(token)) output.push(token);
    else if (token === '(') operators.push(token);
    else if (token === ')') {
      while (operators.length && operators.at(-1) !== '(') output.push(operators.pop()!);
      if (operators.pop() !== '(') throw new Error('Công thức báo giá không hợp lệ.');
    } else {
      while (operators.length && operators.at(-1) !== '(' && precedence[operators.at(-1)!] >= precedence[token]) output.push(operators.pop()!);
      operators.push(token);
    }
  }
  while (operators.length) {
    const operator = operators.pop()!;
    if (operator === '(') throw new Error('Công thức báo giá không hợp lệ.');
    output.push(operator);
  }
  const stack: number[] = [];
  for (const token of output) {
    if (token in precedence) {
      const right = stack.pop();
      const left = stack.pop();
      if (left === undefined || right === undefined || (token === '/' && right === 0)) throw new Error('Công thức báo giá không hợp lệ.');
      stack.push(token === '+' ? left + right : token === '-' ? left - right : token === '*' ? left * right : left / right);
    } else if (/^\d/.test(token)) stack.push(Number(token));
    else {
      if (!Object.prototype.hasOwnProperty.call(vars, token)) throw new Error(`Thiếu biến ${token}.`);
      stack.push(vars[token]);
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) throw new Error('Công thức báo giá không hợp lệ.');
  return stack[0];
}
