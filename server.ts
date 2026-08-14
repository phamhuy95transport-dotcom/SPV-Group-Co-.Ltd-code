import express from "express";
import path from "path";
import { google } from "googleapis";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Google Drive Service Account Credentials provided by user
const DEFAULT_SERVICE_ACCOUNT_KEY = {
  type: "service_account",
  project_id: "spv-management-contract",
  private_key_id: "80007555d4029f193c2ab6e6f5a78fad6873db64",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5iISEjwg3pvPt\nIP5axAd9/DgzkXiOfGRrqcCiREd/Vni/YWfW4iMdoRxdRPEw0vOGPAw39/itItIs\nZoXYxEcrQO+laI0NRnzz6Cy0rglg0VQuH+onCk84/8PTC+w7Y2LgF71WTvk2e2h1\nkXow1z+5rNkc7KY3kiQzmMjwqT1qohbVkH3TAan0o4ghgznYqFNdA2nX3+klJrnu\nxSfp7TDZAbzchrl9VL0e34071UaPz5vb7YFt4RAzEXuqD20ZVpXIgtEFNZtrFlgo\nGqrlW/wy/B0f37FQIzdKkdbC+jPWxhfzJe0CWcBtCY5mjIFaiIQgYRg00tFtjrI4\nCn61MQrzAgMBAAECggEASAs/bhv+dGHTmXJ04nj5cc4FYtzro+Sgt//gSgJagxNo\nauRfhp0kRqaflYYmZC+eGbNqiTc0rMJ3O3+KHOzGuACMrj3Fe/Cxp6Kx7W0hPiO6\n3PhOm99QeRE0ENkx37PNmrgNMR0Uf7f3DaQyfxGucKKyYh1ww+ZvQUvkRzNoomVq\nUl5PCBOnyH5KIRgz15nGXeoMIDcZMYVM0nsZiACPp3kA4p9gFyihUNGjKWowAl5+\n7PwQNR6FwZE0ScAUbGAJ8X5vcuEGXxaTqvU/9k6WsOYvJ8gG4W2TX6vcSvjSFmVk\newZOLX5G2IPmkhvTPHi1VMOPY0ZWzbMqDZqXTYMgkQKBgQDdfuT7XZNpL6mazzgd\nlQ+OJ5tQ1OKMOmNkYDrpYEmAg1PgawwnhWAHf688Qd2eoJiNQ4A5HoXpHSYw08Om\n7uuMbnnkIHIf28bD5gSvE3VMzDQNmUFohuVkEUkmwIMlZZgxQwVGxjrfoxltdYEc\nkAtcV7LO0QZls18z/wonXSp6QwKBgQDWb3ckBBVAsUdrXln4DobKDOXTjEep4FTT\nqQcNgvGg5JkuHYeFCq89FDd+dcgZrpj9FkWQxFdQ89Z7Ca0nVMd4aePQ+vM+J8Dm\n95767yIz0LMWAnMFjHPC4nUvrUUODsMXGvjToB91R5gbXlZb4VmIFD0yJiGdPCE9\nvk8NjRXZkQKBgQCJh8I8hhUC6hJgyqwoSib3eIZLAXSN569RYyMRR7U7889/+Ff6\nrik7Xr/7JVarqUIv7KrQTLCPV4cgKE1C+PUPJIXQ7YiPWZKojsl3wBhEkEL98pwX\ngDMtGEKYqk6ESPngFKJRGMLzm70tJxn9Fz/GnbmsC0PyoBbMHV87o/C9KwKBgGyU\nmo55Js3QNqrOZt4tdOEgsMty7+K7/hgDMdgMow9mUY5BU5rxcxSJhSQavc0LVNpq\niaUpVlFedw9sMeqFik+Vxs7OE5c4h/wsDKthpT75gYU2jkmT+hYHl3Eh2qKopO6x\nMKfwH53CN+o71ZzGuhAmt2oKVuEIToi2Mc9ZzmORAoGAA5835o/lOjLCGVgCTAhF\nS8zGzRvIE6NgrFy52AuJgVknijDQLjDL3YE8MlDEIPWeriUWAE/zMd8uN5HETsje\nQoj1noVG+Q5CGLpU9pIWaAKYXTPL/uiGQjYYnQBjPLwCmhfexMeeFEPA9cKAcsGr\n/e8OAGg97sL1WGGWwaWIHh0=\n-----END PRIVATE KEY-----\n",
  client_email: "spv-group-database-gdrive@spv-management-contract.iam.gserviceaccount.com",
  client_id: "106738076589784964957",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/spv-group-database-gdrive%40spv-management-contract.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

function getServiceAccount() {
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);
    } catch {
      // ignore
    }
  }
  return DEFAULT_SERVICE_ACCOUNT_KEY;
}

