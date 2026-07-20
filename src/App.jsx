import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [provincia, setProvincia] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidencias = async () => {
      try {
        const response = await fetch('/api/incidencias');
        if (response.ok) {
          const data = await response.json();
          setIncidencias(data);
        } else {
          console.error("Error fetching data");
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidencias();
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if(email && provincia) {
      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, provincia })
        });
        
        if (response.ok) {
          setSubscribed(true);
          setTimeout(() => {
            setSubscribed(false);
            setEmail('');
            setProvincia('');
          }, 4000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          alert(errorData.error || 'Hubo un error al suscribirte. Intenta nuevamente.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al servidor.');
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const getBadgeClass = (tipo) => {
    switch(tipo) {
      case 'RESTRICCION_FESTIVO': return 'badge-info';
      case 'OBRAS': return 'badge-warning';
      case 'CORTE_CLIMATICO': return 'badge-dark';
      default: return 'badge-info';
    }
  };

  return (
    <div className="app-container">
      {/* Header Corporativo */}
      <header style={{ backgroundColor: 'var(--color-primary)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo Placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{
               width: '40px', height: '40px', 
               backgroundColor: 'var(--color-secondary)', 
               borderRadius: '8px', 
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               color: 'white', fontWeight: 'bold'
             }}>
               GM
             </div>
             <span style={{ color: 'var(--color-text-inverse)', fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
               GrupaMar <span style={{ fontSize: '1rem', color: 'var(--color-secondary)', fontStyle: 'italic', marginLeft: '0.5rem', fontWeight: '400' }}>Transporte y Logística</span>
             </span>
          </div>
          <nav>
            <a href="#alertas" style={{ color: 'var(--color-text-inverse)', fontWeight: '600', marginRight: '1.5rem' }}>Ver Alertas</a>
            <a href="#suscripcion" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Suscribirse</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--color-surface)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 className="title-secondary">Gestor de Tráfico PRO</h2>
          <h1 className="title-primary" style={{ marginBottom: '1.5rem' }}>
            Alertas de Restricciones DGT en Tiempo Real
          </h1>
          <p className="text-muted" style={{ fontSize: '1.15rem', marginBottom: '2.5rem' }}>
            Anticípate a los cortes viales, obras y restricciones de festivos. Optimiza tus rutas de transporte 
            recibiendo avisos automatizados directamente en tu correo electrónico.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#suscripcion" className="btn btn-primary">Configurar Alertas</a>
            <a href="#alertas" className="btn" style={{ backgroundColor: 'white', color: 'var(--color-primary)', border: '2px solid rgba(9,17,151,0.1)' }}>Explorar Mapa</a>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container" style={{ padding: '4rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem' }}>
        
        {/* Feed de Alertas Recientes */}
        <div id="alertas">
          <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '2rem' }}>Incidencias Activas</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Cargando incidencias reales en vivo...
              </div>
            ) : incidencias.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No se han detectado incidencias activas.
              </div>
            ) : (
              incidencias.map((incidencia) => (
                <div key={incidencia.id_incidencia} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <span className={`badge ${getBadgeClass(incidencia.tipo)}`}>
                      {incidencia.tipo.replace('_', ' ')}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{incidencia.id_incidencia}</span>
                  </div>
                  
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--color-secondary)' }}>{incidencia.carretera}</span> - {incidencia.provincia}
                  </h4>
                  
                  <p style={{ margin: '0 0 1rem 0' }}>{incidencia.descripcion}</p>
                  
                  <div style={{ 
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', 
                    backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem'
                  }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>Tramo Afectado:</strong>
                      Km {incidencia.tramo.km_inicio} al {incidencia.tramo.km_fin} ({incidencia.tramo.sentido})
                    </div>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-primary)' }}>Período:</strong>
                      {formatDate(incidencia.periodo.inicio)} - {formatDate(incidencia.periodo.fin)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel de Suscripción */}
        <div id="suscripcion">
          <div className="card" style={{ position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Recibe Alertas</h3>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.95rem' }}>
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
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="logistica@empresa.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Provincia de Interés</label>
                  <select 
                    className="form-select" 
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    required
                  >
                    <option value="">Selecciona una provincia...</option>
                    <option value="madrid">Madrid</option>
                    <option value="barcelona">Barcelona</option>
                    <option value="valencia">Valencia</option>
                    <option value="sevilla">Sevilla</option>
                    <option value="todas">Toda España</option>
                  </select>
                </div>
                
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Activar Alertas
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer style={{ backgroundColor: 'var(--color-surface)', padding: '3rem 0', marginTop: '3rem' }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>© 2026 GrupaMar Transporte y Logística. Todos los derechos reservados.</p>
          <p style={{ fontSize: '0.85rem' }}>Sistema Integrado con Datos DGT (DATEX II) y Envío SMTP Automático.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
