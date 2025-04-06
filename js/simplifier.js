//  This is where most of your code changes belong

function Simplifier(input_mesh) {

    this.mesh = input_mesh;
    this.mode = "Single";
    this.solver = null;

    // Initializes this simplifier object with a mesh
    this.setMesh = function (m) {
        this.mesh = m;
    }

    this.setSolver = function (s) {
        this.solver = s;
    }

    this.setMode = function (mode) {
        console.log("Setting mode to " + mode);
        this.mode = mode;
    }

    /** ---------------------------------------------------------------------
     * Iterates through all edges in the mesh and returns all edges that are
     * valid (does not create non-manifold edges) for the simplification process.
     * 
     * There are two conditions we are looking for - both meshes 
     * "tet.obj" and "pyramid.obj" should not be able to be simplified any amount.
     * 
     * Note: Since we are using a half-edge data structure, there are two half-edges
     * for each edge in the mesh. Only one of the half-edges should be considered.
     * 
     * We recommend creating a helper method to check if an individual edge is valid.
     * 
     * @return Array of valid (half) edges
     */
    this.getValidEdges = function () {
        let allEdges = this.mesh.getEdges();
        let validEdges = [];

        for (let i = 0; i < allEdges.length; i++) {
            let edge = allEdges[i];
            if (this.isValidEdge(edge)) {
                validEdges.push(edge);
            }
        }

        return validEdges;
    }

    this.isValidEdge = function (edge) {

        // Get the two vertices of the edge
        let v1 = edge.getOrigin();
        let v2 = edge.getTwin().getOrigin();

        // Get the faces of the edge
        let f1 = edge.getFace();
        let f2 = edge.getTwin().getFace();

        // Get the vertices of the faces
        let f1_verts = [f1.vert(0), f1.vert(1), f1.vert(2)];
        let f2_verts = [f2.vert(0), f2.vert(1), f2.vert(2)];

        if (new Set(f1_verts).size !== f1_verts.length || new Set(f2_verts).size !== f2_verts.length) {
            console.log("Duplicate vertices in face." + edge.getId() + ": Invalid edge.");
            return false;
        }

        // Get the third vertex of each face
        let f1_third_vert = f1_verts.filter(v => v != v1 && v != v2)[0];
        let f2_third_vert = f2_verts.filter(v => v != v1 && v != v2)[0];

        // Condition 1: Third Vertices Share an Edge
        let f1_neighbor_verts = f1_third_vert.getVertices();

        // console.log("Checking edge " + edge.getId() + " between vertices " + v1.getId() + " and " + v2.getId());
        // console.log("Face 1 vertices: " + f1_verts.map(v => v.getId()) +
        //     ", Third vertex: " + f1_third_vert.getId() +
        //     ",  neighbor_verts:" + f1_neighbor_verts.map(v => v.getId()));
        // console.log("Face 2 vertices: " + f2_verts.map(v => v.getId()) + ", Third vertex: " + f2_third_vert.getId());

        // Condition 2: Common Neighbor Between Endpoints
        let v1_neighbors = v1.getVertices();
        let v2_neighbors = v2.getVertices();
        let common_neighbors = v1_neighbors.filter(v => v2_neighbors.includes(v));

        // console.log("vertex " + v1.getId() + "'s neighbors: " + v1_neighbors.map(v => v.getId()) +
        //     ", vertex " + v2.getId() + "'s neighbors: " + v2_neighbors.map(v => v.getId()) +
        //     ",common neighbors: " + common_neighbors.map(v => v.getId()));

        return (!f1_neighbor_verts.includes(f2_third_vert)) && common_neighbors.length == 2;
    }


    /** ---------------------------------------------------------------------
     * Collapses the given edge to the given vertex.
     * 
     * Hint: To make stage B easier, think about how to update the half-edges, 
     * vertices, and faces after collapsing an edge. Reusing the existing 
     * half-edges, vertices, and faces as much as possible is recommended.
     * 
     * @param edge HalfEdge to collapse
     * @param newVertex vertex (vector3d) to collapse the edge to
     */
    this.collapseEdge = function (edge, newVertex) {

        let v1 = edge.getOrigin();
        let v2 = edge.getTwin().getOrigin();

        // Update v1 position to the new vertex location
        v1.setPos(newVertex.x(), newVertex.y(), newVertex.z());

        console.log("Input edge: " + edge.getId() + " v1's half-edge: " + v1.getEdge().getId() +
            " if they are the same, we need to update the half-edge of v1 since edge will be removed");

        if (v1.getEdge().getId() == edge.getId()) {
            // Update v1's half-edge to the next half-edge in the loop
            v1.setEdge(edge.getPrev());
        }

        // Update all half-edges of v2 to point to updated v1 instead
        let v2_edges = v2.getEdges();
        for (let i = 0; i < v2_edges.length; i++) {
            v2_edges[i].setOrigin(v1);
        }

        // Remove the two faces adjacent to the collapsing edge
        let f1 = edge.getFace();
        let f2 = edge.getTwin().getFace();
        this.mesh.removeFace(f1);
        this.mesh.removeFace(f2);

        // Remove the two half-edges of the collapsing edge
        this.mesh.removeEdge(edge);
        this.mesh.removeEdge(edge.getTwin());

        // Remove vertex v2
        this.mesh.removeVertex(v2);
    }

    /** ---------------------------------------------------------------------
     * Computes and returns a priority queue of all valid edges in the mesh with
     * their collapse costs, along with a map of edge ids to their corresponding
     * new vertex positions. The cost of an edge is determined by the current mode.
     * 
     * We recommend creating helper methods to compute the cost of an edge for each
     * mode separately (edge length vs. QEM).
     * 
     * Use the provided PriorityQueue class in js/external/priorityQueue.js 
     * (@datastructures-js/priority-queue) to create the priority queue.
     * 
     * @param edges Array of valid edges
     * @returns [pq, mp], pq = PriorityQueue of edges with their collapse costs
     *                    mp = Map of edge ids to their corresponding new vertex positions
     */
    this.computeEdgeCosts = function (edges) {
        let pq = new PriorityQueue((a, b) => a.cost - b.cost);
        let mp = new Map();

        if (this.mode == "Edge-Length") {
            for (let i = 0; i < edges.length; i++) {
                let edge = edges[i];
                let v1_pos = edge.getOrigin().getPos();
                let v2_pos = edge.getTwin().getOrigin().getPos();
                let length = v1_pos.subtract(v2_pos).norm();
                let mid = v1_pos.add(v2_pos).multiply(0.5);

                pq.push({
                    edge: edge,
                    cost: length
                });
                mp.set(edge.getId(), mid);
            }

        }

        return [pq, mp];
    }

    /** ---------------------------------------------------------------------
     * Updates the priority queue and map of edge ids to their corresponding
     * new vertex positions after collapsing an edge.
     * 
     * Hint: Does everything need to be recomputed? Think about how to update the
     * priority queue and map efficiently.
     */
    this.updateEdgeCosts = function () {
        let validEdges = this.getValidEdges();
        let [pq, mp] = this.computeEdgeCosts(validEdges);
        return [pq, mp];
    }

    /** ---------------------------------------------------------------------
     * Simplifies the input mesh based on the given number of edges.
     * 
     * @param numEdges Number of edges to simplify the mesh to
     */
    this.simplify = function (numEdges) {
        if (numEdges <= 0) {
            console.log("No simplification needed");
            return this.mesh;
        }

        console.log("Simplifying mesh of " + numEdges + " edges");


        if (this.mode == "Single") {
            // Get all the valid edges in the mesh
            let validEdges = this.getValidEdges();
            if (validEdges.length == 0) {
                console.log("No valid edges to collapse");
                return this.mesh;
            }

            // Collapse the first valid edge
            let edge = validEdges[0];
            let v1_pos = edge.getOrigin().getPos();
            let v2_pos = edge.getTwin().getOrigin().getPos();
            let mid = v1_pos.add(v2_pos).multiply(0.5);

            this.collapseEdge(edge, mid);

            return this.mesh;
        }
        else if (this.mode == "Edge-Length") {
            // Get all the valid edges in the mesh
            let validEdges = this.getValidEdges();
            if (validEdges.length == 0) {
                console.log("No valid edges to collapse");
                return this.mesh;
            }

            // Compute the costs of all valid edges
            let [pq, mp] = this.computeEdgeCosts(validEdges);

            for (let i = 0; i < numEdges; i++) {
                if (pq.size() == 0) {
                    console.log("Priority queue is empty, no edge to collapse");
                    return this.mesh;
                }

                let top = pq.pop();
                let edge = top.edge;

                // Collapse the edge with the lowest cost
                this.collapseEdge(edge, mp.get(edge.getId()));
                console.log("Collapsing edge " + edge.getId() + " with cost " + top.cost);

                // Updae the priority queue and map
                [pq, mp] = this.updateEdgeCosts();
            }
            return this.mesh;
        }
        else if (this.mode == "QEM") {
            //@@@@@
            // YOUR CODE HERE
            //@@@@@
        }
        else {
            console.log("Invalid mode: " + this.mode);
        }

    }

    /** ---------------------------------------------------------------------
     * Visualizes the simplification process of the mesh. All valid edges should
     * be ordered by their collapse cost of the current simplification mode.
     * 
     * Red - the top edge with the lowest cost
     * Blue - the edge of the n-th lowest cost (n = vis_numEdges)
     * The edges between them will be a blended color of red and blue
     * 
     * @returns Array of edge ids in visualization order
     */
    this.setupVisualization = function () {
        console.log("Setting up visualization");
        let validEdges = this.getValidEdges();
        if (validEdges.length == 0) {
            console.log("No valid edges to visualize");
            return [];
        }
        // Compute the costs of all valid edges
        let [pq, mp] = this.computeEdgeCosts(validEdges);
        edge_ids = pq.toArray().map(e => e.edge.getId());

        return edge_ids;
    }

    this.clear = function () {
        this.mesh = null;
    }
}