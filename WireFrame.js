// The Stick class defines a Stick, AND the list of other sticks connected to it.
class Stick {
    constructor(start, length, rotation, children) {
        this.start = start;			// Starting point of this Stick instance, in world coordinates. Vector of 3 float values.
        this.length = length;		// Length of the stick in world coordinates. Float.
        this.rotation = rotation;	// Rotation of this Stick instance, applied from the point "start". Vector of 3 float values.
        this.children = [];			// List/Array of Stick instances. (Yes, it's recursive - our Stick figures are trees of Stick instances).
        this.end;					// Cache for the endpoint of this Stick instance, in world coordinates.

        this.instanceTransform;		// 4 x 4 transformation matrix that applies the rotation and translation for this specific Stick instance.
        this.cumulativeTransform;	// 4 x 4 transformation matrix that applies all the cumulative transformations of the parent Sticks.

        this.polygon = null;		// Dirty hack: if polygon===null, we draw a Stick. Otherwise, we draw the polygon specified in this variable. It is then an Array of Vector ([Vector]).
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

    propagateMatrices(transform) {
        this.calculateMatrix(); // Determines this.instanceTransform.
        this.start = transform.multiply($V([0.0, 0.0, 0.0, 1.0]));
        this.cumulativeTransform = transform.multiply(this.instanceTransform);
        this.end = this.cumulativeTransform.multiply($V([0.0, 0.0, 0.0, 1.0]));

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].propagateMatrices(this.cumulativeTransform);
        }
    }
}


class SvgStickViewContainer {
    /**
     * Create a view of a Stick Figure.
     * Given the SVG element, a transformation Matrix, and a root stick, this class creates a view for the stick and its descendant nodes.
     * @param {Object} svg The SVG element in which the stick figure should be displayed.
     * @param {Matrix} worldToScreen A transformation matrix that transforms the stick figure's coordinates to screen coordinates.
     * @param {root} The root Stick of the Stick figure; the first Stick, to which all the other ones are directly or indirectly attached.
     */
    constructor(svg, worldToScreen, rootStick) {
        this.svg = svg;
        this.worldToScreen = worldToScreen;
        this.rootView = this.build(rootStick);
        this.rootStick = rootStick;
    }

    /**
     * Accepts a Stick (the root of a Stick Figure), and recursively builds a View for it.
     * @param {Stick} stickFigure A Stick instance.
     */
    build(stick) {
        var view = new SvgStickView(this.svg, this.worldToScreen);
        view.children = [];
        for (var i = 0; i < stick.children.length; i++) {
            var childView = this.build(stick.children[i]);
            view.children.push(childView);
        }
        return view;
    }

    // Propagate method - a method that, given a change in the base Stick figure, propagates these changes to the view.
    propagate( ) {
        this.do_propagate(this.rootStick, this.rootView);
    }
    do_propagate(stick, view) {
        if (stick.polygon === null ) {
            view.update( [stick.start, stick.end] );
        } else {
            var transformedPolygon = applyMatrixToArray(stick.cumulativeTransform, stick.polygon);
            view.update(transformedPolygon);
        }

        //TODO!+ Handle the situation that stick.children.length != view.children.length .
        //  In that case, the model (stick) has had sticks added/removed, and we need to deal with the change!
        for (var i = 0; i < stick.children.length; i++) {
            var currentChildStick = stick.children[i];
            var currentChildView = view.children[i];
            this.do_propagate(currentChildStick, currentChildView);
        }
    }
}

/**
 * An SvgStickView maintains the SVG representation of a Stick.
 * It is an Observer of a Stick. Whenever it is notified of a change to the Observed Stick, it redraws its SVG element.
 */
class SvgStickView {
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
    var projectOnXZPlane = ProjectionMatrixXZPlane();

    // Second, convert these to screen coordinates.
    // Note that on computer screens, a lower Y value is HIGHER on the screen. So we must invert the Y value.
    // We assume a screen of 400 x 400, and want to put our (0,0) in world coordinates at (200,200) in screen coordinates.
    // Next, let's assume that 1m in world coordinates should be 50 units in screen coordinates.
    // That results in scale factors 50 and -50 for the X- and Y-scaling. And translation factors 200 and 200 for the X- and Y-translation.
    // We then add a second view of the same stick figure, from a different projection plane, and 100 pixels to the right.
    //TODO?~ Should we do this part using 2D coordinates? If it remains a separate step, it'll save time. If we put all matrices together... it'll be faster to make it a single step.
    var projectionToScreen1 = Matrix.create(
        [
            [+50.0,   0.0, 0.0, +200.0],
            [  0.0, -50.0, 0.0, +200.0],
            [  0.0,   0.0, 0.0,    0.0],
            [  0.0,   0.0, 0.0,    1.0]
        ]
    );

