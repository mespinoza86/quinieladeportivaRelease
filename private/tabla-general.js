document.addEventListener('DOMContentLoaded', () => {
  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const actualizarButton = document.getElementById('actualizarButton');
  const tablaContainer = document.getElementById('tablaContainer');

  titulo.textContent = `Tabla General - ${quinielaNombre || ''}`;

  async function cargarTabla() {
    tablaContainer.innerHTML = '<p>Cargando tabla...</p>';

    const res = await fetch(`/api/quinielas/${quinielaId}/tabla-general`, {
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

    const data = await res.json();

    if (!res.ok) {
      tablaContainer.innerHTML = `<p>${data.error || 'Error cargando tabla'}</p>`;
      return;
    }

    renderTabla(data.jornadas, data.tabla);
  }

  function renderTabla(jornadas, tabla) {
    if (!tabla.length) {
      tablaContainer.innerHTML = '<p>No hay jugadores en esta quiniela.</p>';
      return;
    }

    const headersJornadas = jornadas.map(j => `<th>${j.nombre}</th>`).join('');

    tablaContainer.innerHTML = `
      <div style="overflow-x:auto;">
        <table border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jugador</th>
              ${headersJornadas}
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${tabla.map((fila, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${fila.nombre}</td>
                ${jornadas.map(j => `
                  <td>${fila.jornadas[j.nombre] ?? 0}</td>
                `).join('')}
                <td><strong>${fila.total}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  actualizarButton.addEventListener('click', cargarTabla);

  cargarTabla();
});