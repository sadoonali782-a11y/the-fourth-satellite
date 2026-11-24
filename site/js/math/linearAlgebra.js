// Solving small sets of linear equations (at most 4 unknowns here), the way you would by hand:
// eliminate one unknown at a time, then work backwards.

const TOO_SMALL_TO_DIVIDE_BY = 1e-12;

// Solves matrix × answer = rightHandSide. Returns the answer, or null if there is no single answer.
export function solveLinearEquations(matrix, rightHandSide) {
  const size = rightHandSide.length;
  const rows = matrix.map((row, index) => [...row, rightHandSide[index]]);
  const largestEntry = Math.max(...matrix.flat().map(Math.abs), 1e-300);

  for (let column = 0; column < size; column += 1) {
    // Pick the row with the biggest number in this column, so we never divide by something tiny.
    let bestRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[bestRow][column])) {
        bestRow = row;
      }
    }
    if (Math.abs(rows[bestRow][column]) < TOO_SMALL_TO_DIVIDE_BY * largestEntry) {
      return null;
    }
    [rows[column], rows[bestRow]] = [rows[bestRow], rows[column]];

    for (let row = column + 1; row < size; row += 1) {
      const factor = rows[row][column] / rows[column][column];
      for (let entry = column; entry <= size; entry += 1) {
        rows[row][entry] -= factor * rows[column][entry];
      }
    }
  }

  const answer = new Array(size).fill(0);
  for (let row = size - 1; row >= 0; row -= 1) {
    let total = rows[row][size];
    for (let entry = row + 1; entry < size; entry += 1) {
      total -= rows[row][entry] * answer[entry];
    }
    answer[row] = total / rows[row][row];
  }
  return answer;
}

// The inverse of a square matrix, found by solving for each column of the identity matrix.
export function invertMatrix(matrix) {
  const size = matrix.length;
  const columns = [];
  for (let column = 0; column < size; column += 1) {
    const unitColumn = new Array(size).fill(0);
    unitColumn[column] = 1;
    const solvedColumn = solveLinearEquations(matrix, unitColumn);
    if (solvedColumn === null) {
      return null;
    }
    columns.push(solvedColumn);
  }
  return matrix.map((row, rowIndex) => columns.map((column) => column[rowIndex]));
}
