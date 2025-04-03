/**
 * A simple half-edge mesh class
**/

class Vertex {
    constructor(x, y, z, idx) {
        this.position = new Vec3(x, y, z);
        this.flag = '';
        this.id = idx;
    }

    getPos() { return this.position; }
    getEdge()  { return this.he; }

    getEdges()  {
        var start_id = this.he.getId();
        var current = this.he;
        var edges = [];
        do
        {
            edges.push(current);
            current = current.getTwin().getNext();
        } while(current.getId() != start_id)

        return edges;
    }

    getVertices()  {
        var edges = this.getEdges();
        var verts = [];
        for (var i=0; i < edges.length; i++)
        {
            verts.push(edges[i].getTwin().getOrigin());
        }
        return verts;
    }

    getId() { return this.id; }
    getFlag() { return this.flag; }

    setPos(dx, dy, dz) {
        this.position.value[0] = dx;
        this.position.value[1] = dy;
        this.position.value[2] = dz;
    }

    setEdge(e) {
        this.he = e;
    }

    setFlag(f) {
        this.flag = f;
    }
}

class HalfEdge {
    constructor(idx) { 
        this.id = idx;
        this.flag = '';
    }

    getOrigin() { return this.origin; }
    getTwin() { return this.twin; }
    getPrev() { return this.prev; }
    getNext() { return this.next; }
    getFace() { return this.face; }
    getId() { return this.id; }

    getFlag() { return this.flag; }

    setOrigin(v) { this.origin = v; }
    setTwin(e) { this.twin = e; }
    setPrev(e) { this.prev = e; }
    setNext(e) { this.next = e; }
    setFace(f) { this.face = f; }

    setFlag(fl) { this.flag = fl; }
}

class Face {
    constructor(idx) { 
        this.id = idx;
        this.flag = '';
    }

    getId() { return this.id; }
    getEdge() { return this.he; }
    getFlag() { return this.flag; }

    vert(idx) {
        if (this.he) {
            switch (idx) {
                case 0: return this.he.origin;
                case 1: return this.he.next.origin;
                case 2: return this.he.prev.origin;
            }
        }
    }

    setEdge (e) { this.he = e; }
    setFlag(f) { this.flag = f; }

    computeNormal () {
        var v0 = this.vert(0).position;
        var v1 = this.vert(1).position;
        var v2 = this.vert(2).position;

        var u = v1.subtract(v0);
        var u = u.normalize();
        var v = v2.subtract(v0);
        var v = v.normalize();
        var w = u.cross(v);

        return w.normalize();
    }
}

class Mesh {
    constructor () {
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.normals = new Map();

        this.edgeId = 0;
        this.vertexId = 0;
        this.faceId = 0;

        this.vertexEdgeMap = new Map();
        this.idEdgeMap = new Map();
    }

    builMesh (verts, normals, faces) {
        this.clear();

        // Add vertices and vertex normals to our trimesh.
        for (var i = 0; i < verts.length; i++)
        {
            this.addVertexPos(verts[i][0], verts[i][1], verts[i][2]);

            if (normals.length > 0) {
                var n = new Vec3(normals[i][0], normals[i][1], normals[i][2]);
                this.normals.set(i, n);
            }
        }

        // Add triangles to our trimesh.
        for (var i = 0; i < faces.length; i++)
        {
            var v0 = this.vertices[faces[i][0][0]];
            var v1 = this.vertices[faces[i][1][0]];
            var v2 = this.vertices[faces[i][2][0]];
            this.addFaceByVerts(v0, v1, v2);
        }

        this.vertexEdgeMap.clear();

        if (normals.length == 0) {
            this.computeNormal();
        }

        console.log("Mesh built!");
    }

    clear () {
        // Clear mesh data
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.normals.clear();

        // Clear map data
        this.vertexEdgeMap.clear();
        this.idEdgeMap.clear();

        // Clear IDs
        this.edgeId = 0;
        this.vertexId = 0;
        this.faceId = 0;
    }

    addVertexPos (x, y, z) {
        var v = new Vertex(x, y, z, this.vertexId++);
        this.vertices.push(v);
        return this.vertices[this.vertices.length - 1];
    }

    addFaceByVerts (v1, v2, v3) {
        var e1 = this.findEdge(v1, v2);
        if (!e1) { e1 = this.addEdge(v1, v2); }
        var e2 = this.findEdge(v2, v3);
        if (!e2) { e2 = this.addEdge(v2, v3); }
        var e3 = this.findEdge(v3, v1);
        if (!e3) { e3 = this.addEdge(v3, v1); }

        return this.addFaceByHE(e1, e2, e3);
    }

