function Solver() {

    // This function is used to solve a linear system
    // of equations Ax = b
    // Where A is an [n x n] matrix
    // b is a vector of size n
    // if there is no solution, it returns [false, []]
    this.solve = function (A, b) {
        if(math.det(A) <=  1e-6) {
            return [false, []];
        }

        x = math.lusolve(A, b);

        return [true, x];
    }
}