const SCOPES = ["https://www.googleapis.com/auth/drive"];

function getDriveClient() {
  const sa = getServiceAccount();
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return google.drive({ version: "v3", auth });
}

// Find or create SPV backup folder on Google Drive
async function getOrCreateBackupFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  const folderName = "SPV_DATABASE_BACKUPS";
  try {
    const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Create folder
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        description: "Thư mục lưu trữ sao lưu dữ liệu hệ thống SPV Logistics & Hải quan",
      },
      fields: "id, name",
    });

    return createRes.data.id!;
  } catch (error) {
    console.error("Lỗi khi tìm/tạo thư mục Google Drive:", error);
    throw error;
  }
}

// 1. Health & Connection Status
app.get("/api/gdrive/status", async (req, res) => {
  try {
    const sa = getServiceAccount();
    const drive = getDriveClient();
    
    // Check drive connection
    const folderId = await getOrCreateBackupFolder(drive);
    
    // Count files in folder
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, size, createdTime, modifiedTime)",
      orderBy: "createdTime desc",
      pageSize: 10,
    });

    res.json({
      success: true,
      connected: true,
      serviceAccount: {
        email: sa.client_email,
        projectId: sa.project_id,
        clientId: sa.client_id,
      },
      folderId,
      folderName: "SPV_DATABASE_BACKUPS",
      fileCount: listRes.data.files?.length || 0,
      recentFiles: listRes.data.files || [],
      message: "Kết nối thành công với Google Drive API (SPV Service Account)",
    });
  } catch (error: any) {
    console.error("Lỗi Google Drive API status:", error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error?.message || "Không thể kết nối với Google Drive API",
    });
  }
});

// 2. List all backup files in Google Drive
app.get("/api/gdrive/files", async (req, res) => {
  try {
    const drive = getDriveClient();
    const folderId = await getOrCreateBackupFolder(drive);

    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink, description)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });

    res.json({
      success: true,
      files: listRes.data.files || [],
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách file Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi lấy danh sách file",
    });
  }
});

// 3. Backup database to Google Drive
app.post("/api/gdrive/backup", async (req, res) => {
  try {
    const { data, backupName, description, createdBy } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: "Không có dữ liệu sao lưu!" });
    }

    const drive = getDriveClient();
    const folderId = await getOrCreateBackupFolder(drive);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const fileName = backupName
      ? `${backupName.replace(/[/\\?%*:|"<>]/g, "_")}_${dateStr}.json`
      : `SPV_Backup_${dateStr}.json`;

    const payload = {
      backupInfo: {
        version: "1.0",
        timestamp: now.toISOString(),
        dateFormatted: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        createdBy: createdBy || "SPV System",
        description: description || "Bản sao lưu cơ sở dữ liệu SPV Logistics & Hải quan",
        itemCounts: {
          shipments: Array.isArray(data.shipments) ? data.shipments.length : 0,
          customs: Array.isArray(data.declarations) ? data.declarations.length : 0,
          users: Array.isArray(data.users) ? data.users.length : 0,
          customers: Array.isArray(data.customers) ? data.customers.length : 0,
          warehouses: Array.isArray(data.warehouses) ? data.warehouses.length : 0,
          transporters: Array.isArray(data.transporters) ? data.transporters.length : 0,
          routes: Array.isArray(data.routes) ? data.routes.length : 0,
          quotations: Array.isArray(data.quotations) ? data.quotations.length : 0,
          advances: Array.isArray(data.advances) ? data.advances.length : 0,
          kpiRates: Array.isArray(data.kpiRates) ? data.kpiRates.length : 0,
        },
      },
      data,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const bufferStream = new Readable();
    bufferStream.push(jsonString);
    bufferStream.push(null);

    const fileMeta = {
      name: fileName,
      parents: [folderId],
      description: description || `Sao lưu dữ liệu lúc ${payload.backupInfo.dateFormatted} bởi ${createdBy || "Người dùng"}`,
      mimeType: "application/json",
    };

    const uploadRes = await drive.files.create({
      requestBody: fileMeta,
      media: {
        mimeType: "application/json",
        body: bufferStream,
      },
      fields: "id, name, size, createdTime, webViewLink, webContentLink",
    });

    res.json({
      success: true,
      message: `Đã sao lưu thành công lên Google Drive: ${fileName}`,
      file: uploadRes.data,
      backupInfo: payload.backupInfo,
    });
  } catch (error: any) {
    console.error("Lỗi sao lưu Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi khi sao lưu dữ liệu lên Google Drive",
    });
  }
});

