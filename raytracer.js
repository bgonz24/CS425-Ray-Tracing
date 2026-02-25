var scene = null;
var maxDepth = 1;
var background_color = [190/255, 210/255, 215/255];
var ambientToggle = true;
var diffuseToggle = true;
var specularToggle = true;
var reflectionToggle = true;
var bias = 0.001;

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
}

class Intersection {
    constructor(distance, point) {
        this.distance = distance;
        this.point = point;
    }
}

class Hit {
    constructor(intersection, object) {
        this.intersection = intersection;
        this.object = object;
    }
}

/*
    Intersect objects
*/
function raySphereIntersection(ray, sphere) {
    var center = sphere.center;
    var radius = sphere.radius;
    var originVector = sub(ray.origin, center);
    var a = dot(ray.direction, ray.direction);
    var b = 2.0 * dot(originVector, ray.direction);
    var c = dot(originVector, originVector) - radius * radius;
    var discriminant = b * b - 4 * a * c;
    if(discriminant < 0) {
        return null;
    }
    var sqrtDisc = Math.sqrt(discriminant);
    var positive = (-b - sqrtDisc) / (2 * a);
    var negative = (-b + sqrtDisc) / (2 * a);
    var distance = null;
    if (positive > bias && negative > bias) {
        distance = Math.min(positive, negative);
    } else if (positive > bias) {
        distance = positive;
    } else if (negative > bias) {
        distance = negative;
    }
    if(distance == null) {
        return null;
    }
    var point = add(ray.origin, mult(ray.direction, distance));
    return new Intersection(distance, point);
}

function rayPlaneIntersection(ray, plane) {
    var normal = normalize(plane.normal);
    var denominator = dot(normal, ray.direction);
    if(Math.abs(denominator) < 1e-6) {
        return null;
    }
    var distance = dot(sub(plane.center, ray.origin), normal) / denominator;
    if(distance <= bias) {
        return null;
    }
    var point = add(ray.origin, mult(ray.direction, distance));
    return new Intersection(distance, point);
}

function intersectObjects(ray, depth) {
    var closestHit = null;
    var minDistance = Infinity;
    for(var i = 0; i < scene.objects.length; i++) {
        var currObject = scene.objects[i];
        var intersection = null;
        if(currObject.type == "sphere") {
            intersection = raySphereIntersection(ray, currObject);
        }
        else if(currObject.type == "plane") {
            intersection = rayPlaneIntersection(ray, currObject);
        }
        if(intersection != null && intersection.distance < minDistance) {
            minDistance = intersection.distance;
            closestHit = new Hit(intersection, currObject);
        }
    }
    return closestHit;
}

function sphereNormal(sphere, pos) {
    return normalize(sub(pos, sphere.center));
}

/*
    Shade surface
*/
function shade(ray, hit, depth) {

    var object = hit.object;
    var color = [0,0,0];
    
    
    // Compute object normal, based on object type
    // If sphere, use sphereNormal, if not then it's a plane, use object normal
    var normal;
    if (object.type == "sphere") {
        normal = sphereNormal(object, hit.intersection.point);
    }
    else {
        normal = normalize(object.normal);
    }

    // Loop through all lights, computing diffuse and specular components *if not in shadow*
    var diffuse = 0;
    var specular = 0;
    var point = hit.intersection.point;
    var viewDir = normalize(mult(ray.direction, -1));
    for(var i = 0; i < scene.lights.length; i++) {
        var light = scene.lights[i];
        if (isInShadow(hit, light)) {
            continue;
        }
        var L = normalize(sub(light.position, point));
        if (diffuseToggle) {
            diffuse += Math.max(0, dot(normal, L));
        }
        if (specularToggle && object.specularK > 0) {
            var H = normalize(add(L, viewDir));
            specular += Math.pow(Math.max(0, dot(normal, H)), object.specularExponent);
        }
    }
    for(var c = 0; c < 3; c++) {
        var ambientComp = 0;
        if (ambientToggle) {
            ambientComp = object.color[c] * (object.ambientK || 0);
        }
        var diffuseComp = 0;
        if (diffuseToggle) {
            diffuseComp = object.color[c] * (object.diffuseK || 0) * diffuse;
        }
        var specularComp = 0;
        if (specularToggle) {
            specularComp = 255 * (object.specularK || 0) * specular;
        }
        color[c] = ambientComp + diffuseComp + specularComp;
        if(color[c] > 255) {
            color[c] = 255;
        }
        else if(color[c] < 0) {
            color[c] = 0;
        }
    }
    return color;
}


