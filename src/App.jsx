import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [incidencias, setIncidencias] = useState([]);
  const [planificadas, setPlanificadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlanificadas, setLoadingPlanificadas] = useState(true);
  
  // Filtros
  const [provinciasActivasSeleccionadas, setProvinciasActivasSeleccionadas] = useState(new Set());
  const [poblacionesSeleccionadas, setPoblacionesSeleccionadas] = useState(new Set());

  // Estados para dropdowns de filtros
  const [mostrarDropdownProvincia, setMostrarDropdownProvincia] = useState(false);
  const [mostrarDropdownPoblacion, setMostrarDropdownPoblacion] = useState(false);

  // Referencias para cerrar al hacer clic fuera
  const dropdownProvinciaRef = useRef(null);
  const dropdownPoblacionRef = useRef(null);

  useEffect(() => {
    // Cerrar dropdowns al hacer click fuera
    function handleClickOutside(event) {
      if (dropdownProvinciaRef.current && !dropdownProvinciaRef.current.contains(event.target)) {
        setMostrarDropdownProvincia(false);
      }
      if (dropdownPoblacionRef.current && !dropdownPoblacionRef.current.contains(event.target)) {
        setMostrarDropdownPoblacion(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchIncidencias = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidencias');
      const data = await res.json();
      if (data.success) {
        setIncidencias(data.data);
      }
    } catch (error) {
      console.error('Error fetching incidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanificadas = async () => {
    setLoadingPlanificadas(true);
    try {
      const res = await fetch('/api/planificadas');
      const data = await res.json();
      if (data.success) {
        setPlanificadas(data.data);
      }
    } catch (error) {
      console.error('Error fetching planificadas:', error);
    } finally {
      setLoadingPlanificadas(false);
    }
  };

  useEffect(() => {
    fetchIncidencias();
    fetchPlanificadas();
  }, []);

  // Opciones únicas para filtros
  const provinciasActivasOpciones = [...new Set(incidencias.map(i => i.provincia).filter(Boolean))].sort();
  const poblacionesFiltro = [...new Set(planificadas.map(p => p.municipio_inicio).filter(Boolean))].sort();

  // Filtrado de Planificadas
  const planificadasFiltradas = planificadas.filter(plan => {
    if (poblacionesSeleccionadas.size === 0) return true;
    return poblacionesSeleccionadas.has(plan.municipio_inicio);
  });

  // Filtrado de Activas
  const incidenciasFiltradas = incidencias.filter(inc => {
    if (provinciasActivasSeleccionadas.size === 0) return true;
    return provinciasActivasSeleccionadas.has(inc.provincia);
  });

  const getBadgeClass = (tipo) => {
    if (!tipo) return 'badge-dark';
    switch(tipo.toLowerCase()) {
      case 'retencion': return 'badge-warning';
      case 'obras': return 'badge-info';
      case 'accidente': return 'badge-danger';
      case 'meteorologica': return 'badge-primary';
      default: return 'badge-dark';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Desconocido';
    const d = new Date(dateString);
    return d.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', 
      hour: '2-digit', minute:'2-digit' 
    });
  };

  const togglePoblacion = (pob) => {
    setPoblacionesSeleccionadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pob)) newSet.delete(pob);
      else newSet.add(pob);
      return newSet;
    });
  };

  const toggleProvincia = (prov) => {
    setProvinciasActivasSeleccionadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(prov)) newSet.delete(prov);
      else newSet.add(prov);
      return newSet;
    });
  };

  return (
    <div className="App">
      <header className="header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>Gestor DGT Inteligente</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', marginTop: '0.25rem' }}>GrupaMar - Logística y Transporte</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={fetchPlanificadas} disabled={loadingPlanificadas}>
              {loadingPlanificadas ? 'Cargando...' : 'Actualizar Planificadas'}
            </button>
            <button className="btn btn-primary" onClick={fetchIncidencias} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar Activas'}
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ marginTop: '3rem' }}>
        
        {/* Estadísticas Rápidas */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid #16a34a' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{planificadas.length}</div>
            <div className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Restricciones Planificadas</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid var(--color-danger)' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{incidencias.length}</div>
            <div className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Incidencias Activas Hoy</div>
          </div>
        </div>

        {/* Panel Dividido para Planificadas vs Activas */}
        <div id="alertas" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Columna Izquierda: Planificadas */}
          <div id="planificadas" style={{ flex: '1 1 350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
               <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>Restricciones Planificadas</h3>
               {poblacionesFiltro.length > 0 && (
                 <div style={{ position: 'relative' }} ref={dropdownPoblacionRef}>
                   <button 
                     className="btn btn-outline" 
                     onClick={() => setMostrarDropdownPoblacion(!mostrarDropdownPoblacion)}
                     style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                   >
                     Filtrar Población ({poblacionesSeleccionadas.size > 0 ? poblacionesSeleccionadas.size : 'Todas'})
                   </button>
                   {mostrarDropdownPoblacion && (
                     <div style={{ position: 'absolute', top: '110%', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', zIndex: 10, width: '250px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                       {poblacionesFiltro.map(pob => (
                          <label key={pob} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={poblacionesSeleccionadas.has(pob)} onChange={() => togglePoblacion(pob)} /> 
                            {pob}
                          </label>
                       ))}
                     </div>
                   )}
                 </div>
               )}
            </div>
            
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Extraídas automáticamente del último Excel publicado.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {loadingPlanificadas ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando planificación...</div>
              ) : planificadasFiltradas.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay restricciones planificadas para los filtros seleccionados.</div>
              ) : (
                planificadasFiltradas.map((plan, idx) => (
                  <div key={idx} className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                       <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>PLANIFICADA</span>
                       <span className="text-muted" style={{ fontSize: '0.85rem' }}>{plan.fecha_texto}</span>
                    </div>
                    <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>Ctra: </strong>
                      <span style={{ color: 'var(--color-secondary)' }}>{plan.carretera}</span> 
                      <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>
                      <strong style={{ color: 'var(--color-primary)' }}>P.K.: </strong>
                      <span style={{ color: 'var(--color-secondary)' }}>{plan.pk_inicio !== null ? plan.pk_inicio : 'N/A'}{plan.pk_fin !== null ? ` al ${plan.pk_fin}` : ''}</span>
                    </h4>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>Población: </strong>
                      {plan.municipio_inicio || 'N/A'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', padding: '0.5rem', backgroundColor: 'var(--color-surface)', borderRadius: '4px' }}>
                      <strong>Sentido:</strong> {plan.sentido || 'Ambos'} &nbsp;|&nbsp; 
                      <strong>Horario:</strong> {plan.duracion || 'Todo el día'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha: Activas */}
          <div style={{ flex: '1 1 350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>Incidencias Activas</h3>
              {provinciasActivasOpciones.length > 0 && (
                 <div style={{ position: 'relative' }} ref={dropdownProvinciaRef}>
                   <button 
                     className="btn btn-outline" 
                     onClick={() => setMostrarDropdownProvincia(!mostrarDropdownProvincia)}
                     style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                   >
                     Filtrar Provincia ({provinciasActivasSeleccionadas.size > 0 ? provinciasActivasSeleccionadas.size : 'Todas'})
                   </button>
                   {mostrarDropdownProvincia && (
                     <div style={{ position: 'absolute', top: '110%', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', zIndex: 10, width: '250px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                       {provinciasActivasOpciones.map(prov => (
                          <label key={prov} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={provinciasActivasSeleccionadas.has(prov)} onChange={() => toggleProvincia(prov)} /> 
                            {prov}
                          </label>
                       ))}
                     </div>
                   )}
                 </div>
              )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Cargando incidencias reales en vivo...
              </div>
            ) : incidenciasFiltradas.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No se han detectado incidencias activas.
              </div>
            ) : (
              incidenciasFiltradas.map((incidencia) => (
                <div key={incidencia.id_incidencia} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-danger)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span className={`badge ${getBadgeClass(incidencia.tipo)}`}>
                      {incidencia.tipo ? incidencia.tipo.replace('_', ' ') : 'Alerta'}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{incidencia.id_incidencia}</span>
                  </div>
                  
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>Ctra: </strong>
                    <span style={{ color: 'var(--color-secondary)' }}>{incidencia.carretera}</span> 
                    <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>|</span> 
                    <strong style={{ color: 'var(--color-primary)' }}>Ciudad: </strong>
                    {incidencia.ciudad || 'N/A'}
                  </h4>
                  
                  <p style={{ margin: '0 0 1rem 0' }}>{incidencia.descripcion}</p>
                  
                  <div style={{ 
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', 
                    backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem'
                  }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>Tramo:</strong>
                      Km {incidencia.tramo?.km_inicio} al {incidencia.tramo?.km_fin} ({incidencia.tramo?.sentido})
                    </div>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>Provincia:</strong>
                      {incidencia.provincia}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>

      <footer style={{ backgroundColor: 'var(--color-surface)', padding: '3rem 0', marginTop: '3rem' }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>© 2026 GrupaMar Transporte y Logística. Todos los derechos reservados.</p>
          <p style={{ fontSize: '0.85rem' }}>Sistema Integrado con Datos DGT (DATEX II).</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
