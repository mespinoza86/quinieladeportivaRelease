const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const axios = require('axios');
const path = require('path');


app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/js/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'private', req.params.filename));
});


app.use(session({
  secret: process.env.SESSION_SECRET || 'quiniela_v2_secret',
  resave: false,
  saveUninitialized: false
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

/* ================= Schemas ================= */





const apiFootballCom = axios.create({
  baseURL: 'https://apiv3.apifootball.com/'
});

const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  emailVerificado: { type: Boolean, default: false },
  verificationToken: String
}, { timestamps: true });

const QuinielaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codigoInvitacion: { type: String, required: true, unique: true },
  activa: { type: Boolean, default: true }
}, { timestamps: true });

const MembershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quinielaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiniela', required: true },
  rol: { type: String, enum: ['admin', 'jugador'], default: 'jugador' }
}, { timestamps: true });

MembershipSchema.index({ userId: 1, quinielaId: 1 }, { unique: true });

const JornadaSchema = new mongoose.Schema({
  quinielaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiniela', required: true },
  nombre: { type: String, required: true },
  partidos: [{
    equipo1: String,
    equipo2: String,
    logoEquipo1: String,
    logoEquipo2: String,
    comodin: { type: Boolean, default: false },
    apiFixtureId: String,
    apiLeagueId: String,
    apiDate: String,
    apiStatus: String
  }],
  fechaCierre: Date
}, { timestamps: true });

JornadaSchema.index({ quinielaId: 1, nombre: 1 }, { unique: true });

const PronosticoSchema = new mongoose.Schema({
  quinielaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiniela', required: true },
  jornadaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jornada', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pronosticos: [{
    marcador1: Number,
    marcador2: Number
  }]
}, { timestamps: true });

PronosticoSchema.index({ quinielaId: 1, jornadaId: 1, userId: 1 }, { unique: true });

const ResultadoOficialSchema = new mongoose.Schema({
  quinielaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiniela', required: true },
  jornadaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jornada', required: true },
  resultados: [{
    equipo1: String,
    equipo2: String,
    logoEquipo1: String,
    logoEquipo2: String,
    marcador1: Number,
    marcador2: Number,
    comodin: { type: Boolean, default: false }
  }]
}, { timestamps: true });

ResultadoOficialSchema.index({ quinielaId: 1, jornadaId: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Quiniela = mongoose.model('Quiniela', QuinielaSchema);
const Membership = mongoose.model('Membership', MembershipSchema);
const Jornada = mongoose.model('Jornada', JornadaSchema);
const Pronostico = mongoose.model('Pronostico', PronosticoSchema);
const ResultadoOficial = mongoose.model('ResultadoOficial', ResultadoOficialSchema);

/* ================= Middleware ================= */

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

async function requireQuinielaAdmin(req, res, next) {
  const membership = await Membership.findOne({
    userId: req.session.userId,
    quinielaId: req.params.quinielaId,
    rol: 'admin'
  });

  if (!membership) {
    return res.status(403).json({ error: 'No tienes permisos de administrador para esta quiniela' });
  }

  next();
}

async function requireQuinielaMember(req, res, next) {
  const membership = await Membership.findOne({
    userId: req.session.userId,
    quinielaId: req.params.quinielaId
  });

  if (!membership) {
    return res.status(403).json({ error: 'No perteneces a esta quiniela' });
  }

  req.membership = membership;
  next();
}

/* ================= Auth ================= */

app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      verificationToken
    });

    // Más adelante aquí enviamos correo real.
    console.log(`Token de verificación para ${email}: ${verificationToken}`);

    res.json({
      success: true,
      message: 'Usuario registrado. Falta implementar envío de correo.',
      verificationTokenDev: verificationToken
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});

app.get('/api/auth/verify/:token', async (req, res) => {
  const user = await User.findOne({ verificationToken: req.params.token });

  if (!user) {
    return res.status(400).json({ error: 'Token inválido' });
  }

  user.emailVerificado = true;
  user.verificationToken = '';
  await user.save();

  res.json({ success: true, message: 'Correo verificado correctamente' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);

  if (!match) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  req.session.userId = user._id.toString();

  res.json({
    success: true,
    user: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      emailVerificado: user.emailVerificado
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId).select('-passwordHash -verificationToken');
  res.json(user);
});

/* ================= Quinielas ================= */

app.post('/api/quinielas', requireAuth, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la quiniela es obligatorio' });
    }

    const codigoInvitacion = crypto.randomBytes(4).toString('hex').toUpperCase();

    const quiniela = await Quiniela.create({
      nombre,
      descripcion,
      ownerUserId: req.session.userId,
      codigoInvitacion
    });

    await Membership.create({
      userId: req.session.userId,
      quinielaId: quiniela._id,
      rol: 'admin'
    });

    res.json({ success: true, quiniela });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando quiniela' });
  }
});

