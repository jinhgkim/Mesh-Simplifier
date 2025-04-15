# Mesh Simplification (QEM-based)

This project implements a mesh simplification algorithm using edge collapse and the Quadric Error Metric (QEM), built upon a custom half-edge data structure. It supports three modes of simplification:

# 🔧 Features

## Half-Edge Mesh Data Structure
Efficient mesh representation with support for fast adjacency queries.

## 1. Single Edge Collapse
Validates and collapses a single edge while preserving manifoldness. Used for debugging and small-step testing.

## 2. Edge-Length-Based Simplification
Repeatedly collapses the shortest valid edge. Includes edge cost updates and visualization of the collapse priority.

<img src="https://github.com/jinhgkim/Mesh-Simplifier/blob/master/img/edgelength_org.png" width="500"/> <img src="https://github.com/jinhgkim/Mesh-Simplifier/blob/master/img/edgelength.png" width="500"/>

## 3. QEM Simplification
Implements full QEM for optimal vertex placement and edge cost. Solves a 4x4 linear system for each collapse using a provided numerical solver.

<img src="https://github.com/jinhgkim/Mesh-Simplifier/blob/master/img/QEM_org.png" width="500"/> <img src="https://github.com/jinhgkim/Mesh-Simplifier/blob/master/img/QEM.png" width="500"/>