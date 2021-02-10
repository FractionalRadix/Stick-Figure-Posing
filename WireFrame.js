// The Stick class defines a Stick, AND the list of other sticks connected to it.
class Stick {
	constructor(start, length, rotation,children) {
		this.start = start;			// Starting point of this Stick instance, in world coordinates. Vector of 3 float values.
		this.length = length;		// Length of the stick in world coordinates. Float.
		this.rotation = rotation;	// Rotation of this Stick instance, applied from the point "start". Vector of 3 float values.
		this.children = [];			// List/Array of Stick instances. (Yes, it's recursive - our Stick figures are trees of Stick instances).
		this.end;                   // Cache for the endpoint of this Stick instance, in world coordinates.

        this.instanceTransform;     // 4 x 4 transformation matrix that applies the rotation and translation for this specific Stick instance.
        this.cumulativeTransform;   // 4 x 4 transformation matrix that applies all the cumulative transformations of the parent Sticks.

		this.screenPoint;           // Cache for the position of this point on the screen.
        this.svgElement = null;     // Reference to the SVG element that represents this particular Stick instance.
        this.polygon = null;        // Dirty hack: if polygon===null, we draw a Stick. Otherwise, we draw the polygon specified in this variable. It is then an Array of Vector ([Vector]).
        this.listeners = [];        // UNDER CONSTRUCTION: to separate "Model" (Stick) and "View". Stick will only contain the world positions, "Views" will do the SVG drawing. 
                                    //   This will allow us to show the same Stick figure simultaneously from different angles.
	}

    addListener(listener) {
        this.listeners.push(listener);
    }

    //TODO!+ Add a method for removing a listener
    //  Could just remove from the array, or redefine the array using a filter.

    notifyObservers(data) {
        this.listeners.forEach(x => x.update(data));
    }

    //TODO!- Replaced by code in propagateMatrices and Observers.
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
	 * @param {Matrix} worldCoordinatesToScreenCoordinates Matrix to transform world coordinates to screen coordinates.
     * @return {Vector} Vector describing where the given point is on the user's screen. Note that only the first two parameters of this Vector are relevant: the X and the Y coordinate.
     */
    static calculateScreenPoint(worldPoint, worldCoordinatesToScreenCoordinates) {
		var worldPointVec4 = $V([worldPoint.e(1), worldPoint.e(2), worldPoint.e(3), 1]);
        var screenPoint = worldCoordinatesToScreenCoordinates.multiply(worldPointVec4);
		return screenPoint;
	}
    

    //TODO!- Should be done by observers.
    /**
     * Draw the line segment from the given starting point to the end of the current stick.
     * If the stick (line segment) has not been added to the SVG yet, create it.
     * If the stick has been added, simply change update its ending point.
     * Then, recursively draw all sticks attached to this stick's ending point.
     * @param {SVG object} svg The SVG element that is home to the stick figure.
     * @param {Vec4} start2d The starting point of the stick on the screen. Note that only its first 2 elements are relevant: the X-coordinate and the Y-coordinate.
     * @param {Matrix} worldCoordinatesToScreenCoordinates A 4x4 matrix that transforms world coordinates to screen coordinates.
     */
    draw(svg, start2d, worldCoordinatesToScreenCoordinates) {

        this.screenPoint = Stick.calculateScreenPoint(this.end, worldCoordinatesToScreenCoordinates);

        if (this.svgElement === null) {
		    if (start2d !== null) {
                if (this.polygon !== null) {
                    // Draw a polygon instead of a stick.

                    var locationOnStickFigure = this.instanceTransform.multiply(this.cumulativeTransform);
                    var completeTransform = worldCoordinatesToScreenCoordinates.multiply(locationOnStickFigure);
                    var applied = applyMatrixToArray(completeTransform, this.polygon);

                    this.svgElement = addPolygon(svg, applied);
                } else {
                    // Draw a stick.
			        this.svgElement = addLineSegment(svg, start2d, this.screenPoint);
                }
		    }
        } else {
            if (this.polygon !== null) {

				var locationOnStickFigure = this.instanceTransform.multiply(this.cumulativeTransform);
				var completeTransform = worldCoordinatesToScreenCoordinates.multiply(locationOnStickFigure);
				var applied = applyMatrixToArray(completeTransform, this.polygon);

				var generatedPath = pointArrayToClosedSVGPath(applied);
				this.svgElement.setAttribute("d", generatedPath);
            } else {
                this.svgElement.setAttribute("x1", start2d.e(1));
                this.svgElement.setAttribute("y1", start2d.e(2));
                this.svgElement.setAttribute("x2", this.screenPoint.e(1));
                this.svgElement.setAttribute("y2", this.screenPoint.e(2));
            }
        }

		for (var i = 0; i < this.children.length; i++) {
            this.children[i].draw(svg, this.screenPoint, worldCoordinatesToScreenCoordinates);
		}
	}

