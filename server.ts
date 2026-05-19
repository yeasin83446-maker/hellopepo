import express from "express";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import jwt from "jsonwebtoken";
import cors from "cors";
import { verifyAdmin } from "./server/middleware/auth.js";
import { createServer as createViteServer } from "vite";

// Configuration for local JSON DB
const DB_FILE = path.join(process.cwd(), "db.json");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Ensure files exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ files: [], stats: { totalDownloads: 0 } }, null, 2)
  );
}

const getDb = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const saveDb = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.android.package-archive",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(apk|zip|rar|jpg|jpeg|png|gif|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only APK, ZIP, RAR, JPG, PNG, GIF, MP4 are allowed."));
    }
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_for_pepo";

  // ✅ CORS fix - allow all origins
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // ✅ Body size limit fix - 500MB
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  // Serve uploaded files
  app.use("/uploads", express.static(UPLOAD_DIR));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Hello Pepo API is running!" });
  });

  // Auth: Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "admin123") {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token, message: "Logged in successfully" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  // Files: Get all public files
  app.get("/api/files", (req, res) => {
    const db = getDb();
    const { search, category, sort } = req.query;
    let result = db.files.filter((f: any) => f.status === "approved");

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter((f: any) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    if (category && category !== "All") {
      result = result.filter((f: any) => f.category === category);
    }

    if (sort === "Latest") {
      result.sort((a: any, b: any) => b.uploadDate - a.uploadDate);
    } else if (sort === "Most Downloaded") {
      result.sort((a: any, b: any) => b.downloads - a.downloads);
    } else if (sort === "A-Z") {
      result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    }

    res.json(result);
  });

  // Files: Get single file
  app.get("/api/files/:id", (req, res) => {
    const db = getDb();
    const file = db.files.find((f: any) => f.id === req.params.id);
    if (!file || file.status !== "approved") {
      return res.status(404).json({ message: "File not found" });
    }
    res.json(file);
  });

  // Files: Record download
  app.post("/api/files/:id/download", (req, res) => {
    const db = getDb();
    const fileIndex = db.files.findIndex((f: any) => f.id === req.params.id);
    if (fileIndex > -1) {
      db.files[fileIndex].downloads += 1;
      db.stats.totalDownloads += 1;
      saveDb(db);
      res.json({ downloads: db.files[fileIndex].downloads });
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Files: Upload
  app.post("/api/upload", upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]), (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mainFile = files?.file?.[0];
      const thumbnailFile = files?.thumbnail?.[0];

      if (!mainFile) {
        return res.status(400).json({ message: "Main file is required" });
      }

      const { title, description, category, version, tags, captchaAnswer, captchaExpected, updateForId } = req.body;

      if (parseInt(captchaAnswer) !== parseInt(captchaExpected)) {
        fs.unlinkSync(mainFile.path);
        if (thumbnailFile) fs.unlinkSync(thumbnailFile.path);
        return res.status(400).json({ message: "CAPTCHA validation failed" });
      }

      const db = getDb();
      const tagsArray = tags ? tags.split(",").map((t: string) => t.trim()) : [];
      let newFile;

      if (updateForId) {
        const existingFileIndex = db.files.findIndex((f: any) => f.id === updateForId);
        if (existingFileIndex === -1) {
          return res.status(404).json({ message: "Original file not found" });
        }
        const existingFile = db.files[existingFileIndex];
        if (!existingFile.versions) {
          existingFile.versions = [{
            id: existingFile.id + "-v0",
            version: existingFile.version,
            filename: existingFile.filename,
            originalName: existingFile.originalName,
            size: existingFile.size,
            mimeType: existingFile.mimeType,
            uploadDate: existingFile.uploadDate,
            downloads: existingFile.downloads || 0
          }];
        }
        const newVersionObj = {
          id: uuidv4(),
          version,
          filename: mainFile.filename,
          originalName: mainFile.originalname,
          size: mainFile.size,
          mimeType: mainFile.mimetype,
          uploadDate: Date.now(),
          downloads: 0
        };
        existingFile.versions.push(newVersionObj);
        existingFile.version = version;
        existingFile.filename = mainFile.filename;
        existingFile.originalName = mainFile.originalname;
        existingFile.size = mainFile.size;
        existingFile.mimeType = mainFile.mimetype;
        if (title) existingFile.title = title;
        if (description) existingFile.description = description;
        if (category) existingFile.category = category;
        if (tags) existingFile.tags = tagsArray;
        if (thumbnailFile) existingFile.thumbnail = thumbnailFile.filename;
        existingFile.status = "pending";
        db.files[existingFileIndex] = existingFile;
        newFile = existingFile;
      } else {
        newFile = {
          id: uuidv4(),
          title,
          description,
          category,
          version,
          tags: tagsArray,
          filename: mainFile.filename,
          originalName: mainFile.originalname,
          size: mainFile.size,
          mimeType: mainFile.mimetype,
          thumbnail: thumbnailFile ? thumbnailFile.filename : null,
          uploadDate: Date.now(),
          downloads: 0,
          status: "pending",
          versions: [{
            id: uuidv4(),
            version,
            filename: mainFile.filename,
            originalName: mainFile.originalname,
            size: mainFile.size,
            mimeType: mainFile.mimetype,
            uploadDate: Date.now(),
            downloads: 0
          }]
        };
        db.files.push(newFile);
      }

      saveDb(db);
      res.status(201).json({ message: "File uploaded successfully. Waiting for admin approval.", file: newFile });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Admin: Get all files
  app.get("/api/admin/files", verifyAdmin, (req, res) => {
    const db = getDb();
    res.json(db.files);
  });

  // Admin: Get stats
  app.get("/api/admin/stats", verifyAdmin, (req, res) => {
    const db = getDb();
    res.json({
      totalUploads: db.files.length,
      pendingUploads: db.files.filter((f: any) => f.status === "pending").length,
      totalDownloads: db.stats.totalDownloads,
    });
  });

  // Admin: Approve or Delete file
  app.patch("/api/admin/files/:id", verifyAdmin, (req, res) => {
    const { status } = req.body;
    const db = getDb();
    const fileIndex = db.files.findIndex((f: any) => f.id === req.params.id);
    if (fileIndex > -1) {
      if (status === "deleted") {
        const file = db.files[fileIndex];
        try {
          fs.unlinkSync(path.join(UPLOAD_DIR, file.filename));
          if (file.thumbnail) fs.unlinkSync(path.join(UPLOAD_DIR, file.thumbnail));
        } catch (e) {
          console.error("Failed to delete file from disk:", e);
        }
        db.files.splice(fileIndex, 1);
      } else {
        db.files[fileIndex].status = status;
      }
      saveDb(db);
      res.json({ message: "File updated successfully" });
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Vite middleware (dev) or static (prod)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Hello Pepo server running on http://localhost:${PORT}`);
  });
}

startServer();
