/* AuxiliaryMatrixFunctions.js .
 * A few helper functions for use with the sylvester.js library.
 */

/**
 * Create a 4x4 translation matrix.
 * @param {Vector} t A three-dimensional vector that specifies the translation.
 * @return {Matrix} A 4x4 matrix to translate a point by the given Vector.
 */
function TranslationMatrix(t) {
	return Matrix.create(
		[
			[1,0,0,t.e(1)],
			[0,1,0,t.e(2)],
			[0,0,1,t.e(3)],
			[0,0,0,     1],
		]
	);
}

/**
 * Given a 3x3 transformation matrix, add a row and a column to make it a 4x4 matrix.
 * The new elements are all 0, except the one at (4,4), which will be 1.
 * This makes it a 4x4 transformation matrix, allowing us to use it for translation.
 * @param {Matrix} m A 3x3 transformation matrix.
 * @return {Matrix} A 4x4 transformation matrix, that is the 4x4 version of the 3x3 matrix provided as input.
 */
function create4x4TransformationMatrix(m) {
	return Matrix.create(
		[
			[m.e(1,1), m.e(1,2), m.e(1,3), 0],
			[m.e(2,1), m.e(2,2), m.e(2,3), 0],
			[m.e(3,1), m.e(3,2), m.e(3,3), 0],
			[       0,        0,        0, 1]
		]
	);
}

/**
 * Creates an orthogonal projection matrix, to project the Oyz plane on the Oxy plane.
 * @return {Matrix} A matrix that discards X coordinates, moves Y coordinates to the X axis, and moves Z coordinates to the Y axis.
 */
function ProjectionMatrixYZPlane() {
	return Matrix.create(
        [
		    [0.0, 1.0, 0.0, 0.0],
		    [0.0, 0.0, 1.0, 0.0],
		    [0.0, 0.0, 0.0, 0.0],
		    [0.0, 0.0, 0.0, 1.0]
		]
	);
}

/**
 * Creates an orthogonal projection matrix, to project the Oxz plane on the Oxy plane.
 * @return {Matrix} A matrix that keeps X coordinates on the X axis, moves Z coordinates to the Y axis, and discards Y coordinates.
 */
function ProjectionMatrixXZPlane() {
    return Matrix.create(
        [
		    [1.0, 0.0, 0.0, 0.0],
		    [0.0, 0.0, 1.0, 0.0],
		    [0.0, 0.0, 0.0, 0.0],
		    [0.0, 0.0, 0.0, 1.0]
		]
    );
}

/**
 * Given a 4x4 (transformation) matrix, and an array of 4-dimensional vectors (points in a 3D space with an extra element),
 * determine the product of this matrix for each of these elements.
 * @param {Matrix} matrix A 4x4 transformation matrix.
 * @param {[Vector]} vectorArray An array of 4-dimensional vectors.
 * @return {[Vector]} A transformation of the input array; each vector is the product of 'matrix' with the corresponding element in the input array.
 */
function applyMatrixToArray(matrix, vectorArray) {
	var res = [];
    vectorArray.forEach( point => res.push(matrix.multiply(point)) );
	return res;
}

