"use client"

import * as THREE from 'three'
import type { SceneObject, ObjectType } from './types'

function buildGeometryForType(type: ObjectType): THREE.BufferGeometry {
  switch (type) {
    case 'box':          return new THREE.BoxGeometry(1, 1, 1)
    case 'sphere':       return new THREE.SphereGeometry(0.5, 32, 32)
    case 'cylinder':     return new THREE.CylinderGeometry(0.5, 0.5, 1, 32)
    case 'torus':        return new THREE.TorusGeometry(0.4, 0.18, 16, 64)
    case 'cone':         return new THREE.ConeGeometry(0.5, 1, 32)
    case 'plane':        return new THREE.PlaneGeometry(1, 1)
    case 'ring':         return new THREE.RingGeometry(0.25, 0.5, 32)
    case 'icosahedron':  return new THREE.IcosahedronGeometry(0.5, 0)
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.5, 0)
    case 'torusKnot':    return new THREE.TorusKnotGeometry(0.3, 0.1, 128, 16)
    default:             return new THREE.BoxGeometry(1, 1, 1)
  }
}

export function buildMeshForCSG(obj: SceneObject): THREE.Mesh {
  let geo: THREE.BufferGeometry
  if (obj.type === 'csg' && obj.csgGeometryData) {
    geo = new THREE.BufferGeometryLoader().parse(obj.csgGeometryData as any)
  } else {
    geo = buildGeometryForType(obj.type)
  }
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial())
  mesh.position.set(...obj.position)
  mesh.rotation.set(...obj.rotation)
  mesh.scale.set(...obj.scale)
  mesh.updateMatrixWorld(true)
  return mesh
}

export async function runCSG(
  objA: SceneObject,
  objB: SceneObject,
  operation: 'subtract' | 'union' | 'intersect',
): Promise<Record<string, unknown>> {
  const { Evaluator, Brush, SUBTRACTION, ADDITION, INTERSECTION } = await import('three-bvh-csg')
  const meshA = buildMeshForCSG(objA)
  const meshB = buildMeshForCSG(objB)

  const brushA = new Brush(meshA.geometry, meshA.material as THREE.Material)
  brushA.position.copy(meshA.position)
  brushA.rotation.copy(meshA.rotation)
  brushA.scale.copy(meshA.scale)
  brushA.updateMatrixWorld(true)

  const brushB = new Brush(meshB.geometry, meshB.material as THREE.Material)
  brushB.position.copy(meshB.position)
  brushB.rotation.copy(meshB.rotation)
  brushB.scale.copy(meshB.scale)
  brushB.updateMatrixWorld(true)

  const op = operation === 'subtract' ? SUBTRACTION : operation === 'union' ? ADDITION : INTERSECTION
  const evaluator = new Evaluator()
  const result = evaluator.evaluate(brushA, brushB, op)
  return result.geometry.toJSON() as unknown as Record<string, unknown>
}
