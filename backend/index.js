const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Use memoryStorage instead of writing to disk (Serverless compatibility)
const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/data', (req, res) => {
  try {
    const dataCsv = path.join(__dirname, 'data.csv');
    const csvString = fs.readFileSync(dataCsv, 'utf8').trim();

    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        res.json(result.data);
      }
    });
  } catch (error) {
    console.error("Error reading initial data:", error);
    res.status(500).json({ error: "Failed to load underlying data" });
  }
});

// Endpoint to handle uploaded CSV files from user
app.post('/api/upload', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const content = req.file.buffer.toString('utf8');
  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      res.json(result.data);
    }
  });
});

// Needed for Vercel serverless to export the app hook, while still allowing local dev!
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