    addFaceByHE (e1, e2, e3) {
        // Add the face to the mesh
        var f = new Face(this.faceId++);
        this.faces.push(f);

        // Initialize face-edge relationship
        f.setEdge(e1);

        // Initialize edge-face relationship
        e1.setFace(f); e2.setFace(f); e3.setFace(f);

        // Connect edge cycle around face
        e1.setNext(e2); e2.setPrev(e1);
        e2.setNext(e3); e3.setPrev(e2);
        e3.setNext(e1); e1.setPrev(e3);

        return f;
    }

    addFace () {
        var f = new Face(this.faceId++);
        this.faces.push(f);
        return this.faces[this.faces.length - 1];
    }

    addHalfEdge () {
        var he = new HalfEdge(this.edgeId++);
        this.edges.push(he);
        this.idEdgeMap.set(he.getId(), he);
        return this.edges[this.edges.length - 1];
    }

    addEdge (v1, v2) {
        var he = new HalfEdge(this.edgeId++);
        this.edges.push(he);

        var key = String(v1.getId()) + "," + String(v2.getId());
        this.vertexEdgeMap.set(key, he);

        this.idEdgeMap.set(he.getId(), he);

        // Associate edge with its origin vertex
        he.setOrigin(v1);
        if (v1.getEdge() === undefined) {
            v1.setEdge(he);
        }

        // Associate edge with its twin, if it exists
        var t_he = this.findEdge(v2, v1);
        if (t_he === undefined) {}
        else {
            he.setTwin(t_he);
            t_he.setTwin(he);
        }

        return he;
    }

    removeEdge (e) {
        const idx = this.edges.findIndex(edge => edge.id === e.id);
        if (idx !== -1) {
            this.edges.splice(idx, 1);
        }

        this.idEdgeMap.delete(e.getId());
    }

    removeFace (f) {
        const idx = this.faces.findIndex(face => face.id === f.id);
        if (idx !== -1) {
            this.faces.splice(idx, 1);
        }
    }

    removeVertex (v) {
        const idx = this.vertices.findIndex(vertex => vertex.id === v.id);
        if (idx !== -1) {
            this.vertices.splice(idx, 1);
        }
    }

    findEdge (v1, v2) {
        var key = String(v1.getId()) + "," + String(v2.getId());
        if (this.vertexEdgeMap.has(key)) {
            return this.vertexEdgeMap.get(key);
        }
    }

    findEdgeById (id) {
        if (this.idEdgeMap.has(id)) {
            return this.idEdgeMap.get(id);
        }
    }

    getBoundingBox () {
        if (this.vertices.length == 0) return;

        var min = this.vertices[0].getPos().copy();
        var max = this.vertices[0].getPos().copy();

        for (var i = 0; i < this.vertices.length; i++) {
            for (var j = 0; j < 3; j++) {
                var pos = this.vertices[i].getPos();

                if (min.value[j] > pos.value[j]) {
                    min.value[j] = pos.value[j];
                }
                if (max.value[j] < pos.value[j]) {
                    max.value[j] = pos.value[j];
                }
            }
        }

        return [min, max];
    }

    getCentroid () {
        var boundingbox = this.getBoundingBox();

        var min = boundingbox[0];
        var max = boundingbox[1];

        var centroid = min.add(max);
        centroid = centroid.multiply(0.5);

        return centroid;
    }

    computeNormal () {
        this.normals.clear();

        var count = new Map();
        for (var i = 0; i < this.vertices.length; i++){
            this.normals.set(this.vertices[i].getId(), new Vec3(0.0, 0.0, 0.0));
            count.set(this.vertices[i].getId(), 0);
        }

        console.log(this.faces.length);
        for (var i = 0; i < this.faces.length; i++) {
            var f = this.faces[i];
            var n = f.computeNormal();

            var v0_idx = this.faces[i].getEdge().getOrigin().getId();
            var v1_idx = this.faces[i].getEdge().getNext().getOrigin().getId();
            var v2_idx = this.faces[i].getEdge().getPrev().getOrigin().getId();

            this.normals.set(v0_idx, this.normals.get(v0_idx).add(n));
            this.normals.set(v1_idx, this.normals.get(v1_idx).add(n));
            this.normals.set(v2_idx, this.normals.get(v2_idx).add(n));
            count.set(v0_idx, count.get(v0_idx) + 1);
            count.set(v1_idx, count.get(v1_idx) + 1);
            count.set(v2_idx, count.get(v2_idx) + 1);
        }

        for (const key of this.normals.keys()) {
            this.normals.set(key, this.normals.get(key).multiply(count.get(key)));
            this.normals.set(key, this.normals.get(key).normalize());    
        }
    }

    getVertices() { return this.vertices; }
    getEdges() { return this.edges; }
    getFaces() { return this.faces; }
    getNormals() { return this.normals; }
}