    //TODO!- Will be replaced by code in propagateMatrices.
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
        this.start = transform.multiply($V([0.0, 0.0, 0.0, 1.0]));
        this.cumulativeTransform = transform.multiply(this.instanceTransform);
        this.end = this.cumulativeTransform.multiply($V([0.0, 0.0, 0.0, 1.0]));

		//TODO?~ For use with the new listener mechanism. Should eventually replace the current "propagate" and "draw".
        //TODO!+ Need a way for the Observers to distinghuis between a stick and a polygon.
		if (this.polygon === null) {
			// Calculate the starting point and the ending point of the Stick.
			// Then send that information to the Observers.
            //  You MAY want to set the "end" as the "start" for each child node, that saves calculation time.
            //  Note that you still need to set the very first "start" element.

			this.notifyObservers([this.start,this.end]); //TODO?~ 
		} else {
			// Calculate the points of the transformed Polygon.
			// Then send that information to the Observers.
			var transformedPolygon = applyMatrixToArray(this.cumulativeTransform, this.polygon);
			this.notifyObservers(transformedPolygon);
		}
        //End of the code for the new listener mechanism.

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].propagateMatrices(this.cumulativeTransform);
        }
    }
}

//TODO!~ Creating a separate Observer for each Stick feels wrong.
// Better to have a single Observing class that maintains the SVG elements.
// It can iterate over the Stick Figure. It should then mimic its structure.
// If an element is added or removed, the Observing, mimicking class can then add or remove a corresponding SVG element dynamically.
// Note that we can still use class SvgStickView, just not as an observer.
// A main class should hold the SvgStickView hierarchy, and be the one notified of changes.
// That main class could also keep track of the instance of "svg", and pass it to the drawing code as a parameter.

/**
 * An SvgStickView maintains the SVG representation of a Stick.
 * It is an Observer of a Stick. Whenever it is notified of a change to the Observed Stick, it redraws its SVG element.
 */
class SvgStickView {
    //TODO?~ Maybe the SvgStickView could know for itself if it held a Stick or a Polygon, instead of having to glean this information via "update" ?

    /**
     * @param {Object} svg Reference to the SVG element on which we want to draw.
     * @param {Matrix} worldToScreen Matrix that contains the full transform from world coordinates to screen coordinates.
     */
    constructor(svg, worldToScreen) {
        this.svg = svg;
        this.svgElement = null;
        this.worldToScreen = worldToScreen;
    }

