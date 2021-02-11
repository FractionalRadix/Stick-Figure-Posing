/** 
 * Given an SVG and two points, this function creates an SVG "line" element that connects these points, and adds it to the SVG.
 * @param {Object} svg An SVG element.
 * @param {Vector} v1 A vector with at least two elements (an x-coordinate and a y-coordinate). Describes the starting point of the line segment.
 * @param {Vector} v2 A vector with at least two elements (an x-coordinate and a y-coordinate). Describes the ending point of the line segment.
 * @return {Object} An SVG "line" element that connects v1 to v2; in other words, a line segment from v1 to v2.
 */
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
 * Given an SVG element and an array of points, this function creates a closed SVG path for the points and adds them to the SVG.
 * @param {Object} svg An SVG element.
 * @param {[Vector]} points An array of vectors, representing the points. Each vector should have at least two elements (one for the x coordinate, one for the y coordinate).
 * @return {Object} An SVG path element that describes a closed path through all given points, in order.
 */
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

/** 
 * Given an array of points, generate the SVG "path" string. 
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