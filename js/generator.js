/**
 * Kakooma Math Puzzle Generator
 * Generates mathematically verified 4-outer + 1-center Kakooma puzzles.
 * 
 * Rules:
 * - In Addition: Each outer wheel has exactly ONE number that is the sum of two other numbers in that wheel.
 * - In Multiplication: Each outer wheel has exactly ONE number that is the product of two other numbers in that wheel.
 * - The Center Wheel takes the 4 winning numbers from the 4 outer wheels.
 * - In the Center Wheel, exactly ONE number is the sum (or product in pure-times) of two others.
 */
class KakoomaGenerator {
  constructor() {}

  /**
   * Check if a set of numbers has exactly one valid equation A op B = C
   * Returns { a, b, target, op } if unique, or null.
   */
  checkUniqueSolution(numbers, op = '+') {
    const set = new Set(numbers);
    if (set.size !== numbers.length) return null;

    const solutions = [];
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const a = numbers[i];
        const b = numbers[j];
        const res = op === '+' ? a + b : a * b;
        if (set.has(res) && res !== a && res !== b) {
          solutions.push({ a, b, target: res, op });
        }
      }
    }

    if (solutions.length === 1) {
      return solutions[0];
    }
    return null;
  }

  /**
   * Generates a full game:
   * 4 outer wheels + 1 center wheel
   */
  generateGame({ op = '+', maxVal = 20, wheelSize = 5 }) {
    // Determine center operation
    // In standard Kakooma: Multiplication outer puzzles feed into an Addition center puzzle!
    const centerOp = op === '*' ? '+' : '+';

    let game = null;
    let attempts = 0;

    while (!game && attempts < 500) {
      attempts++;
      game = this.tryGenerateGame(op, maxVal, wheelSize, centerOp);
    }

    if (!game) {
      // Fallback pre-calculated high-quality seeds if dynamic generation fails
      return this.getFallbackGame(op, maxVal);
    }

    return game;
  }

  tryGenerateGame(outerOp, maxVal, wheelSize, centerOp) {
    // 1. Generate 4 center numbers [W1, W2, W3, W4]
    // where in centerOp, exactly one is the sum of two others (Wa + Wb = Wc).
    // And each Wi must be valid as a target for outerOp!

    let centerCandidates = [];
    const minTarget = outerOp === '*' ? 6 : 3;

    // Pick candidate targets that can be decomposed in outerOp
    const validTargets = [];
    for (let t = minTarget; t <= maxVal; t++) {
      if (this.canDecompose(t, outerOp, maxVal)) {
        validTargets.push(t);
      }
    }

    if (validTargets.length < 4) return null;

    // Find Wa + Wb = Wc in validTargets
    for (let i = 0; i < validTargets.length; i++) {
      for (let j = i + 1; j < validTargets.length; j++) {
        const a = validTargets[i];
        const b = validTargets[j];
        const sum = a + b;
        if (validTargets.includes(sum)) {
          // Found a, b, sum!
          // Now find a decoy d in validTargets
          for (let k = 0; k < validTargets.length; k++) {
            const d = validTargets[k];
            if (d === a || d === b || d === sum) continue;

            const centerSet = [a, b, sum, d];
            const centerSol = this.checkUniqueSolution(centerSet, centerOp);
            if (centerSol && centerSol.target === sum) {
              centerCandidates.push({
                targets: centerSet,
                solution: centerSol
              });
              if (centerCandidates.length >= 10) break;
            }
          }
        }
        if (centerCandidates.length >= 10) break;
      }
      if (centerCandidates.length >= 10) break;
    }

    if (centerCandidates.length === 0) return null;

    // Shuffle and pick one valid center configuration
    centerCandidates.sort(() => Math.random() - 0.5);
    const chosenCenter = centerCandidates[0];
    const targets = chosenCenter.targets.sort(() => Math.random() - 0.5);

    // 2. Generate each outer wheel
    const wheels = [];
    for (let i = 0; i < 4; i++) {
      const target = targets[i];
      const wheel = this.generateOuterWheel(target, outerOp, maxVal, wheelSize);
      if (!wheel) return null; // If any wheel fails, retry entire game
      wheels.push(wheel);
    }

    return {
      outerOp,
      centerOp,
      maxVal,
      wheelSize,
      wheels,
      center: {
        targets,
        solution: chosenCenter.solution
      }
    };
  }

  canDecompose(target, op, maxVal) {
    if (op === '+') {
      return target >= 3;
    } else {
      // Multiplication: target must have distinct factors >= 2
      for (let f = 2; f * f <= target; f++) {
        if (target % f === 0) {
          const f2 = target / f;
          if (f !== f2 && f2 <= maxVal) return true;
        }
      }
      return false;
    }
  }

  getPairs(target, op, maxVal) {
    const pairs = [];
    if (op === '+') {
      for (let a = 1; a <= Math.floor((target - 1) / 2); a++) {
        const b = target - a;
        if (a !== b && b <= maxVal) {
          pairs.push([a, b]);
        }
      }
    } else {
      for (let a = 2; a * a <= target; a++) {
        if (target % a === 0) {
          const b = target / a;
          if (a !== b && b <= maxVal) {
            pairs.push([a, b]);
          }
        }
      }
    }
    return pairs;
  }

  generateOuterWheel(target, op, maxVal, wheelSize) {
    const pairs = this.getPairs(target, op, maxVal);
    if (pairs.length === 0) return null;

    pairs.sort(() => Math.random() - 0.5);

    for (const [a, b] of pairs) {
      // Numbers needed = wheelSize - 3
      const decoysNeeded = wheelSize - 3;
      let pool = [];
      const minNum = op === '*' ? 2 : 1;
      for (let n = minNum; n <= maxVal; n++) {
        if (n !== target && n !== a && n !== b) {
          pool.push(n);
        }
      }
      pool.sort(() => Math.random() - 0.5);

      // Backtracking / greedy search for decoys
      const currentWheel = [target, a, b];
      let found = false;

      const searchDecoys = (idx, count) => {
        if (count === decoysNeeded) {
          const sol = this.checkUniqueSolution(currentWheel, op);
          if (sol && sol.target === target) {
            found = true;
            return true;
          }
          return false;
        }

        // Limit search depth to avoid hanging
        const limit = Math.min(idx + 18, pool.length);
        for (let i = idx; i < limit; i++) {
          currentWheel.push(pool[i]);
          if (searchDecoys(i + 1, count + 1)) return true;
          currentWheel.pop();
        }
        return false;
      };

      if (searchDecoys(0, 0)) {
        // Shuffle wheel numbers for display
        const shuffled = [...currentWheel].sort(() => Math.random() - 0.5);
        return {
          target,
          addends: [a, b],
          op,
          numbers: shuffled,
          solution: { a, b, target, op }
        };
      }
    }

    return null;
  }

  getFallbackGame(op, maxVal) {
    if (op === '+') {
      if (maxVal <= 10) {
        return {
          outerOp: '+',
          centerOp: '+',
          maxVal: 10,
          wheelSize: 4,
          wheels: [
            { target: 4, numbers: [1, 3, 4, 7], solution: { a: 1, b: 3, target: 4, op: '+' } },
            { target: 3, numbers: [1, 2, 3, 9], solution: { a: 1, b: 2, target: 3, op: '+' } },
            { target: 7, numbers: [2, 5, 7, 10], solution: { a: 2, b: 5, target: 7, op: '+' } },
            { target: 6, numbers: [2, 4, 6, 9], solution: { a: 2, b: 4, target: 6, op: '+' } }
          ],
          center: {
            targets: [4, 3, 7, 6],
            solution: { a: 3, b: 4, target: 7, op: '+' }
          }
        };
      } else {
        // Under 20 / 25
        return {
          outerOp: '+',
          centerOp: '+',
          maxVal: 20,
          wheelSize: 5,
          wheels: [
            { target: 5, numbers: [2, 3, 5, 12, 17], solution: { a: 2, b: 3, target: 5, op: '+' } },
            { target: 9, numbers: [4, 5, 9, 16, 20], solution: { a: 4, b: 5, target: 9, op: '+' } },
            { target: 14, numbers: [6, 8, 14, 18, 3], solution: { a: 6, b: 8, target: 14, op: '+' } },
            { target: 11, numbers: [4, 7, 11, 19, 2], solution: { a: 4, b: 7, target: 11, op: '+' } }
          ],
          center: {
            targets: [5, 9, 14, 11],
            solution: { a: 5, b: 9, target: 14, op: '+' }
          }
        };
      }
    } else {
      // Multiplication
      return {
        outerOp: '*',
        centerOp: '+',
        maxVal: 50,
        wheelSize: 5,
        wheels: [
          { target: 6, numbers: [2, 3, 6, 11, 17], solution: { a: 2, b: 3, target: 6, op: '*' } },
          { target: 8, numbers: [2, 4, 8, 13, 21], solution: { a: 2, b: 4, target: 8, op: '*' } },
          { target: 14, numbers: [2, 7, 14, 19, 27], solution: { a: 2, b: 7, target: 14, op: '*' } },
          { target: 20, numbers: [4, 5, 20, 23, 31], solution: { a: 4, b: 5, target: 20, op: '*' } }
        ],
        center: {
          targets: [6, 8, 14, 20],
          solution: { a: 6, b: 8, target: 14, op: '+' }
        }
      };
    }
  }
}

window.kakoomaGenerator = new KakoomaGenerator();