app.get('/api/quinielas/mias', requireAuth, async (req, res) => {
  const memberships = await Membership.find({ userId: req.session.userId })
    .populate('quinielaId');

  res.json(memberships.map(m => ({
    quiniela: m.quinielaId,
    rol: m.rol
  })));
});

app.post('/api/quinielas/unirse', requireAuth, async (req, res) => {
  const { codigoInvitacion } = req.body;

  const quiniela = await Quiniela.findOne({ codigoInvitacion });

  if (!quiniela) {
    return res.status(404).json({ error: 'Código de invitación inválido' });
  }

  const existe = await Membership.findOne({
    userId: req.session.userId,
    quinielaId: quiniela._id
  });

  if (existe) {
    return res.status(400).json({ error: 'Ya perteneces a esta quiniela' });
  }

  await Membership.create({
    userId: req.session.userId,
    quinielaId: quiniela._id,
    rol: 'jugador'
  });

  res.json({ success: true, quiniela });
});

/* ================= Jornadas ================= */

app.get('/api/quinielas/:quinielaId/jornadas', requireAuth, requireQuinielaMember, async (req, res) => {
  const jornadas = await Jornada.find({ quinielaId: req.params.quinielaId }).sort({ createdAt: 1 });
  res.json(jornadas);
});

app.post('/api/quinielas/:quinielaId/jornadas', requireAuth, requireQuinielaAdmin, async (req, res) => {
  const { nombre, partidos, fechaCierre } = req.body;

  if (!nombre || !Array.isArray(partidos)) {
    return res.status(400).json({ error: 'Nombre y partidos son obligatorios' });
  }

  const jornada = await Jornada.findOneAndUpdate(
    {
      quinielaId: req.params.quinielaId,
      nombre
    },
    {
      quinielaId: req.params.quinielaId,
      nombre,
      partidos,
      fechaCierre: fechaCierre || null
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, jornada });
});

app.delete('/api/quinielas/:quinielaId/jornadas/:jornadaId', requireAuth, requireQuinielaAdmin, async (req, res) => {
  const { quinielaId, jornadaId } = req.params;

  await Jornada.deleteOne({ _id: jornadaId, quinielaId });
  await Pronostico.deleteMany({ jornadaId, quinielaId });
  await ResultadoOficial.deleteMany({ jornadaId, quinielaId });

  res.json({ success: true });
});

function numeroSeguro(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = Number(valor);
  return Number.isNaN(n) ? '' : n;
}

function marcador90Minutos(fixture) {
  return {
    marcador1: numeroSeguro(
      fixture.match_hometeam_ft_score ||
      fixture.match_hometeam_score
    ),
    marcador2: numeroSeguro(
      fixture.match_awayteam_ft_score ||
      fixture.match_awayteam_score
    )
  };
}


app.get('/api/football/fixtures', requireAuth, async (req, res) => {
  try {
    const { date, from, to, league } = req.query;

    if (!process.env.APIFOOTBALL_COM_KEY) {
      return res.status(500).json({
        error: 'Falta configurar APIFOOTBALL_COM_KEY en el .env'
      });
    }

    const fechaInicio = from || date;
    const fechaFin = to || date;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: 'Debe enviar date=YYYY-MM-DD o from/to'
      });
    }

    const params = {
      action: 'get_events',
      from: fechaInicio,
      to: fechaFin,
      APIkey: process.env.APIFOOTBALL_COM_KEY
    };

    if (league) {
      params.league_id = league;
    }

    const response = await apiFootballCom.get('', { params });

    if (!Array.isArray(response.data)) {
      return res.json([]);
    }

    const partidos = response.data.map(item => ({
      apiFixtureId: String(item.match_id),
      fecha: `${item.match_date} ${item.match_time}`,
      estado: item.match_status || 'NS',
      minuto: null,
      liga: item.league_name || '',
      pais: item.country_name || '',
      temporada: '',
      apiLeagueId: String(item.league_id),
      equipo1: item.match_hometeam_name,
      equipo2: item.match_awayteam_name,
      logoEquipo1: item.team_home_badge || '',
      logoEquipo2: item.team_away_badge || '',
      marcador1: item.match_hometeam_score !== '' ? Number(item.match_hometeam_score) : null,
      marcador2: item.match_awayteam_score !== '' ? Number(item.match_awayteam_score) : null
    }));

    res.json(partidos);

  } catch (error) {
    console.error('Error consultando APIfootball:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error consultando partidos externos' });
  }
});