    var projectionToScreen2 = Matrix.create(
        [
            [+50.0,   0.0, 0.0, +400.0],  // Next view of the same stick figure is 200 pixels further to the right of the screen.
            [  0.0, -50.0, 0.0, +200.0],
            [  0.0,   0.0, 0.0,    0.0],
            [  0.0,   0.0, 0.0,    1.0]
        ]
    );

    var worldCoordinatesToScreenCoordinates1 = projectionToScreen1.multiply(projectOnYZPlane);
    var worldCoordinatesToScreenCoordinates2 = projectionToScreen2.multiply(projectOnXZPlane);

    // Define the stick figure.
    // First, we define the center as a stick with length 0.
    const centerStick = new Stick($V([0.0, 0.0, 0.0]), 0.0, $V([0.0, 0.0,0.0]), []);
    const centerStickView1 = new SvgStickView(svg, worldCoordinatesToScreenCoordinates1);

    // Then, we add the back to the center.
    const backStick = new Stick($V([0.0, 0.0, 0.0]), 0.6, $V([0.1, 0.1, 0.1]), []); // centerStick.end , not a hard [0,0,0]
    centerStick.children.push(backStick);

    // Add a circle for the head.
    const headCircle = new Stick(backStick.end, 0.30, $V([0.0, 0.0, 0.0]), []);
    headCircle.polygon = generateRegularPolygon(10, 0.15);
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
    const rightHipStick = new Stick(centerStick.end, 0.15, $V([+2.0, 0.0, 0.0]), []);
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
    // Add the stick for the left lower arm.
    const leftLowerArmStick = new Stick(leftUpperArmStick.end, 0.30, $V([-1.0, 0.0, 0.0]), []);
    leftUpperArmStick.children.push(leftLowerArmStick);
    // Add a circle for the hand.
    const leftHand = new Stick(leftLowerArmStick.end, 0.0, $V([0.0, 0.0, 0.0]), []);
    leftHand.polygon = generateRegularPolygon(10, 0.05);
    leftLowerArmStick.children.push(leftHand);

    // Add the right arm: from the neck (!) to the wrist.
    // Add the stick going to the right shoulder.
    const rightShoulderStick = new Stick(backStick.end, 0.15, $V([0.5 * Math.PI, 0.0, 0.0]), []);
    backStick.children.push(rightShoulderStick);
    // Add the stick for the right upper arm.
    const rightUpperArmStick = new Stick(rightShoulderStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightShoulderStick.children.push(rightUpperArmStick);
    // Add the stick for the right lower arm.
    const rightLowerArmStick = new Stick(rightUpperArmStick.end, 0.30, $V([+1.0, 0.0, 0.0]), []);
    rightUpperArmStick.children.push(rightLowerArmStick);
    // Add a circle for the hand.
    var rightHand = new Stick(rightLowerArmStick.end, 0.0, $V([0.0, 0.0, 0.0]), []);
    rightHand.polygon = generateRegularPolygon(10, 0.05);
    rightLowerArmStick.children.push(rightHand);


    view1 = new SvgStickViewContainer(svg, worldCoordinatesToScreenCoordinates1, centerStick);
    view2 = new SvgStickViewContainer(svg, worldCoordinatesToScreenCoordinates2, centerStick);
    updateFigureAndViews( );

    function modifyRotationAroundXAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([radians, current.e(2), current.e(3)]);
            updateFigureAndViews( );
    }

    function modifyRotationAroundYAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([current.e(1), radians, current.e(3)]);
            updateFigureAndViews( );
    }

    function modifyRotationAroundZAxis(jointSlider, affectedJoint) {
            var radians = (Math.PI * jointSlider.value)/ 180.0;
            var current = affectedJoint.rotation;
            affectedJoint.rotation = $V([current.e(1), current.e(2), radians]);
            updateFigureAndViews( );
    }


    function updateFigureAndViews( ) {
        centerStick.propagateMatrices(Matrix.I(4));
        view1.propagate();
        view2.propagate();
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


