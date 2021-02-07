// The Stick class defines a Stick, AND the list of other sticks connected to it.
class Stick {
	constructor(start, length, rotation,children) {
		this.start = start;			// Starting point of this Stick instance, in world coordinates. Vector of 3 float values.
		this.length = length;		// Length of the stick in world coordinates. Float.
		this.rotation = rotation;	// Rotation of this Stick instance, applied from the point "start". Vector of 3 float values.
		this.children = [];			// List/Array of Stick instances. (Yes, it's recursive - our Stick figures are trees of Stick instances).

		this.end;                   // Cache for the endpoint of this Stick instance, in world coordinates. Also needed by the drawing code for the last lines... eventually.
		this.screenPoint;           // Cache for the position of this point on the screen.
        this.svgLine = null;        // Reference to the SVG "line" element that represents this particular Stick instance.

        this.instanceTransform;     // 4 x 4 transformation matrix that applies the rotation and translation for this specific Stick instance.
        this.cumulativeTransform;   // 4 x 4 transformation matrix that applies all the cumulative transformations of the parent Sticks.

        this.radius = 0.0;          // Dirty hack: if radius > 0.0, then we have a circle instead of a point. We use this to add a circle for the head, and perhaps for the hands too.
	}

    calculateEndpoint() {
        var P = Vector.create($V([0.0, 0.0, 0.0, 1.0]));
        this.end = this.cumulativeTransform.multiply(P);
    }

    calculateMatrix() {

		// Create a translation matrix, that translates a point over "length" meters.
        var Tz = TranslationMatrix($V([0.0, 0.0, this.length]));

		// Create rotation matrices for the specified rotation.
		var Rx = create4x4TransformationMatrix(Matrix.RotationX(this.rotation.e(1)));
		var Ry = create4x4TransformationMatrix(Matrix.RotationY(this.rotation.e(2)));
		var Rz = create4x4TransformationMatrix(Matrix.RotationZ(this.rotation.e(3)));

		this.instanceTransform = Rx.multiply(Ry.multiply(Rz.multiply(Tz)));
    }

	/**
     * Determine the screen position of a given point in world coordinates.
     * In other words, if (x,y,z) is a point in the stick figure's world, this function calculates where that point is on the screen.
	 * @param {Matrix} projection Matrix to project the 3D coordinate onto a plane.
	 * @param {Matrix} projectionToScreen Matrix to transform coordinates on the projection plane to those on the screen.
     * @return {Vector} Vector describing where the given point is on the user's screen. Note that only the first two parameters of this Vector are relevant: the X and the Y coordinate.
     */
	static calculateScreenPoint(worldPoint, projection, projectionToScreen) {
		var worldPointVec4 = $V([worldPoint.e(1), worldPoint.e(2), worldPoint.e(3), 1]);
		var projectedPoint = projection.multiply(worldPointVec4);
		var screenPoint = projectionToScreen.multiply(projectedPoint);
		return screenPoint;
	}
    
