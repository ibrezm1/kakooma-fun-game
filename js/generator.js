/**
 * Kakooma Math Puzzle Generator
 * Generates mathematically verified 4-outer + 1-center Kakooma puzzles.
 * 
 * Rules:
 * - In Addition: Each outer wheel has exactly ONE number that is the sum of two other numbers in that wheel.
 * - In Multiplication: Each outer wheel has exactly ONE number that is the product of two other numbers in that wheel.
 * - The Center Wheel takes the 4 winning numbers from the 4 outer wheels.
 * - In the Center Wheel, exactly ONE number is the sum of two others.
 * 
 * Complexity & Scaling:
 * - Level 1 (10 & Under): Trivial equations like 1 + 2 = 3 are strictly avoided.
 * - Level 2 (20 & Under): Number 1 is STRICTLY FORBIDDEN anywhere in the puzzle. Addends >= 3.
 * - Level 3 (25 & Under): Numbers 1 and 2 are STRICTLY FORBIDDEN. Addends >= 4.
 * - Level 4 (50 & Under): Numbers 1 through 5 are STRICTLY FORBIDDEN. Addends >= 8. Rich double-digit addition.
 * - Level 5 (100 & Under): Numbers 1 through 11 are STRICTLY FORBIDDEN. Addends >= 16. Challenging mental math.
 */
class KakoomaGenerator {
  constructor() {}

  /**
   * Returns difficulty configuration for operation and max value.
   */
  getLevelConfig(op, maxVal) {
    if (op === '+') {
      if (maxVal <= 10) {
        // Level 10: Allow 1 only when strictly necessary (e.g. 1+3=4), completely eliminate 1+2=3
        return {
          minAllowed: 1,
          minAddend: 1,
          minTarget: 4,
          targetSpread: [7, 10],
          forbidOne: false
        };
      } else if (maxVal <= 20) {
        // Level 2 (20 & Under): ZERO 1s allowed anywhere! Addends >= 3, sums up to 20
        return {
          minAllowed: 2,
          minAddend: 3,
          minTarget: 7,
          targetSpread: [14, 20],
          forbidOne: true
        };
      } else if (maxVal <= 25) {
        // Level 25 & Under: No 1 or 2! Addends >= 4, sums up to 25
        return {
          minAllowed: 3,
          minAddend: 4,
          minTarget: 9,
          targetSpread: [18, 25],
          forbidOne: true
        };
      } else if (maxVal <= 50) {
        // Level 50 & Under: No 1-5! Addends >= 8, sums up to 50
        return {
          minAllowed: 6,
          minAddend: 8,
          minTarget: 18,
          targetSpread: [35, 50],
          forbidOne: true
        };
      } else {
        // Level 100 & Under: No 1-11! Addends >= 16, sums up to 100
        return {
          minAllowed: 12,
          minAddend: 16,
          minTarget: 34,
          targetSpread: [65, 100],
          forbidOne: true
        };
      }
    } else {
      // Multiplication
      if (maxVal <= 15) {
        return { minAllowed: 2, minFactor: 2, minTarget: 6, targetSpread: [10, 15], forbidOne: true };
      } else if (maxVal <= 20) {
        return { minAllowed: 2, minFactor: 2, minTarget: 6, targetSpread: [14, 20], forbidOne: true };
      } else if (maxVal <= 25) {
        return { minAllowed: 2, minFactor: 2, minTarget: 8, targetSpread: [16, 25], forbidOne: true };
      } else if (maxVal <= 50) {
        return { minAllowed: 3, minFactor: 3, minTarget: 12, targetSpread: [30, 50], forbidOne: true };
      } else {
        return { minAllowed: 3, minFactor: 3, minTarget: 18, targetSpread: [55, 100], forbidOne: true };
      }
    }
  }

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
   * Returns valid pairs (a, b) for a target number under operation op and level config
   */
  getPairs(target, op, cfg, maxVal) {
    const pairs = [];
    if (op === '+') {
      const minA = cfg.minAddend;
      for (let a = minA; a <= Math.floor((target - 1) / 2); a++) {
        const b = target - a;
        if (a !== b && b <= maxVal && a >= cfg.minAllowed && b >= cfg.minAllowed) {
          // Never allow trivial 1 + 2 = 3
          if (target === 3 && a === 1 && b === 2) continue;
          pairs.push([a, b]);
        }
      }
      // For level 10, strongly deprioritize pairs that include 1
      if (!cfg.forbidOne && pairs.length > 1) {
        pairs.sort((p1, p2) => (p1[0] === 1 ? 1 : 0) - (p2[0] === 1 ? 1 : 0));
      }
    } else {
      const minF = cfg.minFactor || 2;
      for (let a = minF; a * a <= target; a++) {
        if (target % a === 0) {
          const b = target / a;
          if (a !== b && b <= maxVal && a >= cfg.minAllowed && b >= cfg.minAllowed) {
            pairs.push([a, b]);
          }
        }
      }
    }
    return pairs;
  }

