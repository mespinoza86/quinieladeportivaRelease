document.addEventListener('DOMContentLoaded', () => {
  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const jornadaSelect = document.getElementById('jornadaSelect');
  const resultadosContainer = document.getElementById('resultadosContainer');

  let jornadas = [];

  titulo.textContent = `Resultados - ${quinielaNombre || ''}`;

  function logoHTML(url, nombre) {
    if (!url) return '';
    return `
      <img
        src="${url}"
        alt="${nombre}"
        style="width:32px;height:32px;object-fit:contain;vertical-align:middle;margin-right:6px;"
      >
    `;
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
      cargarResultados(0);
    }
  }

  async function cargarResultados(index) {
    const jornada = jornadas[index];

    if (!jornada) return;

    resultadosContainer.innerHTML = '<p>Cargando resultados...</p>';

    const res = await fetch(
      `/api/quinielas/${quinielaId}/jornadas/${jornada._id}/pronosticos`,
      { credentials: 'include' }
    );

    if (!res.ok) {
      resultadosContainer.innerHTML = '<p>Error cargando resultados.</p>';
      return;
    }

    const pronosticos = await res.json();

    if (!pronosticos.length) {
      resultadosContainer.innerHTML = '<p>No hay pronósticos guardados para esta jornada.</p>';
      return;
    }

    resultadosContainer.innerHTML = '';

    pronosticos.forEach(item => {
      const divJugador = document.createElement('div');

      divJugador.style.border = '1px solid #ccc';
      divJugador.style.padding = '12px';
      divJugador.style.marginBottom = '16px';

      divJugador.innerHTML = `
        <h2>${item.userId?.nombre || 'Jugador'}</h2>
      `;

      jornada.partidos.forEach((partido, indexPartido) => {
        const pronostico = item.pronosticos[indexPartido];

        const divPartido = document.createElement('div');

        divPartido.style.display = 'flex';
        divPartido.style.alignItems = 'center';
        divPartido.style.justifyContent = 'space-between';
        divPartido.style.borderTop = '1px solid #ddd';
        divPartido.style.padding = '8px 0';

        divPartido.innerHTML = `
          <div style="display:flex;align-items:center;width:35%;">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <strong>${partido.equipo1}</strong>
          </div>

          <div style="font-weight:bold;">
            ${pronostico?.marcador1 ?? '-'} - ${pronostico?.marcador2 ?? '-'}
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;width:35%;">
            <strong>${partido.equipo2}</strong>
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>
        `;

        divJugador.appendChild(divPartido);
      });

      resultadosContainer.appendChild(divJugador);
    });
  }

  jornadaSelect.addEventListener('change', () => {
    cargarResultados(Number(jornadaSelect.value));
  });

  cargarJornadas();
});