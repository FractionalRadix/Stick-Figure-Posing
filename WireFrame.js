function showWireframe() {
    var svg = document.getElementById("svg1");

	// Our first humanoid figure. 
    //   1 unit = 1 meter.
	// Using the coordinate system as follows:
	//   Z axis is for the height. (Higher value: higher position).
	//   X axis is for into-screen/away-from-screen. (Negative value is away from the camera).
	//   Y axis is for left/right. (Negative value is to the left of the camera).

    // The Stick class defines a Stick, AND the list of other sticks connected to it.
    class Stick {
	    constructor(start, length, rotation,children) {
            this.start = start;			// Vector of 3 float values.
		    this.length = length;		// Float
		    this.rotation = rotation;	// Vector of 3 float values.
		    this.children = [];			// List/Array of Stick. (Yes, it's recursive).

            this.end;                   // Cache for the endpoint. Also needed by the drawing code for the last lines... eventually.
            this.screenPoint;           // Cache for the position of this point on the screen.
        }

        calculateEndpoint() {
		    // Define a stick from the origin to (0,0,this.length).
            var res = Vector.create([0,0,this.length]);
	
		    // Rotate it according to the specified rotation.
		    var Rx = Matrix.RotationX(this.rotation.e(1));
            var Ry = Matrix.RotationY(this.rotation.e(2));
            var Rz = Matrix.RotationZ(this.rotation.e(3));
            var R = Rx.multiply(Ry.multiply(Rz));
		    res = R.multiply(res);

		    // Shift (translate) this stick to the starting point.
		    res = res.add(this.start);

            this.end = res;
        }

        /**
         * Calculate where the end of this Stick appears on the screen.
         * PRE: The endpoint must already have been calculated/updated! //TODO!~ make endpoint NULL or something, and do a check. Also consider a built-in "cache dirty" mechanism.
         * @param {Matrix} projection Matrix to project the 3D coordinate onto a plane.
         * @param {Matrix} projectionToScreen Matrix to transform coordinates on the projection plane to those on the screen.
         */
        calculateScreenPoint(projection, projectionToScreen) {
            // Convert the ending point of the stick to a vector of size 4.
            var endpointVec4 = $V([this.end.e(1), this.end.e(2), this.end.e(3), 1]);
            var projectedEndpoint = projection.multiply(endpointVec4);
            var screenEndpoint = projectionToScreen.multiply(projectedEndpoint);
            this.screenPoint = screenEndpoint;
        }

        draw(svg, start2d, projection, projectionToScreen) {
            this.calculateScreenPoint(projection, projectionToScreen);
            if (start2d !== null) {
                addLineSegment(svg, start2d, this.screenPoint, this.screenPoint);
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


	}

	// Define the stick figure.
	// First, we define the center as a stick with length 0.
	const centerStick = new Stick($V([0.0, 0.0, 0.0]), 0.0, $V([0.0, 0.0,0.0]), []);
	// Then, we add the back to the center.
	const backStick = new Stick($V([0.0,0.0,0.0]), 0.6, $V([0.1, 0.1, 0.1]), []); // centerStick.end , not a hard [0,0,0]
	centerStick.children.push(backStick);

//TODO!~ Swap "left" and "right" in the names below...

    // Add the left leg: from the hip to the toes.
    // Add the stick going to the left hip.
    const leftHipStick = new Stick(centerStick.end,0.15,$V([+2.0,0.0,0.0]), []);
    centerStick.children.push(leftHipStick);
    // Add the stick for  the left upper leg.
    const leftUpperLegStick = new Stick(leftHipStick.end, 0.40, $V([0.0,Math.PI,0.0]),[]);
    leftHipStick.children.push(leftUpperLegStick);
	// Add the stick for the left lower leg.
    const leftLowerLegStick = new Stick(leftUpperLegStick.end, 0.40, $V([0.01,Math.PI,0.0]), []);
    leftUpperLegStick.children.push(leftLowerLegStick);
    // Add the stick for the left foot.
    //TODO!+

    // Add the right leg: from the hip to the toes.
    // Add the stick going to the right hip.
    const rightHipStick = new Stick(centerStick.end, 0.15,$V([-2.0,0.0,0.0]), []);
    centerStick.children.push(rightHipStick);
    // Add the stick for the right upper leg.
    const rightUpperLegStick = new Stick(rightHipStick.end, 0.40, $V([0.0, Math.PI, 0.0]),[]);
    rightHipStick.children.push(rightUpperLegStick);
    // Add the stick for the right lower leg.
    const rightLowerLegStick = new Stick(rightUpperLegStick.end, 0.40, $V([0.01, Math.PI, 0.0]), []);
    rightUpperLegStick.children.push(rightLowerLegStick);
    // Add the stick for the right foot.
    //TODO!+

    // Add the left arm: from the neck (!) to the wrist.
    // Add the stick going to the left shoulder.
    const leftShoulderStick = new Stick(backStick.end, 0.15, $V([+1.0,0.0,0.0]), []);
    backStick.children.push(leftShoulderStick);
    // Add the stick for the left upper arm.
    const leftUpperArm = new Stick(leftShoulderStick.end, 0.30, $V([+1.0,0.0,0.0]), []);
    leftShoulderStick.children.push(leftUpperArm);
	//TODO!+

    // Add the right arm: from the neck (!) to the wrist.
    // Add the stick going to the right shoulder.
    const rightShoulderStick = new Stick(backStick.end, 0.15, $V([-1.0,0.0,0.0]), []);
    backStick.children.push(rightShoulderStick);
	// Add the stick for the right upper arm.
    const rightUpperArm = new Stick(rightShoulderStick.end, 0.30, $V([-1.0,0.0,0.0]), []);
    rightShoulderStick.children.push(rightUpperArm);
	//TODO!+



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
}