/*
    Trace ray
*/
function trace(ray, depth) {
    if(depth > maxDepth) return background_color;
    var hit = intersectObjects(ray, depth);
    if(hit != null) {
        var color = shade(ray, hit, depth);
        return color;
    }
    return null;
}

function isInShadow(hit, light) {
    var point = hit.intersection.point;
    var object = hit.object;
    var normal;
    if (object.type == "sphere") {
        normal = sphereNormal(object, point);
    }
    else {
        normal = normalize(object.normal);
    }
    var origin = add(point, mult(normal, bias));
    var toLight = sub(light.position, origin);
    var distToLight = length(toLight);
    var direction = normalize(toLight);
    var shadowRay = new Ray(origin, direction);
    for(var i = 0; i < scene.objects.length; i++) {
        var currObject = scene.objects[i];
        var intersection = null;
        if(currObject.type == "sphere") {
            intersection = raySphereIntersection(shadowRay, currObject);
        }
        else if(currObject.type == "plane") {
            intersection = rayPlaneIntersection(shadowRay, currObject);
        }
        if(intersection != null && intersection.distance < distToLight && currObject !== object) {
            return true;
        }
    }
    return false;
}

/*
    Render loop
*/
function render(element) {
    if(scene == null)
        return;
    
    var width = element.clientWidth;
    var height = element.clientHeight;
    element.width = width;
    element.height = height;
    scene.camera.width = width;
    scene.camera.height = height;

    var ctx = element.getContext("2d");
    var data = ctx.getImageData(0, 0, width, height);

    var eye = normalize(sub(scene.camera.direction,scene.camera.position));
    var right = normalize(cross(eye, [0,1,0]));
    var up = normalize(cross(right, eye));
    var fov = ((scene.camera.fov / 2.0) * Math.PI / 180.0);

    var halfWidth = Math.tan(fov);
    var halfHeight = (scene.camera.height / scene.camera.width) * halfWidth;
    var pixelWidth = (halfWidth * 2) / (scene.camera.width - 1);
    var pixelHeight = (halfHeight * 2) / (scene.camera.height - 1);

    for(var x=0; x < width; x++) {
        for(var y=0; y < height; y++) {
            var vx = mult(right, x*pixelWidth - halfWidth);
            var vy = mult(up, y*pixelHeight - halfHeight);
            var direction = normalize(add(add(eye,vx),vy));
            var origin = scene.camera.position;

            var ray = new Ray(origin, direction);
            var color = trace(ray, 0);
            if(color != null) {
                var index = x * 4 + y * width * 4;
                data.data[index + 0] = color[0];
                data.data[index + 1] = color[1];
                data.data[index + 2] = color[2];
                data.data[index + 3] = 255;
            }
        }
    }
    console.log("done");
    ctx.putImageData(data, 0, 0);
}

/*
    Handlers
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        scene = parsed;
    }
    reader.readAsText(e.files[0]);
}

window.updateMaxDepth = function() {
    maxDepth = document.querySelector("#maxDepth").value;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleAmbient = function() {
    ambientToggle = document.querySelector("#ambient").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleDiffuse = function() {
    diffuseToggle = document.querySelector("#diffuse").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleSpecular = function() {
    specularToggle = document.querySelector("#specular").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleReflection = function() {
    reflectionToggle = document.querySelector("#reflection").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

/*
    Render scene
*/
window.renderScene = function(e) {
    var element = document.querySelector("#canvas");
    render(element);
}