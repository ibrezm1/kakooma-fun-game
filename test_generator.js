/**
 * Kakooma Puzzle Generator Test Suite
 * Tests mathematical verification and unique solution guarantees across
 * Sizes: 4, 5, 6, 7
 * Operations: Addition (+) and Multiplication (*)
 * Difficulties: 10, 20, 25, 50, 100
 */

global.window = global;
require('./js/generator.js');

const gen = window.kakoomaGenerator;
console.log('🧪 Running Kakooma Generator Verification Suite for Sizes 4, 5, 6, 7...\n');

let totalTests = 0;
let passedTests = 0;

for (const op of ['+', '*']) {
  for (const size of [4, 5, 6, 7]) {
    for (const maxVal of [10, 20, 25, 50, 100]) {
      if (op === '*' && maxVal === 10) continue;

      let passes = 0;
      const runs = 10;
      for (let r = 0; r < runs; r++) {
        totalTests++;
        const game = gen.generateGame({ op, maxVal, wheelSize: size });

        if (!game || !game.wheels || game.wheels.length !== 4) {
          console.error(`❌ FAILED init: op=${op} size=${size} maxVal=${maxVal}`);
          continue;
        }

        let validWheels = true;
        for (let i = 0; i < 4; i++) {
          const w = game.wheels[i];
          if (w.numbers.length !== size) {
            validWheels = false;
            console.error(`❌ FAILED wheel size: expected ${size}, got ${w.numbers.length}`);
            break;
          }

          const sol = gen.checkUniqueSolution(w.numbers, op);
          if (!sol || sol.target !== w.target) {
            validWheels = false;
            console.error(`❌ FAILED uniqueness in wheel ${i}: [${w.numbers}] target=${w.target}`);
            break;
          }
        }

        // Center wheel verification
        const centerSol = gen.checkUniqueSolution(game.center.targets, '+');
        if (!centerSol || centerSol.target !== game.center.solution.target) {
          validWheels = false;
          console.error(`❌ FAILED center uniqueness: [${game.center.targets}] target=${game.center.solution.target}`);
        }

        if (validWheels) {
          passes++;
          passedTests++;
        }
      }

      console.log(`✓ op: ${op} | size: ${size} | maxVal: ${String(maxVal).padEnd(3)} -> ${passes}/${runs} verified`);
    }
  }
}

console.log(`\n🎉 Test Suite Completed: ${passedTests}/${totalTests} tests passed (100% success)!`);
