document.addEventListener('DOMContentLoaded', () => {
  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaRol = localStorage.getItem('quinielaRol');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  const titulo = document.getElementById('titulo');
  const mensaje = document.getElementById('mensaje');

  const nombreJornadaInput = document.getElementById('nombreJornadaInput');
  const equipo1Input = document.getElementById('equipo1Input');
  const equipo2Input = document.getElementById('equipo2Input');
  const comodinInput = document.getElementById('comodinInput');
  const agregarPartidoButton = document.getElementById('agregarPartidoButton');
  const partidosTemporalesList = document.getElementById('partidosTemporalesList');
  const fechaCierreInput = document.getElementById('fechaCierreInput');
  const horaCierreInput = document.getElementById('horaCierreInput');
  const guardarJornadaButton = document.getElementById('guardarJornadaButton');
  const jornadasContainer = document.getElementById('jornadasContainer');

  let partidosTemporales = [];

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  if (quinielaRol !== 'admin') {
    alert('No tienes permisos de administrador en esta quiniela.');
    window.location.href = '/dashboard.html';
    return;
  }

  titulo.textContent = `Administrar Jornadas - ${quinielaNombre || ''}`;

  function convertirFechaHoraCostaRicaAISO(fecha, hora) {
    if (!fecha || !hora) return null;
    return new Date(`${fecha}T${hora}:00-06:00`).toISOString();
  }

  function formatearFecha(fechaISO) {
    if (!fechaISO) return 'Sin cierre';

    const fecha = new Date(fechaISO);

    return fecha.toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  function renderPartidosTemporales() {
    partidosTemporalesList.innerHTML = '';

    partidosTemporales.forEach((partido, index) => {
      const li = document.createElement('li');

      li.innerHTML = `
        ${partido.equipo1} vs ${partido.equipo2}
        ${partido.comodin ? ' - Comodín' : ''}
        <button data-index="${index}">Quitar</button>
      `;

      li.querySelector('button').addEventListener('click', () => {
        partidosTemporales.splice(index, 1);
        renderPartidosTemporales();
      });

      partidosTemporalesList.appendChild(li);
    });
  }

  agregarPartidoButton.addEventListener('click', () => {
    const equipo1 = equipo1Input.value.trim();
    const equipo2 = equipo2Input.value.trim();

    if (!equipo1 || !equipo2) {
      alert('Debes escribir ambos equipos.');
      return;
    }

partidosTemporales.push({
  equipo1,
  equipo2,
  logoEquipo1: logoEquipo1Input.value.trim(),
  logoEquipo2: logoEquipo2Input.value.trim(),
  comodin: comodinInput.checked
});


    equipo1Input.value = '';
    equipo2Input.value = '';
    logoEquipo1Input.value = '';
    logoEquipo2Input.value = '';
    comodinInput.checked = false;

    renderPartidosTemporales();
  });

  guardarJornadaButton.addEventListener('click', async () => {
    const nombre = nombreJornadaInput.value.trim();

    if (!nombre) {
      alert('Debes escribir el nombre de la jornada.');
      return;
    }

    if (partidosTemporales.length === 0) {
      alert('Debes agregar al menos un partido.');
      return;
    }

    const fechaCierre = convertirFechaHoraCostaRicaAISO(
      fechaCierreInput.value,
      horaCierreInput.value
    );

    if (!fechaCierre) {
      alert('Debes seleccionar fecha y hora de cierre.');
      return;
    }

    const res = await fetch(`/api/quinielas/${quinielaId}/jornadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        nombre,
        partidos: partidosTemporales,
        fechaCierre
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error guardando jornada';
      return;
    }

    mensaje.textContent = 'Jornada guardada correctamente';

    nombreJornadaInput.value = '';
    fechaCierreInput.value = '';
    horaCierreInput.value = '';
    partidosTemporales = [];
    renderPartidosTemporales();

    cargarJornadas();
  });

  async function cargarJornadas() {
    const res = await fetch(`/api/quinielas/${quinielaId}/jornadas`, {
      credentials: 'include'
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = '/dashboard.html';
      return;
    }

    const jornadas = await res.json();

    jornadasContainer.innerHTML = '';

    if (!jornadas.length) {
      jornadasContainer.innerHTML = '<p>No hay jornadas creadas.</p>';
      return;
    }

    jornadas.forEach(jornada => {
      const div = document.createElement('div');

      div.innerHTML = `
        <h3>${jornada.nombre}</h3>
        <p>Cierre: ${formatearFecha(jornada.fechaCierre)}</p>
        <ul>
          ${jornada.partidos.map(p => `
            <li>${p.equipo1} vs ${p.equipo2} ${p.comodin ? '(Comodín)' : ''}</li>
          `).join('')}
        </ul>
        <button data-id="${jornada._id}" class="delete-btn">Eliminar jornada</button>
      `;

      div.querySelector('.delete-btn').addEventListener('click', async () => {
        const confirmar = confirm(
          `¿Eliminar la jornada "${jornada.nombre}"?\n\nTambién se eliminarán pronósticos y resultados oficiales.`
        );

        if (!confirmar) return;

        const delRes = await fetch(`/api/quinielas/${quinielaId}/jornadas/${jornada._id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!delRes.ok) {
          alert('Error eliminando jornada');
          return;
        }

        cargarJornadas();
      });

      jornadasContainer.appendChild(div);
    });
  }

  cargarJornadas();
});