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
  const buscarPartidosButton = document.getElementById('buscarPartidosButton');
  const crearJornadaButton = document.getElementById('crearJornadaButton');

  const fechaInput = document.getElementById('fechaInput');
  const torneoSelect = document.getElementById('torneoSelect');
  const customLeagueBox = document.getElementById('customLeagueBox');
  const customLeagueNameInput = document.getElementById('customLeagueNameInput');

  const estadoBusqueda = document.getElementById('estadoBusqueda');
  const partidosContainer = document.getElementById('partidosContainer');

  const nombreJornadaInput = document.getElementById('nombreJornadaInput');
  const fechaCierreInput = document.getElementById('fechaCierreInput');
  const horaCierreInput = document.getElementById('horaCierreInput');
  const partidosPreliminaresContainer = document.getElementById('partidosPreliminaresContainer');

  let partidosDisponibles = [];
  let partidosPreliminares = [];

  titulo.textContent = `Importar Partidos - ${quinielaNombre || ''}`;

  torneoSelect.addEventListener('change', () => {
    customLeagueBox.style.display = torneoSelect.value === 'custom' ? 'block' : 'none';
  });

  function normalizarTexto(texto) {
    return (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function parseFiltroTorneo(valor) {
    const filtro = {};

    if (!valor || valor === 'custom') return filtro;

    valor.split(';').forEach(parte => {
      const [key, value] = parte.split('=');
      if (key && value) filtro[key.trim()] = value.trim();
    });

    return filtro;
  }

  function esLigaNoPermitida(liga) {
    const texto = normalizarTexto(liga);

    const bloqueadas = [
      'u20', 'u21', 'u23',
      'sub 20', 'sub 21', 'sub 23',
      'reserves', 'reserve',
      'femenil', 'women', 'womens',
      'femenina', 'juvenil', 'youth'
    ];

    return bloqueadas.some(p => texto.includes(normalizarTexto(p)));
  }

  function partidoCoincideConFiltro(partido, filtro) {
    const liga = normalizarTexto(partido.liga);
    const pais = normalizarTexto(partido.pais);

    if (esLigaNoPermitida(partido.liga)) return false;

    if (filtro.country && pais !== normalizarTexto(filtro.country)) {
      return false;
    }

    if (filtro.league_exact) {
      const esperada = normalizarTexto(filtro.league_exact);
      if (liga !== esperada && !liga.includes(esperada)) return false;
    }

    if (filtro.league_contains && !liga.includes(normalizarTexto(filtro.league_contains))) {
      return false;
    }

    if (filtro.league_any) {
      const opciones = filtro.league_any.split('|').map(o => normalizarTexto(o));
      if (!opciones.some(op => liga.includes(op))) return false;
    }

    if (filtro.text) {
      return `${liga} ${pais}`.includes(normalizarTexto(filtro.text));
    }

    return true;
  }

  function convertirFechaHoraCostaRicaAISO(fecha, hora) {
    if (!fecha || !hora) return null;
    return new Date(`${fecha}T${hora}:00-06:00`).toISOString();
  }

  function logoHTML(url, nombre) {
    if (!url) return '';
    return `<img src="${url}" alt="${nombre}" style="width:36px;height:36px;object-fit:contain;">`;
  }

  function mostrarEstado(msg) {
    estadoBusqueda.textContent = msg;
  }

  buscarPartidosButton.addEventListener('click', async () => {
    const fecha = fechaInput.value;

    if (!fecha) {
      alert('Selecciona una fecha');
      return;
    }

    let filtroLiga = torneoSelect.value;

    if (torneoSelect.value === 'custom') {
      filtroLiga = customLeagueNameInput.value.trim();

      if (!filtroLiga) {
        alert('Escribe el texto del torneo que quieres buscar');
        return;
      }
    }

    mostrarEstado('Buscando partidos...');
    partidosContainer.innerHTML = '';
    partidosDisponibles = [];

    const res = await fetch(`/api/football/fixtures?date=${encodeURIComponent(fecha)}`, {
      credentials: 'include'
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarEstado(data.error || 'Error buscando partidos');
      return;
    }

    let partidos = Array.isArray(data) ? data : [];

    if (filtroLiga) {
      const filtro = torneoSelect.value === 'custom'
        ? { text: filtroLiga }
        : parseFiltroTorneo(filtroLiga);

      partidos = partidos.filter(p => partidoCoincideConFiltro(p, filtro));
    }

    partidosDisponibles = partidos;

    if (!partidosDisponibles.length) {
      mostrarEstado('No se encontraron partidos.');
      renderPartidosDisponibles();
      return;
    }

    mostrarEstado(`Se encontraron ${partidosDisponibles.length} partidos.`);
    renderPartidosDisponibles();
  });

  function renderPartidosDisponibles() {
    partidosContainer.innerHTML = '';

    if (!partidosDisponibles.length) return;

    const agregarBtn = document.createElement('button');
    agregarBtn.textContent = 'Agregar seleccionados a la jornada';
    agregarBtn.addEventListener('click', agregarSeleccionados);
    partidosContainer.appendChild(agregarBtn);

    partidosDisponibles.forEach((partido, index) => {
      const yaAgregado = partidosPreliminares.some(p => p.apiFixtureId === partido.apiFixtureId);

      const div = document.createElement('div');
      div.style.border = '1px solid #ccc';
      div.style.padding = '12px';
      div.style.marginBottom = '12px';

      div.innerHTML = `
        <label>
          <input type="checkbox" class="partidoCheck" data-index="${index}" ${yaAgregado ? 'disabled' : ''}>
          ${yaAgregado ? 'Ya agregado' : 'Seleccionar'}
        </label>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:8px;width:35%;">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <strong>${partido.equipo1}</strong>
          </div>

          <strong>VS</strong>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;width:35%;">
            <strong>${partido.equipo2}</strong>
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>
        </div>

        <p>${partido.liga || ''} ${partido.pais || ''}</p>
        <p>${partido.fecha || ''} | Estado: ${partido.estado || ''}</p>

        <label>
          <input type="checkbox" class="comodinCheck" data-index="${index}" ${yaAgregado ? 'disabled' : ''}>
          Comodín
        </label>
      `;

      partidosContainer.appendChild(div);
    });
  }

  function agregarSeleccionados() {
    const checks = document.querySelectorAll('.partidoCheck:checked');
    let agregados = 0;

    checks.forEach(check => {
      const index = Number(check.dataset.index);
      const partido = partidosDisponibles[index];

      if (partidosPreliminares.some(p => p.apiFixtureId === partido.apiFixtureId)) return;

      const comodinCheck = document.querySelector(`.comodinCheck[data-index="${index}"]`);

      partidosPreliminares.push({
        equipo1: partido.equipo1,
        equipo2: partido.equipo2,
        logoEquipo1: partido.logoEquipo1 || '',
        logoEquipo2: partido.logoEquipo2 || '',
        comodin: comodinCheck ? comodinCheck.checked : false,
        apiFixtureId: partido.apiFixtureId,
        apiLeagueId: partido.apiLeagueId,
        apiDate: partido.fecha,
        apiStatus: partido.estado
      });

      agregados++;
    });

    if (!agregados) {
      alert('No seleccionaste partidos nuevos.');
      return;
    }

    renderPartidosDisponibles();
    renderPreliminares();
  }

  function renderPreliminares() {
    partidosPreliminaresContainer.innerHTML = '';

    if (!partidosPreliminares.length) {
      partidosPreliminaresContainer.innerHTML = '<p>No hay partidos agregados.</p>';
      return;
    }

    partidosPreliminares.forEach((partido, index) => {
      const div = document.createElement('div');
      div.style.border = '1px solid #ccc';
      div.style.padding = '12px';
      div.style.marginBottom = '12px';

      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:8px;width:35%;">
            ${logoHTML(partido.logoEquipo1, partido.equipo1)}
            <input class="equipo1Edit" data-index="${index}" value="${partido.equipo1}">
          </div>

          <strong>VS</strong>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;width:35%;">
            <input class="equipo2Edit" data-index="${index}" value="${partido.equipo2}">
            ${logoHTML(partido.logoEquipo2, partido.equipo2)}
          </div>
        </div>

        <label>
          Comodín
          <select class="comodinEdit" data-index="${index}">
            <option value="false" ${!partido.comodin ? 'selected' : ''}>No</option>
            <option value="true" ${partido.comodin ? 'selected' : ''}>Sí</option>
          </select>
        </label>

        <button class="quitarBtn" data-index="${index}">Quitar</button>
      `;

      partidosPreliminaresContainer.appendChild(div);
    });

    document.querySelectorAll('.equipo1Edit').forEach(input => {
      input.addEventListener('input', () => {
        partidosPreliminares[Number(input.dataset.index)].equipo1 = input.value.trim();
      });
    });

    document.querySelectorAll('.equipo2Edit').forEach(input => {
      input.addEventListener('input', () => {
        partidosPreliminares[Number(input.dataset.index)].equipo2 = input.value.trim();
      });
    });

    document.querySelectorAll('.comodinEdit').forEach(select => {
      select.addEventListener('change', () => {
        partidosPreliminares[Number(select.dataset.index)].comodin = select.value === 'true';
      });
    });

    document.querySelectorAll('.quitarBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        partidosPreliminares.splice(Number(btn.dataset.index), 1);
        renderPartidosDisponibles();
        renderPreliminares();
      });
    });
  }

  crearJornadaButton.addEventListener('click', async () => {
    const nombre = nombreJornadaInput.value.trim();

    if (!nombre) {
      alert('Debes escribir nombre de jornada');
      return;
    }

    if (!partidosPreliminares.length) {
      alert('Debes agregar partidos');
      return;
    }

    const fechaCierre = convertirFechaHoraCostaRicaAISO(
      fechaCierreInput.value,
      horaCierreInput.value
    );

    if (!fechaCierre) {
      alert('Selecciona fecha y hora de cierre');
      return;
    }

    const res = await fetch(`/api/quinielas/${quinielaId}/jornadas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        nombre,
        partidos: partidosPreliminares,
        fechaCierre
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error creando jornada');
      return;
    }

    alert('Jornada creada correctamente');
    window.location.href = '/admin-jornadas.html';
  });

  renderPreliminares();
});