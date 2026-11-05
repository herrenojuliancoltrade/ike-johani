export type Rol = "ASEGURADO" | "PROVEEDOR" | "OPERADOR" | "ADMIN"

export type TipoDocumento = "CC" | "CE" | "NIT" | "PA"

export interface Usuario {
  id: number
  email: string
  first_name: string
  last_name: string
  nombre_completo: string
  tipo_documento: TipoDocumento
  documento: string
  telefono: string
  rol: Rol
  proveedor: number | null
  proveedor_nombre: string | null
  tecnico_id: number | null
  date_joined: string
}

export interface AuthResponse {
  access: string
  refresh: string
  usuario: Usuario
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Estado =
  | "PENDIENTE"
  | "SIN_PROVEEDOR"
  | "ASIGNADA"
  | "EN_CAMINO"
  | "EN_SITIO"
  | "EN_PROCESO"
  | "FINALIZADA"
  | "CANCELADA"

export type CodigoServicio =
  | "GRUA"
  | "CARRO_TALLER"
  | "LEGAL"
  | "CERRAJERIA"
  | "PASO_CORRIENTE"
  | "CAMBIO_LLANTA"
  | "COMBUSTIBLE"
  | "OTRA"

export interface TipoServicio {
  id: number
  codigo: CodigoServicio
  nombre: string
  descripcion: string
  requiere_desplazamiento: boolean
  activo: boolean
}

export interface ProveedorPublico {
  id: number
  nombre: string
  telefono: string
  calificacion: string
}

export interface TecnicoPublico {
  id: number
  nombre: string
  telefono: string
  placa_vehiculo: string
  latitud: string | null
  longitud: string | null
  ubicacion_actualizada: string | null
}

export interface Solicitud {
  id: number
  codigo: string
  poliza: number
  poliza_numero: string
  tipo_servicio: CodigoServicio
  tipo_servicio_nombre: string
  descripcion: string
  latitud: string
  longitud: string
  direccion: string
  referencia: string
  telefono_contacto: string
  destino_direccion: string
  destino_latitud: string | null
  destino_longitud: string | null
  estado: Estado
  estado_display: string
  proveedor: ProveedorPublico | null
  tecnico: TecnicoPublico | null
  distancia_km: string | null
  eta_minutos: number | null
  hora_estimada_llegada: string | null
  creado: string
  actualizado: string
  asignado_en: string | null
  llegada_en: string | null
  finalizado_en: string | null
  cancelado_en: string | null
  motivo_cancelacion: string
  observaciones_cierre: string
  calificacion: number | null
  comentario_calificacion: string
}

export interface IntentoAsignacion {
  proveedor: number
  proveedor_nombre: string
  tecnico: number | null
  distancia_km: string
  puntaje: string
  resultado: "ASIGNADO" | "RECHAZADO" | "REASIGNADO"
  motivo: string
  fecha: string
}

export interface SolicitudGestion extends Solicitud {
  asegurado: number
  asegurado_nombre: string
  asegurado_documento: string
  vehiculo: {
    placa: string
    marca: string
    linea: string
    modelo: number | null
    color: string
  }
  intentos: IntentoAsignacion[]
}

export interface HistorialEstado {
  estado_anterior: Estado | ""
  estado_nuevo: Estado
  estado_nuevo_display: string
  comentario: string
  usuario_nombre: string | null
  fecha: string
}

export interface PasoSeguimiento {
  estado: Estado
  nombre: string
  completado: boolean
  actual: boolean
}

export interface Seguimiento {
  id: number
  codigo: string
  estado: Estado
  estado_display: string
  proveedor: ProveedorPublico | null
  tecnico: TecnicoPublico | null
  distancia_km: string | null
  eta_minutos: number | null
  hora_estimada_llegada: string | null
  actualizado: string
  pasos: PasoSeguimiento[]
  historial: HistorialEstado[]
}

export interface Poliza {
  id: number
  numero: string
  titular_nombre: string
  titular_documento: string
  asegurado: number | null
  placa: string
  marca: string
  linea: string
  modelo: number | null
  color: string
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  vigente: boolean
  servicios_cubiertos_detalle: TipoServicio[]
  max_asistencias_anuales: number
  creado: string
  actualizado: string
}

export interface Notificacion {
  id: number
  solicitud: number | null
  titulo: string
  mensaje: string
  leida: boolean
  fecha: string
}

export interface Proveedor {
  id: number
  nombre: string
  nit: string
  telefono: string
  email: string
  direccion: string
  ciudad: string
  servicios_detalle: TipoServicio[]
  latitud: string
  longitud: string
  radio_cobertura_km: number
  velocidad_promedio_kmh: number
  capacidad_simultanea: number
  calificacion: string
  activo: boolean
  disponible: boolean
  tecnicos_activos: number
}

export interface Candidato {
  proveedor_id: number
  proveedor: string
  tecnico_id: number | null
  tecnico: string | null
  distancia_km: number
  eta_minutos: number
  carga_actual: number
  puntaje: number
}
