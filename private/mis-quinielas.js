document.addEventListener('DOMContentLoaded', () => {
  const nombreQuinielaInput = document.getElementById('nombreQuinielaInput');
  const descripcionQuinielaInput = document.getElementById('descripcionQuinielaInput');
  const crearQuinielaButton = document.getElementById('crearQuinielaButton');

  const codigoInvitacionInput = document.getElementById('codigoInvitacionInput');
  const unirseButton = document.getElementById('unirseButton');

  const quinielasContainer = document.getElementById('quinielasContainer');
  const mensaje = document.getElementById('mensaje');

  async function cargarMisQuinielas() {
    const res = await fetch('/api/quinielas/mias', {
      credentials: 'include'
    });

    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }

    const data = await res.json();

    quinielasContainer.innerHTML = '';

    data.forEach(item => {
      const div = document.createElement('div');

      div.innerHTML = `
        <h3>${item.quiniela.nombre}</h3>
        <p>Rol: ${item.rol}</p>
        <p>Código: ${item.quiniela.codigoInvitacion}</p>
        <button data-id="${item.quiniela._id}" data-rol="${item.rol}">
          Entrar
        </button>
      `;

      div.querySelector('button').addEventListener('click', () => {
        localStorage.setItem('quinielaId', item.quiniela._id);
        localStorage.setItem('quinielaRol', item.rol);
        localStorage.setItem('quinielaNombre', item.quiniela.nombre);

        window.location.href = '/dashboard.html';
      });

      quinielasContainer.appendChild(div);
    });
  }

  crearQuinielaButton.addEventListener('click', async () => {
    const res = await fetch('/api/quinielas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        nombre: nombreQuinielaInput.value.trim(),
        descripcion: descripcionQuinielaInput.value.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error creando quiniela';
      return;
    }

    nombreQuinielaInput.value = '';
    descripcionQuinielaInput.value = '';
    mensaje.textContent = 'Quiniela creada correctamente';

    cargarMisQuinielas();
  });

  unirseButton.addEventListener('click', async () => {
    const res = await fetch('/api/quinielas/unirse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        codigoInvitacion: codigoInvitacionInput.value.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      mensaje.textContent = data.error || 'Error uniéndose a quiniela';
      return;
    }

    codigoInvitacionInput.value = '';
    mensaje.textContent = 'Te uniste correctamente';

    cargarMisQuinielas();
  });

  cargarMisQuinielas();
});