app.post('/api/quinielas/:quinielaId/jornadas/:jornadaId/sync-resultados-oficiales',
  requireAuth,
  requireQuinielaAdmin,
  async (req, res) => {
    try {
      const { quinielaId, jornadaId } = req.params;

      const jornada = await Jornada.findOne({ _id: jornadaId, quinielaId });

      if (!jornada) {
        return res.status(404).json({ error: 'Jornada no encontrada' });
      }

      const resultados = [];

      for (const partido of jornada.partidos) {
        if (!partido.apiFixtureId) {
          resultados.push({
            equipo1: partido.equipo1,
            equipo2: partido.equipo2,
            logoEquipo1: partido.logoEquipo1 || '',
            logoEquipo2: partido.logoEquipo2 || '',
            marcador1: '',
            marcador2: '',
            comodin: partido.comodin
          });
          continue;
        }

        const response = await apiFootballCom.get('', {
          params: {
            action: 'get_events',
            match_id: partido.apiFixtureId,
            APIkey: process.env.APIFOOTBALL_COM_KEY
          }
        });

        const fixture = Array.isArray(response.data) ? response.data[0] : null;

        if (!fixture) {
          resultados.push({
            equipo1: partido.equipo1,
            equipo2: partido.equipo2,
            logoEquipo1: partido.logoEquipo1 || '',
            logoEquipo2: partido.logoEquipo2 || '',
            marcador1: '',
            marcador2: '',
            comodin: partido.comodin
          });
          continue;
        }

        const marcador = marcador90Minutos(fixture);

        resultados.push({
          equipo1: fixture.match_hometeam_name || partido.equipo1,
          equipo2: fixture.match_awayteam_name || partido.equipo2,
          logoEquipo1: partido.logoEquipo1 || '',
          logoEquipo2: partido.logoEquipo2 || '',
          marcador1: marcador.marcador1,
          marcador2: marcador.marcador2,
          comodin: partido.comodin
        });
      }

      res.json({
        success: true,
        resultados
      });

    } catch (error) {
      console.error('Error sync API:', error.response?.data || error.message);
      res.status(500).json({ error: 'Error actualizando desde API' });
    }
  }
);

/* ================= Pronósticos ================= */

app.post('/api/quinielas/:quinielaId/jornadas/:jornadaId/pronosticos', requireAuth, requireQuinielaMember, async (req, res) => {
  const { quinielaId, jornadaId } = req.params;
  const { pronosticos } = req.body;

  const jornada = await Jornada.findOne({ _id: jornadaId, quinielaId });

  if (!jornada) {
    return res.status(404).json({ error: 'Jornada no encontrada' });
  }

  if (jornada.fechaCierre && new Date(jornada.fechaCierre) <= new Date()) {
    return res.status(400).json({ error: 'La jornada ya cerró' });
  }

  const doc = await Pronostico.findOneAndUpdate(
    {
      quinielaId,
      jornadaId,
      userId: req.session.userId
    },
    {
      quinielaId,
      jornadaId,
      userId: req.session.userId,
      pronosticos
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, pronostico: doc });
});

app.get('/api/quinielas/:quinielaId/miembros',
  requireAuth,
  requireQuinielaAdmin,
  async (req, res) => {

    const miembros = await Membership.find({
      quinielaId: req.params.quinielaId
    }).populate('userId', 'nombre email');

    res.json(miembros);
  }
);

app.put('/api/quinielas/:quinielaId/miembros/:membershipId/rol',
  requireAuth,
  requireQuinielaAdmin,
  async (req, res) => {

    const { rol } = req.body;

    if (!['admin', 'jugador'].includes(rol)) {
      return res.status(400).json({
        error: 'Rol inválido'
      });
    }

    const membership = await Membership.findOne({
      _id: req.params.membershipId,
      quinielaId: req.params.quinielaId
    });

    if (!membership) {
      return res.status(404).json({
        error: 'Miembro no encontrado'
      });
    }

    membership.rol = rol;
    await membership.save();

    res.json({
      success: true
    });
  }
);

