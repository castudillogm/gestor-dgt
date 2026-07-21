import { useState, useEffect, useRef } from 'react';
import './App.css';
import Select from 'react-select';

const opcionesProvincias = [
  { value: 'a coruña', label: 'A Coruña' },
  { value: 'álava', label: 'Álava' },
  { value: 'albacete', label: 'Albacete' },
  { value: 'alicante', label: 'Alicante' },
  { value: 'almería', label: 'Almería' },
  { value: 'asturias', label: 'Asturias' },
  { value: 'ávila', label: 'Ávila' },
  { value: 'badajoz', label: 'Badajoz' },
  { value: 'baleares', label: 'Baleares' },
  { value: 'barcelona', label: 'Barcelona' },
  { value: 'burgos', label: 'Burgos' },
  { value: 'cáceres', label: 'Cáceres' },
  { value: 'cádiz', label: 'Cádiz' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'castellón', label: 'Castellón' },
  { value: 'ciudad real', label: 'Ciudad Real' },
  { value: 'córdoba', label: 'Córdoba' },
  { value: 'cuenca', label: 'Cuenca' },
  { value: 'girona', label: 'Girona' },
  { value: 'granada', label: 'Granada' },
  { value: 'guadalajara', label: 'Guadalajara' },
  { value: 'gipuzkoa', label: 'Gipuzkoa' },
  { value: 'huelva', label: 'Huelva' },
  { value: 'huesca', label: 'Huesca' },
  { value: 'jaén', label: 'Jaén' },
  { value: 'la rioja', label: 'La Rioja' },
  { value: 'las palmas', label: 'Las Palmas' },
  { value: 'león', label: 'León' },
  { value: 'lleida', label: 'Lleida' },
  { value: 'lugo', label: 'Lugo' },
  { value: 'madrid', label: 'Madrid' },
  { value: 'málaga', label: 'Málaga' },
  { value: 'murcia', label: 'Murcia' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'ourense', label: 'Ourense' },
  { value: 'palencia', label: 'Palencia' },
  { value: 'pontevedra', label: 'Pontevedra' },
  { value: 'salamanca', label: 'Salamanca' },
  { value: 'segovia', label: 'Segovia' },
  { value: 'sevilla', label: 'Sevilla' },
  { value: 'soria', label: 'Soria' },
  { value: 'tarragona', label: 'Tarragona' },
  { value: 'santa cruz de tenerife', label: 'Santa Cruz de Tenerife' },
  { value: 'teruel', label: 'Teruel' },
  { value: 'toledo', label: 'Toledo' },
  { value: 'valencia', label: 'Valencia' },
  { value: 'valladolid', label: 'Valladolid' },
  { value: 'vizcaya', label: 'Vizcaya' },
  { value: 'zamora', label: 'Zamora' },
  { value: 'zaragoza', label: 'Zaragoza' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'melilla', label: 'Melilla' }
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const parseSpanishDate = (dateStr) => {
  if (!dateStr) return 0;
  const months = { 'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11 };
  const match = dateStr.toLowerCase().match(/(\d+)\s+de\s+([a-z]+)/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = months[match[2]];
    if (month !== undefined) {
      const now = new Date();
      return new Date(now.getFullYear(), month, day).getTime();
    }
  }
  return 0;
};

function App() {
  const [incidencias, setIncidencias] = useState([]);
  const [planificadas, setPlanificadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlanificadas, setLoadingPlanificadas] = useState(true);
  
  // Suscripción state
  const [email, setEmail] = useState('');
  const [provinciasSub, setProvinciasSub] = useState([]);
  const [ciudadesSub, setCiudadesSub] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  
  // Filtros
  const [provinciasActivasSeleccionadas, setProvinciasActivasSeleccionadas] = useState(new Set());
  const [poblacionesSeleccionadas, setPoblacionesSeleccionadas] = useState(new Set());
  const [ordenPlanificadas, setOrdenPlanificadas] = useState('fecha');
  const [ordenActivas, setOrdenActivas] = useState('fecha');
  const [busquedaPoblacion, setBusquedaPoblacion] = useState('');
  const [busquedaProvincia, setBusquedaProvincia] = useState('');

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
      if (Array.isArray(data)) {
        setIncidencias(data);
      } else if (data.success && Array.isArray(data.data)) {
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
      if (Array.isArray(data)) {
        setPlanificadas(data);
      } else if (data.success && Array.isArray(data.data)) {
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

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setLoadingSub(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, provincias: [provincia] })
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
      } else {
        alert(data.error || 'Error en la suscripción');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión');
    } finally {
      setLoadingSub(false);
    }
  };

  // Opciones únicas para filtros
  const provinciasActivasOpciones = [...new Set(incidencias.map(i => i.provincia).filter(Boolean))].sort();
  const poblacionesFiltro = [...new Set(planificadas.map(p => p.municipio_inicio).filter(Boolean))].sort();

  // Filtrado de Planificadas
  let planificadasFiltradas = planificadas.filter(plan => {
    if (poblacionesSeleccionadas.size === 0) return true;
    return poblacionesSeleccionadas.has(plan.municipio_inicio);
  });
  
  if (ordenPlanificadas === 'poblacion') {
    planificadasFiltradas.sort((a, b) => (a.municipio_inicio || '').localeCompare(b.municipio_inicio || ''));
  } else if (ordenPlanificadas === 'fecha') {
    planificadasFiltradas.sort((a, b) => parseSpanishDate(a.fecha_texto) - parseSpanishDate(b.fecha_texto));
  }

  // Filtrado de Activas
  let incidenciasFiltradas = incidencias.filter(inc => {
    if (provinciasActivasSeleccionadas.size === 0) return true;
    return provinciasActivasSeleccionadas.has(inc.provincia);
  });

  if (ordenActivas === 'fecha') {
    incidenciasFiltradas.sort((a, b) => new Date(a.periodo?.inicio || 0) - new Date(b.periodo?.inicio || 0));
  } else if (ordenActivas === 'provincia') {
    incidenciasFiltradas.sort((a, b) => (a.provincia || '').localeCompare(b.provincia || ''));
  }

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
      <header className="header" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <div style={{ 
               backgroundColor: 'var(--color-secondary)', 
               color: 'white', 
               width: '40px', height: '40px', 
               borderRadius: '8px', 
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontWeight: 'bold', fontSize: '1.2rem', marginRight: '1rem',
               boxShadow: '0 4px 10px rgba(9, 17, 151, 0.3)'
             }}>
               GM
             </div>
             <div>
               <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.5px', color: 'white' }}>Gestor DGT Inteligente</h1>
               <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem', color: 'white' }}>GrupaMar - Logística y Transporte</p>
             </div>
          </div>
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="#alertas" style={{ color: 'var(--color-text-inverse)', fontWeight: '600', textDecoration: 'none' }}>Ver Alertas</a>
            <a href="#suscripcion" className="btn" style={{ padding: '0.5rem 1rem', textDecoration: 'none', backgroundColor: 'white', color: 'var(--color-primary)', fontWeight: 'bold' }}>Suscribirse</a>
          </nav>
        </div>
      </header>

      {/* Hero Section & Subscription */}
      <section style={{ padding: '4rem 0', backgroundColor: 'var(--color-surface)' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center' }}>
          
          {/* Columna Izquierda: Hero Text */}
          <div style={{ flex: '1 1 500px' }}>
            <h2 className="title-secondary">Gestor de Tráfico PRO</h2>
            <h1 className="title-primary" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              Alertas de Restricciones DGT en Tiempo Real
            </h1>
            <p className="text-muted" style={{ fontSize: '1.15rem', marginBottom: '2.5rem', textAlign: 'left' }}>
              Anticípate a los cortes viales, obras y restricciones de festivos. Optimiza tus rutas de transporte 
              recibiendo avisos automatizados directamente en tu correo electrónico.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="#alertas" className="btn btn-primary" style={{ textDecoration: 'none' }}>Explorar Mapa y Alertas</a>
            </div>
          </div>
          
          {/* Columna Derecha: Recibe Alertas (Suscripción) */}
          <div style={{ flex: '1 1 350px' }} id="suscripcion">
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Recibe Alertas</h3>
              <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Configura tus preferencias para recibir avisos viales de tus zonas frecuentes.
              </p>

              {subscribed ? (
                <div style={{ 
                  backgroundColor: 'rgba(3, 169, 236, 0.1)', 
                  color: 'var(--color-secondary)', 
                  padding: '1.5rem', 
                  borderRadius: 'var(--radius-md)', 
                  textAlign: 'center',
                  fontWeight: '600'
                }}>
                  ¡Suscripción exitosa!<br/>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'normal' }}>Verifica tu bandeja de entrada.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Correo Electrónico</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="logistica@empresa.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Provincia de Interés</label>
                    <Select 
                        isMulti
                        options={opcionesProvincias}
                        value={provinciasSub}
                        onChange={setProvinciasSub}
                        placeholder="Selecciona provincias..."
                      />
                  </div>
                  

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ciudades (Opcional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ej: Madrid, Móstoles, Alcalá..." 
                      value={ciudadesSub}
                      onChange={(e) => setCiudadesSub(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }} disabled={loadingSub}>
                    {loadingSub ? 'Enviando...' : 'Activar Alertas'}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      <main className="container" style={{ marginTop: '3rem' }}>
        
        {/* Estadísticas Rápidas */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flex: 1 }}>
            <div className="card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid #16a34a' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{planificadas.length}</div>
              <div className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Restricciones Planificadas</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', borderBottom: '4px solid var(--color-danger)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{incidencias.length}</div>
              <div className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Restricciones Activas Hoy</div>
            </div>
          </div>
        </div>

        {/* Panel Dividido para Planificadas vs Activas */}
        <div id="alertas" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Columna Izquierda: Planificadas */}
          <div id="planificadas" style={{ flex: '1 1 350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
               <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>Restricciones Planificadas</h3>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                 <select 
                   className="form-select" 
                   style={{ padding: '0.5rem', width: 'auto', fontSize: '0.9rem', border: '1px solid #ccc', borderRadius: '4px' }}
                   value={ordenPlanificadas}
                   onChange={(e) => setOrdenPlanificadas(e.target.value)}
                 >
                   <option value="fecha">Ordenar por Fecha</option>
                   <option value="poblacion">Ordenar por Población</option>
                 </select>
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
                       <div style={{ position: 'absolute', top: '110%', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', zIndex: 10, width: '250px', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                           <input 
                             type="text" 
                             placeholder="Buscar población..." 
                             value={busquedaPoblacion}
                             onChange={e => setBusquedaPoblacion(e.target.value)}
                             style={{ padding: '0.5rem', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                           />
                           <button className="btn btn-outline" style={{ padding: '0.25rem', fontSize: '0.8rem' }} onClick={() => setPoblacionesSeleccionadas(new Set())}>
                             Restablecer Filtro
                           </button>
                         </div>
                         {poblacionesFiltro.filter(pob => pob.toLowerCase().includes(busquedaPoblacion.toLowerCase())).map(pob => (
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
            </div>
            


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
              <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>Restricciones Activas</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select 
                  className="form-select" 
                  style={{ padding: '0.5rem', width: 'auto', fontSize: '0.9rem', border: '1px solid #ccc', borderRadius: '4px' }}
                  value={ordenActivas}
                  onChange={(e) => setOrdenActivas(e.target.value)}
                >
                  <option value="fecha">Ordenar por Fecha</option>
                  <option value="provincia">Ordenar por Provincia</option>
                </select>
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
                       <div style={{ position: 'absolute', top: '110%', right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', zIndex: 10, width: '250px', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                           <input 
                             type="text" 
                             placeholder="Buscar provincia..." 
                             value={busquedaProvincia}
                             onChange={e => setBusquedaProvincia(e.target.value)}
                             style={{ padding: '0.5rem', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}
                           />
                           <button className="btn btn-outline" style={{ padding: '0.25rem', fontSize: '0.8rem' }} onClick={() => setProvinciasActivasSeleccionadas(new Set())}>
                             Restablecer Filtro
                           </button>
                         </div>
                         {provinciasActivasOpciones.filter(prov => prov.toLowerCase().includes(busquedaProvincia.toLowerCase())).map(prov => (
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
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong style={{ display: 'inline-block', color: 'var(--color-primary)', marginRight: '0.5rem' }}>Período:</strong>
                      {new Date(incidencia.periodo?.inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })} - {new Date(incidencia.periodo?.fin).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
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
