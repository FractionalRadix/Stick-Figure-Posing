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
        for (let i = 0; i < stick.children.length; i++) {
            var childView = this.build(stick.children[i]);
            view.children.push(childView);
        }
        return view;
    }

    /**
     * Take the current view, and export it to a (pretty-printed) XML output.
     */
    exportPose(stickView, n) {
        var res = ""; // WAS: stickView.svgElement;
        // Would like to get the actual textual representation of the SVG element... you'd think JavaScript would have access to it...
        // Maybe just loop over all attributes?
        var elt = stickView.svgElement;

        res = stickView.unparse();

        for (let i = 0; i < stickView.children.length; i++) {
            res += '\r\n';
            res += ' '.repeat(n);
            res += this.exportPose(stickView.children[i], n+2);
        }
        return res;
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
        for (let i = 0; i < stick.children.length; i++) {
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

    unparse() {
        var res = null;
        var d = this.svgElement.getAttribute("d");
        if (d === undefined || d === null) {
            var x1 = this.svgElement.getAttribute("x1");
            var y1 = this.svgElement.getAttribute("y1");
            var x2 = this.svgElement.getAttribute("x2");
            var y2 = this.svgElement.getAttribute("y2");
            res = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="black" stroke-width="1"/>';
            //TODO!~ Get stroke color and stroke width, and possible other style elements, from the Stick Figure projection proper.
            //  IF you do, remember to update the "insertCurrentPose()" method to put the stick figure on a background whose color is different from that of the stick figure!
        } else {
            res = '<path d="' + d + '" stroke="black" stroke-width="1" fill="none"/>'
            //TODO!~ Get stroke color and stroke width, and possible other style elements, from the Stick Figure projection proper.
            //  IF you do, remember to update the "insertCurrentPose()" method to put the stick figure on a background whose color is different from that of the stick figure!
        }
        return res;
    }
}

/**
 * When the user wishes to "download" the stick figure, grab it and attach it to an invisible link element.
 * Then click the invisible link element.
 */
function insertCurrentPose() {
    var link = document.createElement('a');
    link.download = '' ;
                
    var pose = view1.exportPose(view1.rootView, 0);

    var blob;
    var str01 = '<!DOCTYPE html>\r\n';
    var str02 = '<html lang="en">\r\n';
    var str03 = '<head>\r\n';
    var str04 = '  <meta charset="UTF-8">\r\n';
    var str05 = '</head>\r\n';
    var str06 = '<body>\r\n';
    var str07 = '  <svg width="200" height="200">\r\n';
    var str08 = pose + '\r\n';
    var str09 = '  </svg>\r\n';
    var str10 = '</body>\r\n';
    var str11 = '</html>';

    blob = new Blob([str01, str02, str03, str04, str05, str06, str07, str08, str09, str10, str11], { type: 'text/html'} );
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.click();
    URL.revokeObjectURL(link.href);
}

function showWireframe() {
    var svg1 = document.getElementById("svg1");
    var svg2 = document.getElementById("svg2");

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
    // We assume a screen of 200 x 200, and want to put our (0,0) in world coordinates at (100,100) in screen coordinates.
    // Next, let's assume that 1m in world coordinates should be 50 units in screen coordinates.
    // That results in scale factors 50 and -50 for the X- and Y-scaling. And translation factors 100 and 100 for the X- and Y-translation.
    // We then add a second view of the same stick figure, in a separate SVG, using the same transformation.
    // (Originally, there was one SVG; using two makes it possible to put the headers "Front View" and "Side View" in HTML, allowing it to use to the styles defined for the web page).
    var projectionToScreen1 = Matrix.create(
        [
            [+50.0,   0.0, 0.0, +100.0],
            [  0.0, -50.0, 0.0, +100.0],
            [  0.0,   0.0, 0.0,    0.0],
            [  0.0,   0.0, 0.0,    1.0]
        ]
    );

    var projectionToScreen2 = Matrix.create(
        [
            [+50.0,   0.0, 0.0, +100.0],
            [  0.0, -50.0, 0.0, +100.0],
            [  0.0,   0.0, 0.0,    0.0],
            [  0.0,   0.0, 0.0,    1.0]
        ]
    );

    var worldCoordinatesToScreenCoordinates1 = projectionToScreen1.multiply(projectOnYZPlane);
    var worldCoordinatesToScreenCoordinates2 = projectionToScreen2.multiply(projectOnXZPlane);

    // Define the stick figure.
    // First, we define the center as a stick with length 0.
    const centerStick = new Stick($V([0.0, 0.0, 0.0]), 0.0, $V([0.0, 0.0,0.0]), []);

    // Then, we add the back to the center.
    // The back consists of 3 Sticks. When our man bends forwards/backwards, or leftwards/rightwards, all 3 sticks undergo the same transformation.
    const backStick1 = new Stick(centerStick.end, 0.2, $V([0.1, 0.1, 0.1]), []);
    centerStick.children.push(backStick1);
    const backStick2 = new Stick(backStick1.end, 0.2, $V([0.1, 0.1, 0.1]), []);
    backStick1.children.push(backStick2);
    const backStick3 = new Stick(backStick2.end, 0.2, $V([0.1, 0.1, 0.1]), []);
    backStick2.children.push(backStick3);

    // Add a circle for the head.
    const headCircle = new Stick(backStick3.end, 0.30, $V([0.0, 0.0, 0.0]), []);
    headCircle.polygon = generateRegularPolygon(10, 0.15);
    backStick3.children.push(headCircle);

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
    // Add the stick for the left foot.
    const leftFootStick = new Stick(leftLowerLegStick.end, 0.15, $V([0.0, -0.5 * Math.PI, 0.0]), []);
    leftLowerLegStick.children.push(leftFootStick);


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
    // Add the stick for the right foot.
    const rightFootStick = new Stick(rightLowerLegStick.end, 0.15, $V([0.0, -0.5 * Math.PI, 0.0]), []);
    rightLowerLegStick.children.push(rightFootStick);

    // Add the left arm: from the neck (!) to the wrist.
    // Add the stick going to the left shoulder.
    const leftShoulderStick = new Stick(backStick3.end, 0.15, $V([-0.5 * Math.PI, 0.0, 0.0]), []);
    backStick3.children.push(leftShoulderStick);
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
    const rightShoulderStick = new Stick(backStick3.end, 0.15, $V([0.5 * Math.PI, 0.0, 0.0]), []);
    backStick3.children.push(rightShoulderStick);
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


    view1 = new SvgStickViewContainer(svg1, worldCoordinatesToScreenCoordinates1, centerStick);
    view2 = new SvgStickViewContainer(svg2, worldCoordinatesToScreenCoordinates2, centerStick);
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

    // Spin and upper body
    var spinningAroundAxis = document.getElementById("spinAroundAxis");
    spinningAroundAxis.addEventListener('input', () => modifyRotationAroundZAxis(spinningAroundAxis, centerStick));

    var torsoLeftRight = document.getElementById("centerSideward");
    torsoLeftRight.addEventListener('input', () => modifyRotationAroundXAxis(torsoLeftRight, backStick1));
    torsoLeftRight.addEventListener('input', () => modifyRotationAroundXAxis(torsoLeftRight, backStick2));
    torsoLeftRight.addEventListener('input', () => modifyRotationAroundXAxis(torsoLeftRight, backStick3));

    var torsoForward = document.getElementById("centerForward");
    torsoForward.addEventListener('input', () => modifyRotationAroundYAxis(torsoForward, backStick1));
    torsoForward.addEventListener('input', () => modifyRotationAroundYAxis(torsoForward, backStick2));
    torsoForward.addEventListener('input', () => modifyRotationAroundYAxis(torsoForward, backStick3));


    // Right side (from top to bottom)

    var rightShoulderElevation = document.getElementById("rightShoulderElevation");
    rightShoulderElevation.addEventListener('input', () => modifyRotationAroundYAxis(rightShoulderElevation, rightUpperArmStick));

    var rightShoulderAwayFromBody = document.getElementById("rightShoulderAwayFromBody");
    rightShoulderAwayFromBody.addEventListener('input', () => modifyRotationAroundXAxis(rightShoulderAwayFromBody, rightUpperArmStick));

    var rightShoulderAroundOwnAxis = document.getElementById("rightShoulderAroundOwnAxis");
    rightShoulderAroundOwnAxis.addEventListener('input', () => modifyRotationAroundZAxis(rightShoulderAroundOwnAxis, rightUpperArmStick));

    var rightElbow = document.getElementById("rightElbow");
    rightElbow.addEventListener('input', () => modifyRotationAroundXAxis(rightElbow, rightLowerArmStick));

    var rightHipElevation = document.getElementById("rightHipElevation");
    rightHipElevation.addEventListener('input', () => modifyRotationAroundYAxis(rightHipElevation, rightUpperLegStick));

    var rightHipAwayFromBody = document.getElementById("rightHipAwayFromBody");
    rightHipAwayFromBody.addEventListener('input', () => modifyRotationAroundXAxis(rightHipAwayFromBody, rightUpperLegStick));

    var rightHipAroundOwnAxis = document.getElementById("rightHipAroundOwnAxis");
    rightHipAroundOwnAxis.addEventListener('input', () => modifyRotationAroundZAxis(rightHipAroundOwnAxis, rightUpperLegStick));

    var rightKnee = document.getElementById("rightKnee");
    rightKnee.addEventListener('input', () => modifyRotationAroundYAxis(rightKnee, rightLowerLegStick));

    // Left side (from top to bottom)

    var leftShoulderElevation = document.getElementById("leftShoulderElevation");
    leftShoulderElevation.addEventListener('input', () => modifyRotationAroundYAxis(leftShoulderElevation, leftUpperArmStick));

    var leftShoulderAwayFromBody = document.getElementById("leftShoulderAwayFromBody");
    leftShoulderAwayFromBody.addEventListener('input', () => modifyRotationAroundXAxis(leftShoulderAwayFromBody, leftUpperArmStick));

    var leftShoulderAroundOwnAxis = document.getElementById('leftShoulderAroundOwnAxis');
    leftShoulderAroundOwnAxis.addEventListener('input', () => modifyRotationAroundZAxis(leftShoulderAroundOwnAxis, leftUpperArmStick));

    var leftElbow = document.getElementById("leftElbow");
    leftElbow.addEventListener('input', () => modifyRotationAroundXAxis(leftElbow, leftLowerArmStick));

    var leftHipElevation = document.getElementById("leftHipElevation");
    leftHipElevation.addEventListener('input', () => modifyRotationAroundYAxis(leftHipElevation, leftUpperLegStick));

    var leftHipAwayFromBody = document.getElementById("leftHipAwayFromBody");
    leftHipAwayFromBody.addEventListener('input', () => modifyRotationAroundXAxis(leftHipAwayFromBody, leftUpperLegStick));

    var leftHipAroundOwnAxis = document.getElementById("leftHipAroundOwnAxis");
    leftHipAroundOwnAxis.addEventListener('input', () => modifyRotationAroundZAxis(leftHipAroundOwnAxis, leftUpperLegStick));

    var leftKnee = document.getElementById("leftKnee");
    leftKnee.addEventListener('input', () => modifyRotationAroundYAxis(leftKnee, leftLowerLegStick));

    //var tmp = view1.exportPose(view1.rootView, 0);
    //console.log(tmp);
}


