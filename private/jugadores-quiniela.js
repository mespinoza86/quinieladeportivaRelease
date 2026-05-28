document.addEventListener('DOMContentLoaded', () => {

  const quinielaId = localStorage.getItem('quinielaId');
  const quinielaRol = localStorage.getItem('quinielaRol');
  const quinielaNombre = localStorage.getItem('quinielaNombre');

  if (!quinielaId) {
    window.location.href = '/mis-quinielas.html';
    return;
  }

  if (quinielaRol !== 'admin') {
    alert('No tienes permisos.');
    window.location.href = '/dashboard.html';
    return;
  }

  const titulo = document.getElementById('titulo');
  const miembrosContainer = document.getElementById('miembrosContainer');

  titulo.textContent = `Jugadores - ${quinielaNombre || ''}`;

  async function cargarMiembros() {

    miembrosContainer.innerHTML = '<p>Cargando miembros...</p>';

    const res = await fetch(
      `/api/quinielas/${quinielaId}/miembros`,
      {
        credentials: 'include'
      }
    );

    if (!res.ok) {
      miembrosContainer.innerHTML = '<p>Error cargando miembros.</p>';
      return;
    }

    const miembros = await res.json();

    renderMiembros(miembros);
  }

  function renderMiembros(miembros) {

    miembrosContainer.innerHTML = '';

    if (!miembros.length) {
      miembrosContainer.innerHTML = '<p>No hay miembros.</p>';
      return;
    }

    miembros.forEach(miembro => {

      const div = document.createElement('div');

      div.style.border = '1px solid #ccc';
      div.style.padding = '12px';
      div.style.marginBottom = '12px';

      div.innerHTML = `
        <h3>${miembro.userId?.nombre || 'Usuario'}</h3>

        <p>${miembro.userId?.email || ''}</p>

        <p>
          <strong>Rol actual:</strong>
          ${miembro.rol}
        </p>

        <select class="rolSelect">
          <option value="jugador" ${miembro.rol === 'jugador' ? 'selected' : ''}>
            Jugador
          </option>

          <option value="admin" ${miembro.rol === 'admin' ? 'selected' : ''}>
            Admin
          </option>
        </select>

        <button class="guardarRolButton">
          Cambiar rol
        </button>

        <button class="expulsarButton">
          Expulsar
        </button>
      `;

      const rolSelect = div.querySelector('.rolSelect');
      const guardarRolButton = div.querySelector('.guardarRolButton');
      const expulsarButton = div.querySelector('.expulsarButton');

      guardarRolButton.addEventListener('click', async () => {

        const nuevoRol = rolSelect.value;

        const confirmar = confirm(
          `¿Cambiar rol a ${nuevoRol}?`
        );

        if (!confirmar) return;

        const res = await fetch(
          `/api/quinielas/${quinielaId}/miembros/${miembro._id}/rol`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              rol: nuevoRol
            })
          }
        );

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || 'Error cambiando rol');
          return;
        }

        alert('Rol actualizado');

        cargarMiembros();
      });

      expulsarButton.addEventListener('click', async () => {

        const confirmar = confirm(
          `¿Expulsar a ${miembro.userId?.nombre}?`
        );

        if (!confirmar) return;

        const res = await fetch(
          `/api/quinielas/${quinielaId}/miembros/${miembro._id}`,
          {
            method: 'DELETE',
            credentials: 'include'
          }
        );

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || 'Error expulsando jugador');
          return;
        }

        alert('Jugador expulsado');

        cargarMiembros();
      });

      miembrosContainer.appendChild(div);
    });
  }

  cargarMiembros();

});