export type RoomType =
  | 'corridor'
  | 'entrance'
  | 'office'
  | 'meeting'
  | 'lab'
  | 'bathroom'
  | 'kitchen'
  | 'storage'
  | 'auditorium'
  | 'study'
  | 'reception'
  | 'server'

export type Room = {
  id: string
  name: string
  type: RoomType
  /** Center X in world units */
  x: number
  /** Center Z in world units */
  z: number
  width: number
  depth: number
}

export type Staircase = {
  id: string
  label: string
  /** Center X – identical across all floors */
  x: number
  /** Center Z – identical across all floors */
  z: number
  width: number
  depth: number
}

export type Floor = {
  index: number
  name: string
  rooms: Room[]
  /** Staircases share position with all other floors */
  staircases: Staircase[]
}
