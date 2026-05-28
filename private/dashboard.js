document.addEventListener('DOMContentLoaded', async () => {
  const tituloQuiniela = document.getElementById('tituloQuiniela');
  const rolUsuario = document.getElementById('rolUsuario');
  const opcionesAdmin = document.getElementById('opcionesAdmin');
  const mensaje = document.getElementById('mensaje');

  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaRol = localStorage.getItem('quinielaRol');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId || !quinielaRol) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  tituloQuiniela.textContent = quinielaNombre || 'Dashboard Quiniela';
  rolUsuario.textContent = `Rol: ${quinielaRol}`;

  if (quinielaRol === 'admin') {
    opcionesAdmin.style.display = 'block';
  }

  async function verificarSesion() {
    const res = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/login.html';
    }
  }

  await verificarSesion();

  document.getElementById('verJornadasButton').addEventListener('click', () => {
    window.location.href = '/ver-jornadas.html';
  });

  document.getElementById('llenarPronosticoButton').addEventListener('click', () => {
    window.location.href = '/llenar-pronostico.html';
  });

  document.getElementById('verResultadosButton').addEventListener('click', () => {
    window.location.href = '/ver-resultados.html';
  });

  document.getElementById('tablaGeneralButton').addEventListener('click', () => {
    window.location.href = '/tabla-general.html';
  });

  document.getElementById('adminJornadasButton').addEventListener('click', () => {
    window.location.href = '/admin-jornadas.html';
  });

  document.getElementById('importarPartidosButton').addEventListener('click', () => {
      window.location.href = '/importar-partidos.html';
   });

  document.getElementById('resultadosOficialesButton').addEventListener('click', () => {
    window.location.href = '/admin-resultados-oficiales.html';
  });

  document.getElementById('verJugadoresButton').addEventListener('click', () => {
    window.location.href = '/jugadores-quiniela.html';
  });

  document.getElementById('misQuinielasButton').addEventListener('click', () => {
    window.location.href = '/mis-quinielas.html';
  });

  document.getElementById('logoutButton').addEventListener('click', async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    localStorage.clear();
    window.location.href = '/login.html';
  });
});