    /**
     * Draw the line segment from the given starting point to the end of the current stick.
     * If the stick (line segment) has not been added to the SVG yet, create it.
     * If the stick has been added, simply change update its ending point.
     * Then, recursively draw all sticks attached to this stick's ending point.
     * @param {SVG object} svg The SVG element that is home to the stick figure.
     * @param {Vec4} start2d The starting point of the stick on the screen. Note that only its first 2 elements are relevant: the X-coordinate and the Y-coordinate.
     * @param {Matrix} projection A 4x4 matrix that transforms the stick figure's world coordinates to a projection screen.
     * @param {Matrix} projectionToScreen A 4x4 matrix that transforms the projection of the stick figure to screen coordinates.
     */
	draw(svg, start2d, projection, projectionToScreen) {

        this.screenPoint = Stick.calculateScreenPoint(this.end, projection, projectionToScreen);
        if (this.svgLine === null) {
		    if (start2d !== null) {
                if (this.radius > 0.0) {
                    // Add a "circle"
                    // <path d=...  stroke="black" stroke-width="1" fill="white"/>
                    var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
                    var polygon = generateRegularPolygon(5, this.radius);

                    var locationOnStickFigure = this.instanceTransform.multiply(this.cumulativeTransform);
                    var worldCoordinatesToScreen = projectionToScreen.multiply(projection);
                    var completeTransform = worldCoordinatesToScreen.multiply(locationOnStickFigure);
                    var applied = applyMatrixToArray(completeTransform, polygon);

                    var generatedPath = pointArrayToClosedSVGPath(applied);
                    path.setAttribute("d", generatedPath);
                    path.style.stroke="black";
                    path.style.strokeWidth="1";
                    path.fill="white";
                    svg.appendChild(path);
                    console.log(path);
                    this.svgLine = path;
                } else {
			        this.svgLine = addLineSegment(svg, start2d, this.screenPoint);
                }
		    }
        } else {
            if (this.radius > 0.0) {
                    var polygon = generateRegularPolygon(5, this.radius);

                    var locationOnStickFigure = this.instanceTransform.multiply(this.cumulativeTransform);
                    var worldCoordinatesToScreen = projectionToScreen.multiply(projection);
                    var completeTransform = worldCoordinatesToScreen.multiply(locationOnStickFigure);
                    var applied = applyMatrixToArray(completeTransform, polygon);

                    var generatedPath = pointArrayToClosedSVGPath(applied);
                    this.svgLine.setAttribute("d", generatedPath);
            } else {
                this.svgLine.setAttribute("x1", start2d.e(1));
                this.svgLine.setAttribute("y1", start2d.e(2));
                this.svgLine.setAttribute("x2", this.screenPoint.e(1));
                this.svgLine.setAttribute("y2", this.screenPoint.e(2));
            }
        }

		for (var i = 0; i < this.children.length; i++) {
			this.children[i].draw(svg, this.screenPoint, projection, projectionToScreen);
		}
	}

	propagate() {
		this.calculateEndpoint();

		for (var i = 0; i < this.children.length; i++) {
			var child = this.children[i];
			child.start = this.end;
			child.propagate();
		}
	}

    propagateMatrices(transform) {
        this.calculateMatrix(); // Determines this.instanceTransform.
        this.cumulativeTransform = transform.multiply(this.instanceTransform);
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].propagateMatrices(this.cumulativeTransform);
        }
    }
}


