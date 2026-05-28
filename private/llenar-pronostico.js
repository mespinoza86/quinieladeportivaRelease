document.addEventListener('DOMContentLoaded', () => {
  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const jornadaSelect = document.getElementById('jornadaSelect');
  const infoJornada = document.getElementById('infoJornada');
  const partidosContainer = document.getElementById('partidosContainer');
  const guardarPronosticoButton = document.getElementById('guardarPronosticoButton');
  const mensaje = document.getElementById('mensaje');

  let jornadas = [];

  titulo.textContent = `Llenar Pronóstico - ${quinielaNombre || ''}`;

  function logoHTML(url, nombre) {
    if (!url) return '';
    return `
      <img
        src="${url}"
        alt="${nombre}"
        style="width:40px;height:40px;object-fit:contain;vertical-align:middle;margin-right:8px;"
      >
    `;
  }

  function formatearFecha(fechaISO) {
    if (!fechaISO) return 'Sin fecha de cierre';

    return new Date(fechaISO).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  function jornadaCerrada(jornada) {
    if (!jornada.fechaCierre) return false;
    return new Date(jornada.fechaCierre) <= new Date();
  }

  async function cargarJornadas() {
    const res = await fetch(`/api/quinielas/${quinielaId}/jornadas`, {
      credentials: 'include'
    });

    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }

    if (res.status === 403) {
      window.location.href = '/dashboard.html';
      return;
    }

    jornadas = await res.json();

    jornadaSelect.innerHTML = '';

    jornadas.forEach((jornada, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = jornada.nombre;
      jornadaSelect.appendChild(option);
    });

    if (jornadas.length > 0) {
      mostrarJornada(0);
    }
  }

  function mostrarJornada(index) {
    const jornada = jornadas[index];

    if (!jornada) return;

    partidosContainer.innerHTML = '';
    mensaje.textContent = '';

    const cerrada = jornadaCerrada(jornada);

    infoJornada.innerHTML = `
      <h2>${jornada.nombre}</h2>
      <p><strong>Cierre:</strong> ${formatearFecha(jornada.fechaCierre)}</p>
      <p><strong>Estado:</strong> ${cerrada ? 'Cerrada' : 'Abierta'}</p>
    `;

    guardarPronosticoButton.disabled = cerrada;

    jornada.partidos.forEach((partido, index) => {
      const div = document.createElement('div');
      div.className = 'partido-card';
      div.dataset.index = index;

      div.style.border = '1px solid #ccc';
      div.style.padding = '12px';
      div.style.marginBottom = '12px';

      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">

          <div style="display:flex;align-items:center;width:35%;">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <strong>${partido.equipo1}</strong>
          </div>

          <input
            type="number"
            min="0"
            class="marcador1Input"
            placeholder="0"
            style="width:60px;"
            ${cerrada ? 'disabled' : ''}
          >

          <span> - </span>

          <input
            type="number"
            min="0"
            class="marcador2Input"
            placeholder="0"
            style="width:60px;"
            ${cerrada ? 'disabled' : ''}
          >

          <div style="display:flex;align-items:center;justify-content:flex-end;width:35%;">
            <strong>${partido.equipo2}</strong>
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>
        </div>

        ${
          partido.comodin
            ? '<p style="color:red;font-weight:bold;">⭐ Partido comodín</p>'
            : ''
        }
      `;

      partidosContainer.appendChild(div);
    });
  }

  async function guardarPronostico() {
    const jornada = jornadas[Number(jornadaSelect.value)];

    if (!jornada) {
      alert('Selecciona una jornada.');
      return;
    }

    if (jornadaCerrada(jornada)) {
      alert('Esta jornada ya cerró.');
      return;
    }

    const pronosticos = [];

    const cards = Array.from(document.querySelectorAll('.partido-card'));

    for (const card of cards) {
      const marcador1 = card.querySelector('.marcador1Input').value;
      const marcador2 = card.querySelector('.marcador2Input').value;

      if (marcador1 === '' || marcador2 === '') {
        alert('Debes llenar todos los marcadores.');
        return;
      }

      pronosticos.push({
        marcador1: Number(marcador1),
        marcador2: Number(marcador2)
      });
    }

    const res = await fetch(
      `/api/quinielas/${quinielaId}/jornadas/${jornada._id}/pronosticos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pronosticos })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error guardando pronóstico';
      return;
    }

    mensaje.textContent = 'Pronóstico guardado correctamente.';
  }

  jornadaSelect.addEventListener('change', () => {
    mostrarJornada(Number(jornadaSelect.value));
  });

  guardarPronosticoButton.addEventListener('click', guardarPronostico);

  cargarJornadas();
});