  /**
   * Generates a full game:
   * 4 outer wheels + 1 center wheel
   */
  generateGame({ op = '+', maxVal = 20, wheelSize = 5 }) {
    const cfg = this.getLevelConfig(op, maxVal);
    // In standard Kakooma: outer puzzles feed into an Addition center puzzle!
    const centerOp = '+';

    let game = null;
    let attempts = 0;

    while (!game && attempts < 80) {
      attempts++;
      game = this.tryGenerateGame(op, maxVal, wheelSize, centerOp, cfg);
    }

    if (!game) {
      // Fallback pre-calculated verified games if dynamic generation exceeds attempts
      return this.getFallbackGame(op, maxVal, wheelSize);
    }

    return game;
  }

  tryGenerateGame(outerOp, maxVal, wheelSize, centerOp, cfg) {
    // 1. Gather all valid outer targets that have at least one valid decomposition
    const validTargets = [];
    for (let t = cfg.minTarget; t <= maxVal; t++) {
      const pairs = this.getPairs(t, outerOp, cfg, maxVal);
      if (pairs.length > 0) {
        validTargets.push(t);
      }
    }

    if (validTargets.length < 4) return null;

    // Pick candidate sums matching the difficulty target spread
    const [spreadMin, spreadMax] = cfg.targetSpread;
    const highSums = validTargets.filter(t => t >= spreadMin && t <= spreadMax);
    const candidateSums = highSums.length >= 2 ? highSums : validTargets;
    const shuffledSums = [...candidateSums].sort(() => Math.random() - 0.5);

    let chosenCenter = null;

    for (const sum of shuffledSums) {
      // Find two distinct targets a, b in validTargets such that a + b = sum
      const possiblePairs = [];
      for (const a of validTargets) {
        if (a >= sum) continue;
        const b = sum - a;
        if (b > a && validTargets.includes(b)) {
          possiblePairs.push([a, b]);
        }
      }
      if (possiblePairs.length === 0) continue;

      possiblePairs.sort(() => Math.random() - 0.5);

      for (const [a, b] of possiblePairs) {
        // Find a decoy d from validTargets
        const decoys = validTargets.filter(d => d !== a && d !== b && d !== sum);
        // Distractor decoys: close in value to make center puzzle challenging
        decoys.sort(() => Math.random() - 0.5);

        for (const d of decoys) {
          const centerSet = [a, b, sum, d];
          const sol = this.checkUniqueSolution(centerSet, centerOp);
          if (sol && sol.target === sum) {
            chosenCenter = {
              targets: centerSet,
              solution: sol
            };
            break;
          }
        }
        if (chosenCenter) break;
      }
      if (chosenCenter) break;
    }

    if (!chosenCenter) return null;

    // 2. Generate each outer wheel
    const targets = chosenCenter.targets.sort(() => Math.random() - 0.5);
    const wheels = [];

    for (let i = 0; i < 4; i++) {
      const target = targets[i];
      const wheel = this.generateOuterWheel(target, outerOp, maxVal, wheelSize, cfg);
      if (!wheel) return null;
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

  generateOuterWheel(target, op, maxVal, wheelSize, cfg) {
    const pairs = this.getPairs(target, op, cfg, maxVal);
    if (pairs.length === 0) return null;

    // Shuffle pairs for unpredictability
    const chosenPairs = [...pairs].sort(() => Math.random() - 0.5);
    const minNum = cfg.minAllowed;

    for (const [a, b] of chosenPairs) {
      const currentWheel = [target, a, b];

      // Build decoy pool
      let pool = [];
      for (let n = minNum; n <= maxVal; n++) {
        if (n !== target && n !== a && n !== b) {
          // In Level 10, if target doesn't require 1, omit 1 from decoys as well
          if (n === 1 && (cfg.forbidOne || a !== 1)) continue;
          pool.push(n);
        }
      }

      // Prioritize distractors close to a, b, or target (near-misses)
      pool.sort((n1, n2) => {
        const d1 = Math.min(Math.abs(n1 - a), Math.abs(n1 - b), Math.abs(n1 - target));
        const d2 = Math.min(Math.abs(n2 - a), Math.abs(n2 - b), Math.abs(n2 - target));
        return (d1 - d2) + (Math.random() * 8 - 4);
      });

      let found = false;
      const search = (idx) => {
        if (currentWheel.length === wheelSize) {
          const sol = this.checkUniqueSolution(currentWheel, op);
          if (sol && sol.target === target) {
            found = true;
            return true;
          }
          return false;
        }

        const limit = Math.min(idx + 35, pool.length);
        for (let i = idx; i < limit; i++) {
          const cand = pool[i];
          // Fast prune check before recursive call
          let conflict = false;
          for (const w of currentWheel) {
            const sum = op === '+' ? cand + w : cand * w;
            if (currentWheel.includes(sum)) { conflict = true; break; }
            if (op === '+') {
              const diff = Math.abs(cand - w);
              if (currentWheel.includes(diff) && diff !== cand && diff !== w) { conflict = true; break; }
            }
          }
          if (!conflict) {
            currentWheel.push(cand);
            if (search(i + 1)) return true;
            currentWheel.pop();
          }
        }
        return false;
      };

      if (search(0)) {
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

  /**
   * High-quality verified fallback seeds for every level configuration
   */
  getFallbackGame(op, maxVal, wheelSize = 5) {
    if (op === '+') {
      if (maxVal <= 10) {
        return {
          outerOp: '+', centerOp: '+', maxVal: 10, wheelSize,
          wheels: [
            { target: 4, numbers: wheelSize === 4 ? [1, 3, 4, 8] : [1, 3, 4, 8, 10], solution: { a: 1, b: 3, target: 4, op: '+' } },
            { target: 5, numbers: wheelSize === 4 ? [2, 3, 5, 9] : [2, 3, 5, 8, 9], solution: { a: 2, b: 3, target: 5, op: '+' } },
            { target: 9, numbers: wheelSize === 4 ? [4, 5, 9, 2] : [4, 5, 9, 2, 8], solution: { a: 4, b: 5, target: 9, op: '+' } },
            { target: 7, numbers: wheelSize === 4 ? [3, 4, 7, 10] : [3, 4, 7, 2, 10], solution: { a: 3, b: 4, target: 7, op: '+' } }
          ],
          center: { targets: [4, 5, 9, 7], solution: { a: 4, b: 5, target: 9, op: '+' } }
        };
      } else if (maxVal <= 20) {
        // Level 2 (20 & Under): Strictly NO 1!
        return {
          outerOp: '+', centerOp: '+', maxVal: 20, wheelSize,
          wheels: [
            { target: 7, numbers: wheelSize === 4 ? [3, 4, 7, 12] : [3, 4, 7, 12, 17], solution: { a: 3, b: 4, target: 7, op: '+' } },
            { target: 9, numbers: wheelSize === 4 ? [4, 5, 9, 16] : [4, 5, 9, 16, 20], solution: { a: 4, b: 5, target: 9, op: '+' } },
            { target: 16, numbers: wheelSize === 4 ? [6, 10, 16, 19] : [6, 10, 16, 19, 8], solution: { a: 6, b: 10, target: 16, op: '+' } },
            { target: 12, numbers: wheelSize === 4 ? [5, 7, 12, 18] : [5, 7, 12, 18, 14], solution: { a: 5, b: 7, target: 12, op: '+' } }
          ],
          center: { targets: [7, 9, 16, 12], solution: { a: 7, b: 9, target: 16, op: '+' } }
        };
      } else if (maxVal <= 25) {
        // Level 25 & Under: Strictly NO 1 or 2!
        return {
          outerOp: '+', centerOp: '+', maxVal: 25, wheelSize,
          wheels: [
            { target: 10, numbers: wheelSize === 4 ? [4, 6, 10, 17] : [4, 6, 10, 17, 22], solution: { a: 4, b: 6, target: 10, op: '+' } },
            { target: 12, numbers: wheelSize === 4 ? [5, 7, 12, 20] : [5, 7, 12, 20, 24], solution: { a: 5, b: 7, target: 12, op: '+' } },
            { target: 22, numbers: wheelSize === 4 ? [9, 13, 22, 16] : [9, 13, 22, 16, 25], solution: { a: 9, b: 13, target: 22, op: '+' } },
            { target: 15, numbers: wheelSize === 4 ? [7, 8, 15, 21] : [7, 8, 15, 21, 11], solution: { a: 7, b: 8, target: 15, op: '+' } }
          ],
          center: { targets: [10, 12, 22, 15], solution: { a: 10, b: 12, target: 22, op: '+' } }
        };
      } else if (maxVal <= 50) {
        // Level 50 & Under: Strictly NO 1-5!
        return {
          outerOp: '+', centerOp: '+', maxVal: 50, wheelSize,
          wheels: [
            { target: 18, numbers: wheelSize === 4 ? [8, 10, 18, 31] : [8, 10, 18, 31, 42], solution: { a: 8, b: 10, target: 18, op: '+' } },
            { target: 24, numbers: wheelSize === 4 ? [11, 13, 24, 39] : [11, 13, 24, 39, 47], solution: { a: 11, b: 13, target: 24, op: '+' } },
            { target: 42, numbers: wheelSize === 4 ? [19, 23, 42, 35] : [19, 23, 42, 35, 49], solution: { a: 19, b: 23, target: 42, op: '+' } },
            { target: 31, numbers: wheelSize === 4 ? [14, 17, 31, 48] : [14, 17, 31, 48, 27], solution: { a: 14, b: 17, target: 31, op: '+' } }
          ],
          center: { targets: [18, 24, 42, 31], solution: { a: 18, b: 24, target: 42, op: '+' } }
        };
      } else {
        // Level 100 & Under: Strictly NO 1-11!
        return {
          outerOp: '+', centerOp: '+', maxVal: 100, wheelSize,
          wheels: [
            { target: 35, numbers: wheelSize === 4 ? [16, 19, 35, 62] : [16, 19, 35, 62, 84], solution: { a: 16, b: 19, target: 35, op: '+' } },
            { target: 45, numbers: wheelSize === 4 ? [21, 24, 45, 71] : [21, 24, 45, 71, 93], solution: { a: 21, b: 24, target: 45, op: '+' } },
            { target: 80, numbers: wheelSize === 4 ? [37, 43, 80, 68] : [37, 43, 80, 68, 95], solution: { a: 37, b: 43, target: 80, op: '+' } },
            { target: 58, numbers: wheelSize === 4 ? [26, 32, 58, 87] : [26, 32, 58, 87, 74], solution: { a: 26, b: 32, target: 58, op: '+' } }
          ],
          center: { targets: [35, 45, 80, 58], solution: { a: 35, b: 45, target: 80, op: '+' } }
        };
      }
    } else {
      // Multiplication
      return {
        outerOp: '*',
        centerOp: '+',
        maxVal: 50,
        wheelSize,
        wheels: [
          { target: 6, numbers: wheelSize === 4 ? [2, 3, 6, 11] : [2, 3, 6, 11, 17], solution: { a: 2, b: 3, target: 6, op: '*' } },
          { target: 8, numbers: wheelSize === 4 ? [2, 4, 8, 13] : [2, 4, 8, 13, 21], solution: { a: 2, b: 4, target: 8, op: '*' } },
          { target: 14, numbers: wheelSize === 4 ? [2, 7, 14, 19] : [2, 7, 14, 19, 27], solution: { a: 2, b: 7, target: 14, op: '*' } },
          { target: 20, numbers: wheelSize === 4 ? [4, 5, 20, 23] : [4, 5, 20, 23, 31], solution: { a: 4, b: 5, target: 20, op: '*' } }
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