app.delete('/api/quinielas/:quinielaId/miembros/:membershipId',
  requireAuth,
  requireQuinielaAdmin,
  async (req, res) => {

    const membership = await Membership.findOne({
      _id: req.params.membershipId,
      quinielaId: req.params.quinielaId
    });

    if (!membership) {
      return res.status(404).json({
        error: 'Miembro no encontrado'
      });
    }

    await Pronostico.deleteMany({
      quinielaId: req.params.quinielaId,
      userId: membership.userId
    });

    await Membership.deleteOne({
      _id: membership._id
    });

    res.json({
      success: true
    });
  }
);




app.get('/api/quinielas/:quinielaId/jornadas/:jornadaId/pronosticos', requireAuth, requireQuinielaMember, async (req, res) => {
  const { quinielaId, jornadaId } = req.params;

  const pronosticos = await Pronostico.find({ quinielaId, jornadaId })
    .populate('userId', 'nombre email');

  res.json(pronosticos);
});

function resultadoPartido(m1, m2) {
  if (m1 > m2) return 'gano';
  if (m1 < m2) return 'perdio';
  return 'empato';
}

function calcularPuntos(pronostico, oficial) {
  if (!pronostico || !oficial) return 0;

  const valores = [
    pronostico.marcador1,
    pronostico.marcador2,
    oficial.marcador1,
    oficial.marcador2
  ];

  const validos = valores.every(v =>
    v !== null &&
    v !== undefined &&
    v !== '' &&
    !Number.isNaN(Number(v))
  );

  if (!validos) return 0;

  const p1 = Number(pronostico.marcador1);
  const p2 = Number(pronostico.marcador2);
  const o1 = Number(oficial.marcador1);
  const o2 = Number(oficial.marcador2);

  const comodin = !!oficial.comodin;

  if (p1 === o1 && p2 === o2) {
    return comodin ? 7 : 5;
  }

  if (resultadoPartido(p1, p2) === resultadoPartido(o1, o2)) {
    return comodin ? 4 : 3;
  }

  return 0;
}

app.get('/api/quinielas/:quinielaId/tabla-general',
  requireAuth,
  requireQuinielaMember,
  async (req, res) => {
    try {
      const { quinielaId } = req.params;

      const memberships = await Membership.find({ quinielaId })
        .populate('userId', 'nombre email');

      const jornadas = await Jornada.find({ quinielaId }).sort({ createdAt: 1 });

      const tabla = [];

      for (const membership of memberships) {
        const jugador = membership.userId;

        const fila = {
          userId: jugador._id,
          nombre: jugador.nombre,
          email: jugador.email,
          rol: membership.rol,
          jornadas: {},
          total: 0
        };

        for (const jornada of jornadas) {
          const pronosticoDoc = await Pronostico.findOne({
            quinielaId,
            jornadaId: jornada._id,
            userId: jugador._id
          });

          const oficialDoc = await ResultadoOficial.findOne({
            quinielaId,
            jornadaId: jornada._id
          });

          let puntosJornada = 0;

          if (pronosticoDoc && oficialDoc) {
            jornada.partidos.forEach((partido, index) => {
              const pron = pronosticoDoc.pronosticos[index];
              const oficial = oficialDoc.resultados[index];

              puntosJornada += calcularPuntos(pron, oficial);
            });
          }

          fila.jornadas[jornada.nombre] = puntosJornada;
          fila.total += puntosJornada;
        }

        tabla.push(fila);
      }

      tabla.sort((a, b) => b.total - a.total);

      res.json({
        jornadas: jornadas.map(j => ({
          id: j._id,
          nombre: j.nombre
        })),
        tabla
      });

    } catch (error) {
      console.error('Error tabla general:', error);
      res.status(500).json({ error: 'Error calculando tabla general' });
    }
  }
);

/* ================= Resultados oficiales ================= */

app.post('/api/quinielas/:quinielaId/jornadas/:jornadaId/resultados-oficiales', requireAuth, requireQuinielaAdmin, async (req, res) => {
  const { quinielaId, jornadaId } = req.params;
  const { resultados } = req.body;

  const doc = await ResultadoOficial.findOneAndUpdate(
    { quinielaId, jornadaId },
    { quinielaId, jornadaId, resultados },
    { upsert: true, new: true }
  );

  res.json({ success: true, resultadosOficiales: doc });
});

app.get('/api/quinielas/:quinielaId/jornadas/:jornadaId/resultados-oficiales', requireAuth, requireQuinielaMember, async (req, res) => {
  const { quinielaId, jornadaId } = req.params;

  const doc = await ResultadoOficial.findOne({ quinielaId, jornadaId });

  res.json(doc || { resultados: [] });
});

/* ================= Health ================= */

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'quiniela-v2' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

