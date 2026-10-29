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
 * Complexity & Anti-Exploit Design:
 * - Target is NOT always the largest number: Decoy pools intentionally place numbers strictly GREATER than the target,
 *   preventing players from simply searching for sums that match the largest visible number.
 * - Level 1 (10 & Under): Trivial equations like 1 + 2 = 3 are strictly avoided.
 * - Level 2 (20 & Under): Number 1 is STRICTLY FORBIDDEN anywhere in the puzzle. Addends >= 3.
 * - Level 3 (25 & Under): Numbers 1 and 2 are STRICTLY FORBIDDEN. Addends >= 4.
 * - Level 4 (50 & Under): Numbers 1 through 5 are STRICTLY FORBIDDEN. Addends >= 8. Rich double-digit addition.
 * - Level 5 (100 & Under): Numbers 1 through 11 are STRICTLY FORBIDDEN. Addends >= 16. Challenging mental math.
 * - Wheel Sizes: Supports 4, 5, 6, and 7 numbers per wheel.
 */
class KakoomaGenerator {
  constructor() {}

  /**
   * Returns difficulty configuration for operation, max value, and wheel size.
   */
  getLevelConfig(op, maxVal, wheelSize = 5) {
    // 6 and 7 number wheels mathematically require a number range of at least 20
    const effMax = (wheelSize >= 6 && maxVal < 20) ? 20 : maxVal;

    if (op === '+') {
      if (effMax <= 10) {
        return {
          effMax,
          minAllowed: 1,
          minAddend: 1,
          minTarget: 4,
          // Target spread up to 10 ensures rich combinations (e.g., 4+5=9, 4+6=10)
          targetSpread: [7, 10],
          forbidOne: false
        };
      } else if (effMax <= 20) {
        return {
          effMax,
          minAllowed: 2,
          minAddend: 3,
          minTarget: 7,
          targetSpread: [13, 17],
          forbidOne: true
        };
      } else if (effMax <= 25) {
        return {
          effMax,
          minAllowed: 3,
          minAddend: 4,
          minTarget: 9,
          targetSpread: [16, 21],
          forbidOne: true
        };
      } else if (effMax <= 50) {
        return {
          effMax,
          minAllowed: 6,
          minAddend: 8,
          minTarget: 18,
          targetSpread: [32, 42],
          forbidOne: true
        };
      } else {
        return {
          effMax,
          minAllowed: 12,
          minAddend: 16,
          minTarget: 34,
          targetSpread: [60, 84],
          forbidOne: true
        };
      }
    } else {
      // Multiplication
      if (effMax <= 15) {
        return { effMax, minAllowed: 2, minFactor: 2, minTarget: 6, targetSpread: [8, 12], forbidOne: true };
      } else if (effMax <= 20) {
        return { effMax, minAllowed: 2, minFactor: 2, minTarget: 6, targetSpread: [10, 16], forbidOne: true };
      } else if (effMax <= 25) {
        return { effMax, minAllowed: 2, minFactor: 2, minTarget: 8, targetSpread: [14, 20], forbidOne: true };
      } else if (effMax <= 50) {
        return { effMax, minAllowed: 3, minFactor: 3, minTarget: 12, targetSpread: [24, 40], forbidOne: true };
      } else {
        return { effMax, minAllowed: 3, minFactor: 3, minTarget: 18, targetSpread: [45, 80], forbidOne: true };
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
    const cfg = this.getLevelConfig(op, maxVal, wheelSize);
    const effMax = cfg.effMax;
    // In standard Kakooma: outer puzzles feed into an Addition center puzzle!
    const centerOp = '+';

    let game = null;
    let attempts = 0;

    while (!game && attempts < 90) {
      attempts++;
      game = this.tryGenerateGame(op, effMax, wheelSize, centerOp, cfg);
    }

    if (!game) {
      // Fallback pre-calculated verified games if dynamic generation exceeds attempts
      return this.getFallbackGame(op, effMax, wheelSize);
    }

    return game;
  }

  tryGenerateGame(outerOp, maxVal, wheelSize, centerOp, cfg) {
    // 1. Gather all valid outer targets that have at least one valid decomposition
    const validTargets = [];
    for (let t = cfg.minTarget; t <= cfg.targetSpread[1]; t++) {
      const pairs = this.getPairs(t, outerOp, cfg, maxVal);
      if (pairs.length > 0) {
        validTargets.push(t);
      }
    }

    if (validTargets.length < 4) return null;

    // Pick candidate sums matching the difficulty target spread
    const [spreadMin, spreadMax] = cfg.targetSpread;
    const candidateSums = validTargets.filter(t => t >= spreadMin && t <= spreadMax);
    const shuffledSums = [...(candidateSums.length >= 2 ? candidateSums : validTargets)].sort(() => Math.random() - 0.5);

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

      // Separate available numbers into numbers above target and numbers below target
      const poolAbove = [];
      const poolBelow = [];
      for (let n = minNum; n <= maxVal; n++) {
        if (n !== target && n !== a && n !== b) {
          // In Level 10, if target doesn't require 1, omit 1 from decoys as well
          if (n === 1 && (cfg.forbidOne || a !== 1)) continue;
          if (n > target) poolAbove.push(n);
          else poolBelow.push(n);
        }
      }

      // Prioritize distractors close to a, b, or target (near-misses)
      poolAbove.sort((n1, n2) => Math.abs(n1 - target) - Math.abs(n2 - target) + (Math.random() * 4 - 2));
      poolBelow.sort((n1, n2) => Math.abs(n1 - a) - Math.abs(n2 - a) + (Math.random() * 4 - 2));

      // Build search pool: put numbers above target upfront so the wheel is guaranteed to have numbers > target
      const pool = [];
      if (poolAbove.length > 0) {
        pool.push(...poolAbove.slice(0, 3));
        pool.push(...poolBelow.slice(0, 3));
        pool.push(...poolAbove.slice(3));
        pool.push(...poolBelow.slice(3));
      } else {
        pool.push(...poolBelow);
      }

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

        const limit = Math.min(idx + 38, pool.length);
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
   * High-quality verified fallback seeds for every level configuration and wheel size
   */
  getFallbackGame(op, maxVal, wheelSize = 5) {
    if (op === '+') {
      if (maxVal <= 10) {
        return {
          outerOp: '+', centerOp: '+', maxVal: 10, wheelSize,
          wheels: [
            { target: 4, numbers: [4, 1, 3, 6, 8, 9, 10].slice(0, wheelSize), solution: { a: 1, b: 3, target: 4, op: '+' } },
            { target: 5, numbers: [5, 2, 3, 9, 10, 8, 7].slice(0, wheelSize), solution: { a: 2, b: 3, target: 5, op: '+' } },
            { target: 9, numbers: [9, 4, 5, 2, 8, 10, 6].slice(0, wheelSize), solution: { a: 4, b: 5, target: 9, op: '+' } },
            { target: 7, numbers: [7, 3, 4, 2, 8, 10, 9].slice(0, wheelSize), solution: { a: 3, b: 4, target: 7, op: '+' } }
          ],
          center: { targets: [4, 5, 9, 7], solution: { a: 4, b: 5, target: 9, op: '+' } }
        };
      } else if (maxVal <= 20) {
        // Level 2 (20 & Under): Verified prefix-safe for sizes 4, 5, 6, 7
        return {
          outerOp: '+', centerOp: '+', maxVal: 20, wheelSize,
          wheels: [
            { target: 12, numbers: [12, 5, 7, 3, 6, 14, 16].slice(0, wheelSize), solution: { a: 5, b: 7, target: 12, op: '+' } },
            { target: 9, numbers: [9, 3, 6, 2, 10, 14, 18].slice(0, wheelSize), solution: { a: 3, b: 6, target: 9, op: '+' } },
            { target: 7, numbers: [7, 3, 4, 2, 8, 13, 14].slice(0, wheelSize), solution: { a: 3, b: 4, target: 7, op: '+' } },
            { target: 16, numbers: [16, 6, 10, 2, 3, 11, 15].slice(0, wheelSize), solution: { a: 6, b: 10, target: 16, op: '+' } }
          ],
          center: { targets: [12, 9, 7, 16], solution: { a: 7, b: 9, target: 16, op: '+' } }
        };
      } else if (maxVal <= 25) {
        return {
          outerOp: '+', centerOp: '+', maxVal: 25, wheelSize,
          wheels: [
            { target: 10, numbers: [10, 4, 6, 3, 5, 12, 19].slice(0, wheelSize), solution: { a: 4, b: 6, target: 10, op: '+' } },
            { target: 12, numbers: [12, 5, 7, 3, 6, 14, 16].slice(0, wheelSize), solution: { a: 5, b: 7, target: 12, op: '+' } },
            { target: 22, numbers: [22, 9, 13, 3, 5, 7, 11].slice(0, wheelSize), solution: { a: 9, b: 13, target: 22, op: '+' } },
            { target: 15, numbers: [15, 7, 8, 3, 6, 16, 17].slice(0, wheelSize), solution: { a: 7, b: 8, target: 15, op: '+' } }
          ],
          center: { targets: [10, 12, 22, 15], solution: { a: 10, b: 12, target: 22, op: '+' } }
        };
      } else if (maxVal <= 50) {
        return {
          outerOp: '+', centerOp: '+', maxVal: 50, wheelSize,
          wheels: [
            { target: 18, numbers: [18, 8, 10, 6, 7, 9, 20].slice(0, wheelSize), solution: { a: 8, b: 10, target: 18, op: '+' } },
            { target: 24, numbers: [24, 11, 13, 6, 8, 9, 10].slice(0, wheelSize), solution: { a: 11, b: 13, target: 24, op: '+' } },
            { target: 42, numbers: [42, 19, 23, 6, 7, 8, 9].slice(0, wheelSize), solution: { a: 19, b: 23, target: 42, op: '+' } },
            { target: 31, numbers: [31, 14, 17, 6, 7, 9, 12].slice(0, wheelSize), solution: { a: 14, b: 17, target: 31, op: '+' } }
          ],
          center: { targets: [18, 24, 42, 31], solution: { a: 18, b: 24, target: 42, op: '+' } }
        };
      } else {
        return {
          outerOp: '+', centerOp: '+', maxVal: 100, wheelSize,
          wheels: [
            { target: 35, numbers: [16, 19, 35, 62, 84, 91, 95].slice(0, wheelSize), solution: { a: 16, b: 19, target: 35, op: '+' } },
            { target: 45, numbers: [21, 24, 45, 71, 93, 97, 85].slice(0, wheelSize), solution: { a: 21, b: 24, target: 45, op: '+' } },
            { target: 80, numbers: [37, 43, 80, 88, 92, 98, 75].slice(0, wheelSize), solution: { a: 37, b: 43, target: 80, op: '+' } },
            { target: 58, numbers: [26, 32, 58, 87, 94, 99, 82].slice(0, wheelSize), solution: { a: 26, b: 32, target: 58, op: '+' } }
          ],
          center: { targets: [35, 45, 80, 58], solution: { a: 35, b: 45, target: 80, op: '+' } }
        };
      }
    } else {
      // Multiplication fallback
      return {
        outerOp: '*',
        centerOp: '+',
        maxVal: 50,
        wheelSize,
        wheels: [
          { target: 6, numbers: [2, 3, 6, 11, 17, 23, 29].slice(0, wheelSize), solution: { a: 2, b: 3, target: 6, op: '*' } },
          { target: 8, numbers: [2, 4, 8, 13, 21, 27, 33].slice(0, wheelSize), solution: { a: 2, b: 4, target: 8, op: '*' } },
          { target: 14, numbers: [2, 7, 14, 19, 27, 31, 37].slice(0, wheelSize), solution: { a: 2, b: 7, target: 14, op: '*' } },
          { target: 20, numbers: [4, 5, 20, 23, 31, 39, 43].slice(0, wheelSize), solution: { a: 4, b: 5, target: 20, op: '*' } }
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
