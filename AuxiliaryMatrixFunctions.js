/* AuxiliaryMatrixFunctions.js .
 * A few helper functions for use with the sylvester.js library.
 */

/**
 * Create a 4x4 translation matrix.
 * @param {Vector} t A three-dimensional vector that specifies the translation.
 * @return {Matrix} A 4x4 matrix to translate a point by the given Vector.
 */
function TranslationMatrix(t) {
	var res = Matrix.create(
		[
			[1,0,0,t.e(1)],
			[0,1,0,t.e(2)],
			[0,0,1,t.e(3)],
			[0,0,0,     1],
		]
	);
	return res;
}

/**
 * Given a 3x3 transformation matrix, add a row and a column to make it a 4x4 matrix.
 * The new elements are all 0, except the one at (4,4), which will be 1.
 * This makes it a 4x4 transformation matrix, allowing us to use it for translation.
 * @param {Matrix} m A 3x3 transformation matrix.
 * @return {Matrix} A 4x4 transformation matrix, that is the 4x4 version of the 3x3 matrix provided as input.
 */
function create4x4TransformationMatrix(m) {
	var res = Matrix.create(
		[
			[m.e(1,1), m.e(1,2), m.e(1,3), 0],
			[m.e(2,1), m.e(2,2), m.e(2,3), 0],
			[m.e(3,1), m.e(3,2), m.e(3,3), 0],
			[       0,        0,        0, 1]
		]
	);
	return res;
}

