// ============================================
// RENDER.COM İÇİN PUPPETEER SERVİSİ
// ============================================

// index.js
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Puppeteer browser konfigürasyonu
const getBrowserConfig = () => {
  // Render.com'da Chromium path'leri
  const possiblePaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    process.env.PUPPETEER_EXECUTABLE_PATH
  ];

  // Mevcut path'i bul
  let executablePath = possiblePaths.find(path => {
    try {
      return path && require('fs').existsSync(path);
    } catch (e) {
      return false;
    }
  });

  return {
    headless: 'new',
    executablePath: executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-accelerated-2d-canvas'
    ]
  };
};

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    status: 'Puppeteer servisi çalışıyor! 🚀',
    endpoints: {
      screenshot: '/screenshot?url=https://pratikaraba.com',
      scrape: '/scrape?url=https://pratikaraba.com',
      pdf: '/pdf?url=https://pratikaraba.com'
    }
  });
});

// Screenshot alma endpoint'i
app.get('/screenshot', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  try {
    const browser = await puppeteer.launch(getBrowserConfig());

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const screenshot = await page.screenshot({ 
      encoding: 'base64',
      fullPage: true 
    });
    
    await browser.close();

    res.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Screenshot alınırken hata oluştu',
      details: error.message 
    });
  }
});

// Web scraping endpoint'i
app.get('/scrape', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  try {
    const browser = await puppeteer.launch(getBrowserConfig());

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Sayfa başlığı ve içeriği al
    const data = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent),
        links: Array.from(document.querySelectorAll('a')).slice(0, 10).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        }))
      };
    });
    
    await browser.close();

    res.json({
      success: true,
      url: url,
      data: data
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Scraping sırasında hata oluştu',
      details: error.message 
    });
  }
});

// PDF oluşturma endpoint'i
app.get('/pdf', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gerekli' });
  }

  try {
    const browser = await puppeteer.launch(getBrowserConfig());

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const pdf = await page.pdf({ 
      format: 'A4',
      printBackground: true
    });
    
    await browser.close();

    res.contentType('application/pdf');
    res.send(pdf);

  } catch (error) {
    res.status(500).json({ 
      error: 'PDF oluşturulurken hata oluştu',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
