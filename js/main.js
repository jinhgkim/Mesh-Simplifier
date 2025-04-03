// Check the availability of WebGL
const canvas = document.getElementById("glCanvas");

const gl = canvas.getContext("webgl2");
if (gl == null) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
}

// Make the drawingbuffer match the div size of browser
function resize_canvas(){
    // Lookup the size the browser is displaying the canvas.
    var displayWidth  = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    if (canvas.width  != displayWidth ||
        canvas.height != displayHeight) {

        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

// Initial event handler for canvas
function initEventHandlers (canvas, gl_operation) {
    var lastX = -1;
    var lastY = -1;

    var dragging = false;

    canvas.onmousedown = function(ev) {  //Mouse is pressed
        if (load_mesh) {
            dragging = true;

            lastX = ev.clientX;
            lastY = ev.clientY;

            ev.preventDefault();
        }
    };

    canvas.onmouseup = function(ev){ //Mouse is released
        dragging = false;
    };

    canvas.onmousemove = function(ev) { //Mouse is moved
        if (dragging) {
            var dX = (lastY - ev.clientY) * 2 * Math.PI / canvas.height;
            var dY = (ev.clientX - lastX) * 2 * Math.PI / canvas.width;

            lastX = ev.clientX;
            lastY = ev.clientY;

            gl_operation.rotateScene(dX, dY);
            gl_operation.drawSetup();

            if (vis_Flag == 1){
                gl_operation.visualizeEdges(cur_mesh, edge_ids, vis_numEdges);
            }
            gl_operation.drawMesh(cur_mesh);
            
            ev.preventDefault();
        }
    };

    canvas.onwheel = function (ev) { // Mouse scroll
        var dis = 0;

        if (ev.deltaY > 0) { // Zoom in
            dis += 0.1;
        }
        else {
            dis -= 0.1;
        }

        gl_operation.zoom(dis);
        gl_operation.drawSetup();
        if (vis_Flag == 1){
            gl_operation.visualizeEdges(cur_mesh, edge_ids, vis_numEdges);
        }
        gl_operation.drawMesh(cur_mesh);

        ev.preventDefault();
    };
}


// Map the drawing buffer to the size of div on browser
resize_canvas();
// Add resize window event listener
window.addEventListener("resize", resize_canvas);

// Set up the WebGL operation interface
let gl_operation = new WebGL(canvas, gl);
gl_operation.setup();
gl_operation.drawSetup();

// OBJ loader
let loader = new OBJLoader();

// Get mesh
let mesh_file = '';
let cur_mesh = new Mesh();
let load_mesh = false;

// Simplifier
let simplifier = new Simplifier(cur_mesh);

let vis_numEdges = 0;

let simp_numEdges = 0;

// This array stores the edge indexes
// It should be updated/sorted based on the error
// For visualization, only the first vis_numEdges will be displayed
// For now, it is set to the first 3 edges
let edge_ids = [0, 1, 2];

// Solver
let solver = new Solver();
simplifier.setSolver(solver);

// Example of using the solver
var m = [[1, 0, 0, 0], [0, 2, 0, 0], [0, 0, 3, 0], [0, 0, 0, 4]];
var b = [-1, -1, -1, -1];
// For this example, there is a solution, so print it
// If there is no solution, solution_found will be false
[solution_found, x] = solver.solve(m, b);  // x = [[-1], [-0.5], [-0.3333333333333333], [-0.25]]
if (solution_found) {
    console.log(x);
}
else{
    console.log("No solution found!");
}


// Initial canvas event handlers
initEventHandlers(canvas, gl_operation);

var vis_Flag = 0;

// Control the number of edges for visualization
var visInput = document.getElementById("visInput");

var visBtn = document.getElementById("visBtn");
visBtn.addEventListener("click", function(){
    vis_numEdges = visInput.value;
    vis_Flag = 1;

    edge_ids = simplifier.setupVisualization();
    
    gl_operation.drawSetup();
    gl_operation.modelSetup(cur_mesh);

    if (vis_Flag == 1){
        gl_operation.visualizeEdges(cur_mesh, edge_ids, vis_numEdges);
    }

    gl_operation.drawMesh(cur_mesh);
});

var visInc = document.getElementById("visIncrease");
visInc.addEventListener("click", function(){
    var input_value = parseInt(visInput.value);
    input_value += 1;
    visInput.value = input_value;

    vis_numEdges = input_value;
});

var visDec = document.getElementById("visDecrease");
visDec.addEventListener("click", function(){
    var input_value = parseInt(visInput.value);
    if (input_value > 0) {
        input_value -= 1;
        visInput.value = input_value;

        vis_numEdges = input_value;
    }
});

var modeDropdownButton = document.getElementById("ModeDropdownMenuButton");
var modeDropdownMenu = document.getElementById("modeDropdownMenu");
modeDropdownMenu.addEventListener("click", function(event){
    var text = $(event.target).text();
    modeDropdownButton.innerHTML = text;

    simplifier.setMode(text);

    gl_operation.drawSetup();
    gl_operation.modelSetup(cur_mesh);
    gl_operation.drawMesh(cur_mesh);
});

// Control the number of edges for simplification
var simpInput = document.getElementById("simpInput");

var simpBtn = document.getElementById("simpBtn");
simpBtn.addEventListener("click", function(){
    var input_value = simpInput.value;
    
    cur_mesh = simplifier.simplify(input_value);

    // Reset visualization flag
    vis_Flag = 0;

    gl_operation.drawSetup();
    gl_operation.modelSetup(cur_mesh);
    gl_operation.drawMesh(cur_mesh);
});

var simpInc = document.getElementById("simpIncrease");
simpInc.addEventListener("click", function(){
    var input_value = parseInt(simpInput.value);
    input_value += 1;
    simpInput.value = input_value;
});

var simpDec = document.getElementById("simpDecrease");
simpDec.addEventListener("click", function(){
    var input_value = parseInt(simpInput.value);
    if (input_value > 0) {
        input_value -= 1;
        simpInput.value = input_value;
    }
});


function readSingleFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }

    console.log("Reading file");
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;

        vis_Flag = 0;
        visInput.value = 0;
        simpInput.value = 0;
        simplifier.clear();

        loader.load(contents, function(out){
            console.log('Read Mesh!');
            cur_mesh.builMesh(out.vertices, out.normals, out.faces);

            gl_operation.drawSetup();
            gl_operation.cameraSetup();
            gl_operation.modelSetup(cur_mesh);
            gl_operation.drawMesh(cur_mesh);
            load_mesh = true;

            simplifier.setMesh(cur_mesh);
        });
    };
    reader.readAsText(file);
}

function displayContents(contents) {
    var element = document.getElementById('modelFile');
    element.textContent = contents;
}

document.getElementById('modelFile')
    .addEventListener('change', readSingleFile, false);
