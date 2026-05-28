document.addEventListener('DOMContentLoaded', () => {

  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const jornadaSelect = document.getElementById('jornadaSelect');
  const partidosContainer = document.getElementById('partidosContainer');
  const infoJornada = document.getElementById('infoJornada');

  titulo.textContent = `Jornadas - ${quinielaNombre || ''}`;

  let jornadas = [];

  function logoHTML(url, nombre) {
    if (!url) return '';
    return `
      <img 
        src="${url}" 
        alt="${nombre}" 
        style="
          width:40px;
          height:40px;
          object-fit:contain;
          vertical-align:middle;
          margin-right:8px;
        "
      >
    `;
  }

  function formatearFecha(fechaISO) {
    if (!fechaISO) return 'Sin fecha';

    const fecha = new Date(fechaISO);

    return fecha.toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
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

    infoJornada.innerHTML = `
      <h2>${jornada.nombre}</h2>
      <p>
        <strong>Cierre:</strong>
        ${formatearFecha(jornada.fechaCierre)}
      </p>
    `;

    jornada.partidos.forEach(partido => {

      const div = document.createElement('div');

      div.style.border = '1px solid #ccc';
      div.style.padding = '10px';
      div.style.marginBottom = '10px';

      div.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
        ">

          <div style="
            display:flex;
            align-items:center;
            width:40%;
          ">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <strong>${partido.equipo1}</strong>
          </div>

          <div style="
            font-size:20px;
            font-weight:bold;
          ">
            VS
          </div>

          <div style="
            display:flex;
            align-items:center;
            justify-content:flex-end;
            width:40%;
          ">
            <strong>${partido.equipo2}</strong>
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>

        </div>

        ${
          partido.comodin
            ? `
              <div style="
                margin-top:10px;
                color:red;
                font-weight:bold;
              ">
                ⭐ Partido comodín
              </div>
            `
            : ''
        }
      `;

      partidosContainer.appendChild(div);
    });
  }

  jornadaSelect.addEventListener('change', () => {
    mostrarJornada(jornadaSelect.value);
  });

  cargarJornadas();

});