// 4. Restore database from a specific Google Drive file
app.post("/api/gdrive/restore", async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ success: false, error: "Vui lòng chỉ định fileId cần khôi phục!" });
    }

    const drive = getDriveClient();

    // Get file metadata
    const metaRes = await drive.files.get({
      fileId,
      fields: "id, name, size, createdTime, description",
    });

    // Download content
    const contentRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "json" }
    );

    const backupPayload = contentRes.data as any;
    if (!backupPayload || (!backupPayload.data && !backupPayload.shipments)) {
      return res.status(400).json({
        success: false,
        error: "File sao lưu không đúng định dạng dữ liệu SPV!",
      });
    }

    const restoredData = backupPayload.data ? backupPayload.data : backupPayload;

    res.json({
      success: true,
      message: `Tải thành công bản sao lưu [${metaRes.data.name}] từ Google Drive`,
      fileMeta: metaRes.data,
      backupInfo: backupPayload.backupInfo || null,
      data: restoredData,
    });
  } catch (error: any) {
    console.error("Lỗi khôi phục Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi khi khôi phục dữ liệu từ Google Drive",
    });
  }
});

// 5. Delete a backup file from Google Drive
app.delete("/api/gdrive/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const drive = getDriveClient();

    await drive.files.delete({ fileId });

    res.json({
      success: true,
      message: "Đã xóa bản sao lưu trên Google Drive thành công",
    });
  } catch (error: any) {
    console.error("Lỗi xóa file Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi khi xóa file trên Google Drive",
    });
  }
});

// 6. Live Master Sync (Single continuous file on Drive: SPV_Database_Master_Sync.json)
app.post("/api/gdrive/sync-master", async (req, res) => {
  try {
    const { data, updatedBy } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: "Dữ liệu đồng bộ trống!" });
    }

    const drive = getDriveClient();
    const folderId = await getOrCreateBackupFolder(drive);
    const masterFileName = "SPV_Database_Master_Sync.json";

    // Check if master file exists
    const listRes = await drive.files.list({
      q: `name='${masterFileName}' and '${folderId}' in parents and trashed=false`,
      fields: "files(id, name)",
    });

    const now = new Date();
    const payload = {
      lastSyncTimestamp: now.toISOString(),
      updatedBy: updatedBy || "SPV System",
      data,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const bufferStream = new Readable();
    bufferStream.push(jsonString);
    bufferStream.push(null);

    let fileId: string;
    if (listRes.data.files && listRes.data.files.length > 0) {
      fileId = listRes.data.files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType: "application/json",
          body: bufferStream,
        },
      });
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: masterFileName,
          parents: [folderId],
          description: "Bản đồng bộ tự động thời gian thực của SPV System",
          mimeType: "application/json",
        },
        media: {
          mimeType: "application/json",
          body: bufferStream,
        },
        fields: "id, name",
      });
      fileId = createRes.data.id!;
    }

    res.json({
      success: true,
      message: "Đồng bộ Master Database lên Google Drive thành công",
      fileId,
      lastSyncTimestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Lỗi đồng bộ Master Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi đồng bộ Master Google Drive",
    });
  }
});

// Vite & Static file handling
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`SPV Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
