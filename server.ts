import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT =process.env.PORT || 3000; 
const prisma = new PrismaClient();

const GENDERS = ['Male', 'Female', 'Other'] as const;
const SOURCES = ['Walk-in', 'Referral', 'Online', 'Camp'] as const;

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Prefer snake_case from the client; ignore empty strings so they do not mask a valid sibling key. */
function pickDateOfBirthRaw(body: Record<string, unknown>): unknown {
  const snake = body.date_of_birth;
  const camel = body.dateOfBirth;
  if (typeof snake === 'string' && snake.trim() !== '') return snake.trim();
  if (typeof camel === 'string' && camel.trim() !== '') return camel.trim();
  if (snake != null && typeof snake !== 'string') return snake;
  if (camel != null && typeof camel !== 'string') return camel;
  return undefined;
}

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/patients', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const dobRaw = pickDateOfBirthRaw(b);
  const referringRaw = b.referring_doctor ?? b.referringDoctor;

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const mobileDigits =
    typeof b.mobile === 'string' ? b.mobile.replace(/\D/g, '') : String(b.mobile ?? '').replace(/\D/g, '');
  const pincode =
    typeof b.pincode === 'string' ? b.pincode.trim() : String(b.pincode ?? '').trim();
  const location = typeof b.location === 'string' ? b.location.trim() : '';
  const gender = typeof b.gender === 'string' ? b.gender.trim() : '';
  const source = typeof b.source === 'string' ? b.source.trim() : '';

  const missing: string[] = [];
  if (!name) missing.push('name');
  if (mobileDigits.length !== 10) missing.push('mobile (10 digits)');
  if (!/^\d{6}$/.test(pincode)) missing.push('pincode (6 digits)');
  if (!location) missing.push('location');
  if (!gender) missing.push('gender');
  if (!dobRaw) missing.push('date of birth');
  if (!source) missing.push('source');

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing or invalid: ${missing.join(', ')}.`,
    });
  }

  if (!(GENDERS as readonly string[]).includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender.' });
  }

  if (!(SOURCES as readonly string[]).includes(source)) {
    return res.status(400).json({ error: 'Invalid source.' });
  }

  let dob: Date;
  if (typeof dobRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    dob = new Date(`${dobRaw}T12:00:00`);
  } else {
    dob = new Date(dobRaw as string | number | Date);
  }
  if (Number.isNaN(dob.getTime())) {
    return res.status(400).json({ error: 'Invalid date of birth.' });
  }

  const age = calculateAge(dob);
  if (age < 0 || age > 150) {
    return res.status(400).json({ error: 'Invalid age derived from date of birth.' });
  }

  const emailTrimmed = typeof b.email === 'string' ? b.email.trim() : '';
  if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const referringTrimmed =
    typeof referringRaw === 'string' && referringRaw.trim() !== '' ? referringRaw.trim() : null;

  // Generate a mock UHID. A real system might base this on more factors.
  // We'll generate a random 8-character alphanumeric string or purely numbers
  const uhid = `UHID${Math.floor(10000000 + Math.random() * 90000000)}`;

  try {
    const patient = await prisma.patient.create({
      data: {
        uhid,
        name,
        mobile: mobileDigits,
        age,
        pincode,
        location,
        gender,
        dateOfBirth: dob,
        email: emailTrimmed || null,
        referringDoctor: referringTrimmed,
        source,
      },
    });
    res.status(201).json({ patient });
  } catch (error) {
    console.error('Error inserting patient:', error);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uhid: true,
        name: true,
        mobile: true,
        age: true,
        pincode: true,
        location: true,
        gender: true,
        dateOfBirth: true,
        email: true,
        referringDoctor: true,
        source: true,
        createdAt: true,
      },
    });
    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built Vite static assets
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
