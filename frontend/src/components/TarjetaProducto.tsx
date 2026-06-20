import { Producto } from '../types';

interface TarjetaProductoProps {
  producto: Producto;
  onAgregar: (productoId: string) => void;
  deshabilitado: boolean;
}

function TarjetaProducto({ producto, onAgregar, deshabilitado }: TarjetaProductoProps) {
  const formatoDinero = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      padding: '1.25rem',
      borderRadius: '12px',
      minWidth: '160px',
      flex: '1 1 180px',
      backgroundColor: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '0.75rem',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
    }}
    >
      <div>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>
          {producto.nombre}
        </h4>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: '700', color: '#3b82f6' }}>
          {formatoDinero(Number(producto.precio_actual))}
        </p>
      </div>
      
      <button
        onClick={() => onAgregar(producto.id)}
        disabled={deshabilitado}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          backgroundColor: deshabilitado ? '#e2e8f0' : '#f8fafc',
          color: deshabilitado ? '#94a3b8' : '#3b82f6',
          border: `1px solid ${deshabilitado ? '#cbd5e1' : '#3b82f6'}`,
          borderRadius: '8px',
          cursor: deshabilitado ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!deshabilitado) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (!deshabilitado) {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.color = '#3b82f6';
          }
        }}
      >
        Agregar
      </button>
    </div>
  );
}

export default TarjetaProducto;