    update(data) {
        //Use the data to draw/update a line/polygon in SVG. Using a pre-specified projection matrix.
        //console.log(data);
        var screenPoints = applyMatrixToArray(this.worldToScreen, data);
        if (data.length == 2) {
            // It's a stick. Create/update a line segment.
            if (this.svgElement === null) {
                this.svgElement = addLineSegment(this.svg, screenPoints[0], screenPoints[1]);
            } else {
                this.svgElement.setAttribute("x1", screenPoints[0].e(1));
                this.svgElement.setAttribute("y1", screenPoints[0].e(2));
                this.svgElement.setAttribute("x2", screenPoints[1].e(1));
                this.svgElement.setAttribute("y2", screenPoints[1].e(2));
            }
        } else {
            // It's a polygon. Create/update a polygon.
            if (this.svgElement === null) {
                this.svgElement = addPolygon(this.svg, screenPoints);
            } else {
                var generatedPath = pointArrayToClosedSVGPath(screenPoints);
                this.svgElement.setAttribute("d", generatedPath);
            }
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


	// Create a matrix that turns these points into screen coordinates.

	// First, we create an orthonormal projection matrix.
	var projectOnYZPlane = ProjectionMatrixYZPlane();
    //var projectOnXZPlane = ProjectionMatrixXZPlane();

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

    var worldCoordinatesToScreenCoordinates = projectionToScreen.multiply(projectOnYZPlane);
    //var worldCoordinatesToScreenCoordinates = projectionToScreen.multiply(projectOnXZPlane);

    //TODO!+ Create a second worldToScreen matrix, that looks at our stick figure from the side... and puts it somewhere else on the screen.
    // Maybe put the projection matrices in our AuxiliaryMatrixFunctions code: projectOnOxy, projectOnOxz, ProjectOnOyz .

	// Define the stick figure.
	// First, we define the center as a stick with length 0.
	const centerStick = new Stick($V([0.0, 0.0, 0.0]), 0.0, $V([0.0, 0.0,0.0]), []);
    const centerStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);

	// Then, we add the back to the center.
	const backStick = new Stick($V([0.0, 0.0, 0.0]), 0.6, $V([0.1, 0.1, 0.1]), []); // centerStick.end , not a hard [0,0,0]
	centerStick.children.push(backStick);
    var backStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    backStick.addListener(backStickView1);

	// Add a circle for the head.
    const headCircle = new Stick(backStick.end, 0.30, $V([0.0, 0.0, 0.0]), []);
    headCircle.polygon = generateRegularPolygon(10, 0.15);
    backStick.children.push(headCircle);
	var headStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    headCircle.addListener(headStickView1);


    // Add the left leg: from the hip to the toes.
    // Add the stick going to the left hip.
    const leftHipStick = new Stick(centerStick.end,0.15,$V([-2.0, 0.0, 0.0]), []);
    centerStick.children.push(leftHipStick);
    var leftHipStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftHipStick.addListener(leftHipStickView1);

    // Add the stick for  the left upper leg.
    const leftUpperLegStick = new Stick(leftHipStick.end, 0.40, $V([-0.25*Math.PI, 0.0, 0.0]),[]);
    leftHipStick.children.push(leftUpperLegStick);
    var leftUpperLegStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftUpperLegStick.addListener(leftUpperLegStickView1);
	// Add the stick for the left lower leg.
    const leftLowerLegStick = new Stick(leftUpperLegStick.end, 0.40, $V([0.0, 0.0, 0.0]), []);
    leftUpperLegStick.children.push(leftLowerLegStick);
    var leftLowerLegStickView = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftLowerLegStick.addListener(leftLowerLegStickView);
    //TODO!+ Add the stick for the left foot.

    // Add the right leg: from the hip to the toes.
    // Add the stick going to the right hip.
    const rightHipStick = new Stick(centerStick.end, 0.15, $V([+2.0, 0.0, 0.0]), []);
    centerStick.children.push(rightHipStick);
    var rightHipStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightHipStick.addListener(rightHipStickView1);
    // Add the stick for the right upper leg.
    const rightUpperLegStick = new Stick(rightHipStick.end, 0.40, $V([+0.25*Math.PI, 0.0, 0.0]),[]);
    rightHipStick.children.push(rightUpperLegStick);
    var rightUpperLegStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightUpperLegStick.addListener(rightUpperLegStickView1);
    // Add the stick for the right lower leg.
    const rightLowerLegStick = new Stick(rightUpperLegStick.end, 0.40, $V([0.0, 0.0, 0.0]), []);
    rightUpperLegStick.children.push(rightLowerLegStick);
    var rightLowerLegStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightLowerLegStick.addListener(rightLowerLegStickView1);
    
    //TODO!+ Add the stick for the right foot.

    // Add the left arm: from the neck (!) to the wrist.
    // Add the stick going to the left shoulder.
    const leftShoulderStick = new Stick(backStick.end, 0.15, $V([-0.5 * Math.PI, 0.0, 0.0]), []);
    backStick.children.push(leftShoulderStick);
    var leftShoulderStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftShoulderStick.addListener(leftShoulderStickView1);
    // Add the stick for the left upper arm.
    const leftUpperArmStick = new Stick(leftShoulderStick.end, 0.30, $V([-1.0, 0.0, 0.0]), []);
    leftShoulderStick.children.push(leftUpperArmStick);
    var leftUpperArmStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftUpperArmStick.addListener(leftUpperArmStickView1);
    // Add the stick for the left lower arm.
    const leftLowerArmStick = new Stick(leftUpperArmStick.end, 0.30, $V([-1.0, 0.0, 0.0]), []);
    leftUpperArmStick.children.push(leftLowerArmStick);
    var leftLowerArmStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftLowerArmStick.addListener(leftLowerArmStickView1);
	// Add a circle for the hand.
    const leftHand = new Stick(leftLowerArmStick.end, 0.0, $V([0.0, 0.0, 0.0]), []);
    leftHand.polygon = generateRegularPolygon(10, 0.05);
    leftLowerArmStick.children.push(leftHand);
    var leftHandView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    leftHand.addListener(leftHandView1);

    // Add the right arm: from the neck (!) to the wrist.
    // Add the stick going to the right shoulder.
    const rightShoulderStick = new Stick(backStick.end, 0.15, $V([0.5 * Math.PI, 0.0, 0.0]), []);
    backStick.children.push(rightShoulderStick);
    var rightShoulderStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightShoulderStick.addListener(rightShoulderStickView1);
	// Add the stick for the right upper arm.
    const rightUpperArmStick = new Stick(rightShoulderStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightShoulderStick.children.push(rightUpperArmStick);
    var rightUpperArmStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightUpperArmStick.addListener(rightUpperArmStickView1);
    // Add the stick for the right lower arm.
    const rightLowerArmStick = new Stick(rightUpperArmStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightUpperArmStick.children.push(rightLowerArmStick);
    var rightLowerArmStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightLowerArmStick.addListener(rightLowerArmStickView1);
	// Add a circle for the hand.
    var rightHand = new Stick(rightLowerArmStick.end, 0.0, $V([0.0, 0.0, 0.0]), []);
    rightHand.polygon = generateRegularPolygon(10, 0.05);
    rightLowerArmStick.children.push(rightHand);
    var rightHandView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates);
    rightHand.addListener(rightHandView1);

    centerStick.propagateMatrices(Matrix.I(4));
    centerStick.propagate();

    //centerStick.draw(svg, null, worldCoordinatesToScreenCoordinates);

    function modifyRotationAroundXAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([radians, current.e(2), current.e(3)]);
centerStick.propagateMatrices(Matrix.I(4));
            affectedJoint.propagate();
            //var start2d = Stick.calculateScreenPoint(affectedJoint.start, worldCoordinatesToScreenCoordinates);
            //affectedJoint.draw(svg, start2d, worldCoordinatesToScreenCoordinates);
    }

    function modifyRotationAroundYAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([current.e(1), radians, current.e(3)]);
centerStick.propagateMatrices(Matrix.I(4));
            affectedJoint.propagate();
			//var start2d = Stick.calculateScreenPoint(affectedJoint.start, worldCoordinatesToScreenCoordinates);
            //affectedJoint.draw(svg, start2d, worldCoordinatesToScreenCoordinates);
    }