function showWireframe() {
    var svg = document.getElementById("svg1");

	// Our first humanoid figure. 
    //   1 unit = 1 meter.
	// Using the coordinate system as follows:
	//   Z axis is for the height. (Higher value: higher position).
	//   X axis is for into-screen/away-from-screen. (Negative value is away from the camera).
	//   Y axis is for left/right. (Negative value is to the left of the camera).

	// Define the stick figure.
	// First, we define the center as a stick with length 0.
	const centerStick = new Stick($V([0.0, 0.0, 0.0]), 0.0, $V([0.0, 0.0,0.0]), []);
	// Then, we add the back to the center.
	const backStick = new Stick($V([0.0, 0.0, 0.0]), 0.6, $V([0.1, 0.1, 0.1]), []); // centerStick.end , not a hard [0,0,0]
	centerStick.children.push(backStick);
	// Add a circle for the head.
    const headCircle = new Stick(backStick.end, 0.20, $V([0.0, 0.0, 0.0]), []);
    headCircle.radius = 0.15;
    backStick.children.push(headCircle);

    // Add the left leg: from the hip to the toes.
    // Add the stick going to the left hip.
    const leftHipStick = new Stick(centerStick.end,0.15,$V([-2.0, 0.0, 0.0]), []);
    centerStick.children.push(leftHipStick);
    // Add the stick for  the left upper leg.
    const leftUpperLegStick = new Stick(leftHipStick.end, 0.40, $V([-0.25*Math.PI, 0.0, 0.0]),[]);
    leftHipStick.children.push(leftUpperLegStick);
	// Add the stick for the left lower leg.
    const leftLowerLegStick = new Stick(leftUpperLegStick.end, 0.40, $V([0.0, 0.0, 0.0]), []);
    leftUpperLegStick.children.push(leftLowerLegStick);
    //TODO!+ Add the stick for the left foot.

    // Add the right leg: from the hip to the toes.
    // Add the stick going to the right hip.
    const rightHipStick = new Stick(centerStick.end, 0.15,$V([+2.0, 0.0, 0.0]), []);
    centerStick.children.push(rightHipStick);
    // Add the stick for the right upper leg.
    const rightUpperLegStick = new Stick(rightHipStick.end, 0.40, $V([+0.25*Math.PI, 0.0, 0.0]),[]);
    rightHipStick.children.push(rightUpperLegStick);
    // Add the stick for the right lower leg.
    const rightLowerLegStick = new Stick(rightUpperLegStick.end, 0.40, $V([0.0, 0.0, 0.0]), []);
    rightUpperLegStick.children.push(rightLowerLegStick);
    //TODO!+ Add the stick for the right foot.

    // Add the left arm: from the neck (!) to the wrist.
    // Add the stick going to the left shoulder.
    const leftShoulderStick = new Stick(backStick.end, 0.15, $V([-0.5 * Math.PI, 0.0, 0.0]), []);
    backStick.children.push(leftShoulderStick);
    // Add the stick for the left upper arm.
    const leftUpperArmStick = new Stick(leftShoulderStick.end, 0.30, $V([-1.0, 0.0, 0.0]), []);
    leftShoulderStick.children.push(leftUpperArmStick);
    const leftLowerArmStick = new Stick(leftUpperArmStick.end, 0.30, $V([-1.0, 0.0, 0.0]), []);
    leftUpperArmStick.children.push(leftLowerArmStick);
	//TODO?+ Add a circle for the hand...

    // Add the right arm: from the neck (!) to the wrist.
    // Add the stick going to the right shoulder.
    const rightShoulderStick = new Stick(backStick.end, 0.15, $V([0.5 * Math.PI, 0.0, 0.0]), []);
    backStick.children.push(rightShoulderStick);
	// Add the stick for the right upper arm.
    const rightUpperArmStick = new Stick(rightShoulderStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightShoulderStick.children.push(rightUpperArmStick);
    const rightLowerArmStick = new Stick(rightUpperArmStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightUpperArmStick.children.push(rightLowerArmStick);
	//TODO?+ Add a circle for the hand...

    centerStick.propagateMatrices(Matrix.I(4));
    centerStick.propagate();


	// Create a matrix that turns these points into screen coordinates.

	// First, we create an orthonormal projection matrix.
    // The world-coordinate's Y axis becomes the screen-coordinate's X axis.
	// The world-coordinate's Z axis becomes the screen-coordinate's Y axis.
	var projection = Matrix.create(
        [
		    [0.0, 1.0, 0.0, 0.0],
		    [0.0, 0.0, 1.0, 0.0],
		    [0.0, 0.0, 0.0, 0.0],
		    [0.0, 0.0, 0.0, 1.0]
		]
	);

	// Second, convert these to screen coordinates.
	// Note that on computer screens, a lower Y value is HIGHER on the screen. So we must invert the Y value.
	// We assume a screen of 400 x 400, and want to put our (0,0) in world coordinates at (200,200) in screen coordinates.
	// Next, let's assume that 1m in world coordinates should be 50 units in screen coordinates.
	// That results in scale factors 50 and -50 for the X- and Y-scaling. And translation factors 200 and 200 for the X- and Y-translation.
	//TODO?~ Should we do this part using 2D coordinates? If it remains a separate step, it'll save time. If we put all matrices together... it'll be faster to make it a single step.
    var projectionToScreen = Matrix.create(
        [
            [+50.0,   0.0, 0.0, +200.0],
            [  0.0, -50.0, 0.0, +200.0],
            [  0.0,   0.0, 0.0,    0.0],
            [  0.0,   0.0, 0.0,    1.0]
        ]
    );

    centerStick.draw(svg, null, projection, projectionToScreen);

    function modifyRotationAroundXAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            affectedJoint.rotation = $V([radians, 0.0, 0.0]);
centerStick.propagateMatrices(Matrix.I(4));
            affectedJoint.propagate();
            var start2d = Stick.calculateScreenPoint(affectedJoint.start, projection, projectionToScreen);
            affectedJoint.draw(svg, start2d, projection, projectionToScreen);
    }

    function modifyRotationAroundYAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            affectedJoint.rotation = $V([0.0, radians, 0.0]);
centerStick.propagateMatrices(Matrix.I(4));
            affectedJoint.propagate();
            var start2d = Stick.calculateScreenPoint(affectedJoint.start, projection, projectionToScreen);
            affectedJoint.draw(svg, start2d, projection, projectionToScreen);
    }

    var torsoLeftRight = document.getElementById("centerSideward");
    torsoLeftRight.addEventListener('input', () => modifyRotationAroundXAxis(torsoLeftRight, backStick));

    var torsoForward = document.getElementById("centerForward");
    torsoForward.addEventListener('input', () => modifyRotationAroundYAxis(torsoForward, backStick));

    var rightKnee = document.getElementById("rightKnee");
    rightKnee.addEventListener('input', () => modifyRotationAroundYAxis(rightKnee, rightLowerLegStick));

    var leftKnee = document.getElementById("leftKnee");
    leftKnee.addEventListener('input', () => modifyRotationAroundYAxis(leftKnee, leftLowerLegStick));

    var leftElbow = document.getElementById("leftElbow");
    leftElbow.addEventListener('input', () => modifyRotationAroundYAxis(leftElbow, leftLowerArmStick));

    var rightElbow = document.getElementById("rightElbow");
    rightElbow.addEventListener('input', () => modifyRotationAroundYAxis(rightElbow, rightLowerArmStick));
}

