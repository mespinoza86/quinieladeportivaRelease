document.addEventListener('DOMContentLoaded', () => {
  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaRol = localStorage.getItem('quinielaRol');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  if (quinielaRol !== 'admin') {
    alert('No tienes permisos de administrador.');
    window.location.href = '/dashboard.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const jornadaSelect = document.getElementById('jornadaSelect');
  const partidosContainer = document.getElementById('partidosContainer');
  const cargarGuardadosButton = document.getElementById('cargarGuardadosButton');
  const actualizarApiButton = document.getElementById('actualizarApiButton');
  const guardarButton = document.getElementById('guardarButton');
  const mensaje = document.getElementById('mensaje');

  let jornadas = [];
  let partidosActuales = [];

  titulo.textContent = `Resultados Oficiales - ${quinielaNombre || ''}`;

  function logoHTML(url, nombre) {
    if (!url) return '';
    return `<img src="${url}" alt="${nombre}" style="width:36px;height:36px;object-fit:contain;">`;
  }

  async function cargarJornadas() {
    const res = await fetch(`/api/quinielas/${quinielaId}/jornadas`, {
      credentials: 'include'
    });

    jornadas = await res.json();

    jornadaSelect.innerHTML = '';

    jornadas.forEach((jornada, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = jornada.nombre;
      jornadaSelect.appendChild(option);
    });

    if (jornadas.length > 0) {
      cargarDesdeJornada();
    }
  }

  function jornadaSeleccionada() {
    return jornadas[Number(jornadaSelect.value)];
  }

  function cargarDesdeJornada() {
    const jornada = jornadaSeleccionada();
    if (!jornada) return;

    partidosActuales = jornada.partidos.map(p => ({
      equipo1: p.equipo1,
      equipo2: p.equipo2,
      logoEquipo1: p.logoEquipo1 || '',
      logoEquipo2: p.logoEquipo2 || '',
      marcador1: '',
      marcador2: '',
      comodin: p.comodin
    }));

    renderizar();
  }

  async function cargarGuardados() {
    const jornada = jornadaSeleccionada();
    if (!jornada) return;

    const res = await fetch(
      `/api/quinielas/${quinielaId}/jornadas/${jornada._id}/resultados-oficiales`,
      { credentials: 'include' }
    );

    const data = await res.json();

    if (data.resultados && data.resultados.length > 0) {
      partidosActuales = data.resultados;
    } else {
      cargarDesdeJornada();
      return;
    }

    renderizar();
  }

  async function actualizarDesdeApi() {
    const jornada = jornadaSeleccionada();
    if (!jornada) return;

    mensaje.textContent = 'Actualizando desde API...';

    const res = await fetch(
      `/api/quinielas/${quinielaId}/jornadas/${jornada._id}/sync-resultados-oficiales`,
      {
        method: 'POST',
        credentials: 'include'
      }
    );

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error actualizando desde API';
      return;
    }

    partidosActuales = data.resultados || [];
    renderizar();

    mensaje.textContent = 'Marcadores actualizados en pantalla. No se han guardado todavía.';
  }

  function renderizar() {
    partidosContainer.innerHTML = '';

    partidosActuales.forEach((partido, index) => {
      const div = document.createElement('div');

      div.style.border = '1px solid #ccc';
      div.style.padding = '12px';
      div.style.marginBottom = '12px';

      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">

          <div style="display:flex;align-items:center;gap:8px;width:35%;">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <strong>${partido.equipo1}</strong>
          </div>

          <input
            type="number"
            min="0"
            class="marcador1Input"
            data-index="${index}"
            value="${partido.marcador1 !== null && partido.marcador1 !== undefined ? partido.marcador1 : ''}"
            style="width:60px;"
          >

          <span>-</span>

          <input
            type="number"
            min="0"
            class="marcador2Input"
            data-index="${index}"
            value="${partido.marcador2 !== null && partido.marcador2 !== undefined ? partido.marcador2 : ''}"
            style="width:60px;"
          >

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;width:35%;">
            <strong>${partido.equipo2}</strong>
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>

        </div>

        ${partido.comodin ? '<p style="color:red;font-weight:bold;">⭐ Comodín</p>' : ''}
      `;

      partidosContainer.appendChild(div);
    });
  }

  async function guardarResultados() {
    const jornada = jornadaSeleccionada();
    if (!jornada) return;

    const cards = Array.from(partidosContainer.children);

    const resultados = cards.map((card, index) => {
      const marcador1 = card.querySelector('.marcador1Input').value;
      const marcador2 = card.querySelector('.marcador2Input').value;
      const base = partidosActuales[index];

      return {
        equipo1: base.equipo1,
        equipo2: base.equipo2,
        logoEquipo1: base.logoEquipo1 || '',
        logoEquipo2: base.logoEquipo2 || '',
        marcador1: marcador1 === '' ? null : Number(marcador1),
        marcador2: marcador2 === '' ? null : Number(marcador2),
        comodin: base.comodin
      };
    });

    const confirmar = confirm('¿Guardar resultados oficiales?');
    if (!confirmar) return;

    const res = await fetch(
      `/api/quinielas/${quinielaId}/jornadas/${jornada._id}/resultados-oficiales`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resultados })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error guardando resultados oficiales';
      return;
    }

    mensaje.textContent = 'Resultados oficiales guardados correctamente.';
  }

  jornadaSelect.addEventListener('change', cargarGuardados);
  cargarGuardadosButton.addEventListener('click', cargarGuardados);
  actualizarApiButton.addEventListener('click', actualizarDesdeApi);
  guardarButton.addEventListener('click', guardarResultados);

  cargarJornadas();
});