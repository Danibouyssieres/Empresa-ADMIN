const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;

const MOCK_SERVICIOS = [
  {
    id: 'res-mock-1',
    folio: 'MSA-2611-001',
    fecha: new Date().toISOString().slice(0, 10),
    hora_recogida: '08:30',
    turno: 'mañana',
    modalidad: '1',
    modalidad_nombre: '1. Servicio Integral (Asistencia + Traslado)',
    paciente: {
      nombre: 'Rosa María Medina Soto',
      edad: 78,
      telefono: '987654321',
      motivo: 'Control Traumatología y Retiro de Puntos',
      movilidad: 'Silla de Ruedas del móvil',
      alergias: 'Penicilina, Látex',
      conciencia: 'Lúcido / Orientado'
    },
    coordinador: {
      nombre: 'Andrea Medina (Hija)',
      telefono: '912345678'
    },
    ruta: {
      origen: 'Av. Las Condes 12345, Las Condes',
      origen_comuna: 'Las Condes',
      destino: 'Clínica Las Condes, Edificio Central, Estoril 450',
      destino_comuna: 'Las Condes',
      km_estimado: 12.4,
      tiempo_espera_contratado: '2 horas'
    },
    estado_terreno: 'pendiente'
  },
  {
    id: 'res-mock-2',
    folio: 'MSA-2611-002',
    fecha: new Date().toISOString().slice(0, 10),
    hora_recogida: '15:00',
    turno: 'tarde',
    modalidad: '2',
    modalidad_nombre: '2. Traslado Exclusivo con Espera',
    paciente: {
      nombre: 'Carlos Alberto Valenzuela',
      edad: 82,
      telefono: '998877665',
      motivo: 'Sesión de Quimioterapia Ambulatoria',
      movilidad: 'Camina con dificultad / Andador del servicio',
      alergias: 'Sin alergias conocidas',
      conciencia: 'Lúcido / Orientado'
    },
    coordinador: {
      nombre: 'Carlos Valenzuela Jr.',
      telefono: '987112233'
    },
    ruta: {
      origen: 'Av. Providencia 2150, Depto 804, Providencia',
      origen_comuna: 'Providencia',
      destino: 'Instituto Oncológico FALP, Rancagua 878, Providencia',
      destino_comuna: 'Providencia',
      km_estimado: 6.8,
      tiempo_espera_contratado: '3 horas'
    },
    estado_terreno: 'pendiente'
  }
];

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // API ROUTE: Itinerario
  if (pathname === '/api/tens/itinerario') {
    const fecha = urlObj.searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      fecha,
      total: MOCK_SERVICIOS.length,
      servicios: MOCK_SERVICIOS,
      modo: 'desarrollo_local'
    }));
  }

  // API ROUTE: Eventos de terreno
  if (pathname === '/api/tens/eventos') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('[LOCAL SERVER] Evento recibido:', data.nuevo_estado, 'para servicio:', data.servicio_id);
      } catch(e){}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, mensaje: 'Hito guardado correctamente en servidor dev' }));
    });
    return;
  }

  // API ROUTE: Ficha clínica / signos vitales
  if (pathname === '/api/tens/clinica') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('[LOCAL SERVER] Ficha clínica recibida:', data.momento, 'para servicio:', data.servicio_id);
      } catch(e){}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, mensaje: 'Ficha clínica guardada en servidor dev' }));
    });
    return;
  }

  // STATIC FILES
  let filePath = path.join(BASE_DIR, pathname === '/' ? 'tens.html' : pathname.replace(/\//g, '\\'));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'tens.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor TENS activo en:`);
  console.log(`- Local:   http://localhost:${PORT}/tens.html`);
  console.log(`- Celular: http://192.168.100.49:${PORT}/tens.html`);
});
