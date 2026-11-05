import { BrowserRouter, Route, Routes } from "react-router"

import { RedirigirInicio, RequireAuth, SoloInvitados } from "@/auth/RequireAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { DetalleAsistenciaPage } from "@/pages/asegurado/DetalleAsistenciaPage"
import { MisAsistenciasPage } from "@/pages/asegurado/MisAsistenciasPage"
import { MisPolizasPage } from "@/pages/asegurado/MisPolizasPage"
import { NuevaAsistenciaPage } from "@/pages/asegurado/NuevaAsistenciaPage"
import { LoginPage } from "@/pages/auth/LoginPage"
import { RegistroPage } from "@/pages/auth/RegistroPage"
import { GestionPolizasPage } from "@/pages/gestion/GestionPolizasPage"
import { GestionProveedoresPage } from "@/pages/gestion/GestionProveedoresPage"
import { GestionSolicitudesPage } from "@/pages/gestion/GestionSolicitudesPage"
import { NotificacionesPage } from "@/pages/NotificacionesPage"
import {
  DetalleServicioProveedorPage,
  ServiciosProveedorPage,
} from "@/pages/proveedor/ServiciosProveedorPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<SoloInvitados><LoginPage /></SoloInvitados>} />
        <Route path="/registro" element={<SoloInvitados><RegistroPage /></SoloInvitados>} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<RedirigirInicio />} />
          <Route path="notificaciones" element={<NotificacionesPage />} />

          {/* Asegurado */}
          <Route path="asistencias" element={<RequireAuth roles={["ASEGURADO"]}><MisAsistenciasPage /></RequireAuth>} />
          <Route path="asistencias/nueva" element={<RequireAuth roles={["ASEGURADO"]}><NuevaAsistenciaPage /></RequireAuth>} />
          <Route path="asistencias/:id" element={<RequireAuth roles={["ASEGURADO"]}><DetalleAsistenciaPage /></RequireAuth>} />
          <Route path="polizas" element={<RequireAuth roles={["ASEGURADO"]}><MisPolizasPage /></RequireAuth>} />

          {/* Proveedor / técnico */}
          <Route path="proveedor" element={<RequireAuth roles={["PROVEEDOR"]}><ServiciosProveedorPage /></RequireAuth>} />
          <Route path="proveedor/:id" element={<RequireAuth roles={["PROVEEDOR"]}><DetalleServicioProveedorPage /></RequireAuth>} />

          {/* Aseguradora */}
          <Route path="gestion" element={<RequireAuth roles={["OPERADOR", "ADMIN"]}><GestionSolicitudesPage /></RequireAuth>} />
          <Route path="gestion/proveedores" element={<RequireAuth roles={["OPERADOR", "ADMIN"]}><GestionProveedoresPage /></RequireAuth>} />
          <Route path="gestion/polizas" element={<RequireAuth roles={["OPERADOR", "ADMIN"]}><GestionPolizasPage /></RequireAuth>} />
        </Route>

        <Route path="*" element={<RedirigirInicio />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