    function modifyRotationAroundZAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([current.e(1), current.e(2), radians]);
centerStick.propagateMatrices(Matrix.I(4));
            affectedJoint.propagate();
			//var start2d = Stick.calculateScreenPoint(affectedJoint.start, worldCoordinatesToScreenCoordinates);
            //affectedJoint.draw(svg, start2d, worldCoordinatesToScreenCoordinates);
    }

    var spinningAroundAxis = document.getElementById("spinAroundAxis");
    spinningAroundAxis.addEventListener('input', () => modifyRotationAroundZAxis(spinningAroundAxis, centerStick));

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

function addPolygon(svg, points) {
	var path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    const attributeValue = pointArrayToClosedSVGPath(points);
	path.setAttribute("d", attributeValue);
	path.style.stroke="black";
	path.style.strokeWidth="1";
	path.style.fill="none";
	svg.appendChild(path);
	console.log(path);
    return path;
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

/** Given an array of points, generate the SVG "path" string. 
 * The generated path visits all points in the array in order, starting and ending at the first.
 * @param {[Vector]} vectoryArray An array of 3D vectors. Each vector should have at least 2 elements.
 * @return {string} An SVG path string (the value for the "d" attribute in an SVG "path" element).
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
          str += "L " + x + " " + y + " ";
        }
    }
    str += "Z";
    return str;
}