function addLineSegment(svg, v1, v2) {
    var lineSegment = document.createElementNS("http://www.w3.org/2000/svg", 'line');
    lineSegment.setAttribute("x1", v1.e(1)); 
    lineSegment.setAttribute("y1", v1.e(2));
    lineSegment.setAttribute("x2", v2.e(1));
    lineSegment.setAttribute("y2", v2.e(2));
    lineSegment.style.stroke="black";    
    lineSegment.style.strokeWidth="1";
    svg.appendChild(lineSegment);
    console.log(lineSegment);
    return lineSegment;
}

/**
 * Generates the points for a regular polygon, on the Oyz-plane, centered at the origin.
 * If the polygon has enough points, it will resemble a circle.
 * @param {int} n Number of points on the polygon; MUST be greater than 0.
 * @param {float} radius Radius of the polygon.
 * @return {[Vector]} An array of 3D vectors. Each point is a point on the polygon; the points are specified in order.
 */
function generateRegularPolygon(n, radius) {
	var res = [];
	var delta = (2.0 * Math.PI) / n;
	for (var i = 0; i < n; i++) {
		var angle = i * delta;
		var x = 0;
		var y = radius * Math.cos(angle);
		var z = radius * Math.sin(angle);
		var P = $V([x,y,z,1]);
		res.push(P);
	}
	return res;
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

	vectorArray.forEach( function(position) { 
		res.push(matrix.multiply(position));
	});

	return res;
}

/** Given an array of points, generate the SVG "path" string. 
 * The generated path visits all points in the array in order, starting and ending at the first.
 */
function pointArrayToClosedSVGPath(vectorArray) {
    var str = "";
    for (var i = 0; i < vectorArray.length; i++) {
        var x = vectorArray[i].e(1);
        var y = vectorArray[i].e(2);
        if (i === 0) {
          str += "M " + x + " " + y + " ";
        }
        else {
          //TODO?+ See if we can use "C" (curve) or  "S" (smooth curve). 
          str += "L " + x + " " + y + " ";
        }
    }
    str += "Z";
    return str;
}
