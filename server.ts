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

// Dynamic in-memory configuration (allows user to switch API key and target folder)
let activeCustomServiceAccount: any = null;
let activeTargetFolderName: string = "SPV_DATABASE_BACKUPS";
let activeTargetFolderId: string | null = null;

function parseServiceAccount(raw: any) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function getServiceAccount(customSa?: any) {
  if (customSa) {
    const parsed = parseServiceAccount(customSa);
    if (parsed?.client_email && parsed?.private_key) return parsed;
  }
  if (activeCustomServiceAccount) {
    return activeCustomServiceAccount;
  }
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsedEnv = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);
      if (parsedEnv?.client_email && parsedEnv?.private_key) return parsedEnv;
    } catch {
      // ignore
    }
  }
  return DEFAULT_SERVICE_ACCOUNT_KEY;
}

const SCOPES = ["https://www.googleapis.com/auth/drive"];

function getDriveClient(customSa?: any) {
  const sa = getServiceAccount(customSa);
  if (!sa || !sa.client_email || !sa.private_key) {
    throw new Error("Thông tin Service Account không hợp lệ! Thiếu client_email hoặc private_key.");
  }
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return google.drive({ version: "v3", auth });
}

// Find or create backup folder on Google Drive
async function resolveBackupFolder(
  drive: ReturnType<typeof google.drive>,
  customFolderNameOrId?: string
): Promise<{ folderId: string; folderName: string }> {
  const target = (customFolderNameOrId || activeTargetFolderId || activeTargetFolderName || "SPV_DATABASE_BACKUPS").trim();

  // 1. If target looks like a direct Google Drive folder ID (alphanumeric, underscores/hyphens, length > 20)
  if (target.length >= 20 && !target.includes(" ") && !target.includes("/")) {
    try {
      const folderRes = await drive.files.get({
        fileId: target,
        fields: "id, name, mimeType, trashed",
      });
      if (folderRes.data && !folderRes.data.trashed && folderRes.data.mimeType === "application/vnd.google-apps.folder") {
        return { folderId: folderRes.data.id!, folderName: folderRes.data.name || target };
      }
    } catch {
      // If direct ID lookup fails, fallback to name search
    }
  }

  // 2. Search by folder name
  const folderName = target.length >= 20 && !target.includes(" ") ? activeTargetFolderName || "SPV_DATABASE_BACKUPS" : target;
  try {
    const res = await drive.files.list({
      q: `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
      return { folderId: res.data.files[0].id!, folderName: res.data.files[0].name! };
    }

    // 3. Create folder if not found
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        description: "Thư mục lưu trữ sao lưu dữ liệu hệ thống SPV Logistics & Hải quan",
      },
      fields: "id, name",
    });

    return { folderId: createRes.data.id!, folderName: createRes.data.name! };
  } catch (error) {
    console.error("Lỗi khi tìm/tạo thư mục Google Drive:", error);
    throw error;
  }
}

// 1. Health & Connection Status
app.get("/api/tax-lookup/:taxCode", async (req, res) => {
  try {
    const { taxCode } = req.params;
    const cleanCode = (taxCode || "").replace(/\s+/g, "").replace(/[^0-9-]/g, "");

    if (!cleanCode) {
      return res.status(400).json({ found: false, error: "Mã số thuế không hợp lệ" });
    }

    // 1. Try VietQR
    try {
      const vqrRes = await fetch(`https://api.vietqr.io/v2/business/${cleanCode}`);
      if (vqrRes.ok) {
        const vqrData = (await vqrRes.json()) as any;
        if (vqrData && vqrData.code === "00" && vqrData.data) {
          return res.json({
            found: true,
            taxCode: vqrData.data.taxCode || cleanCode,
            companyName: vqrData.data.name || vqrData.data.shortName || "",
            address: vqrData.data.address || "",
            source: "masothue.com / CSDL Doanh nghiệp",
          });
        }
      }
    } catch {
      // ignore
    }

    // 2. Try thongtindoanhnghiep
    try {
      const ttdnRes = await fetch(`https://api.thongtindoanhnghiep.co/api/company/${cleanCode}`);
      if (ttdnRes.ok) {
        const ttdnData = (await ttdnRes.json()) as any;
        if (ttdnData && (ttdnData.Title || ttdnData.name)) {
          return res.json({
            found: true,
            taxCode: cleanCode,
            companyName: ttdnData.Title || ttdnData.name || "",
            address: ttdnData.Address || ttdnData.address || "",
            source: "masothue.com / CSDL Doanh nghiệp",
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Try masothue.com direct fetch
    try {
      const mstRes = await fetch(`https://masothue.com/${cleanCode}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        }
      });
      if (mstRes.ok) {
        const html = await mstRes.text();
        // Look for JSON-LD or itemprop in HTML
        let companyName = "";
        let address = "";

        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<span[^>]*itemprop=["']name["'][^>]*>([^<]+)<\/span>/i);
        if (titleMatch) {
          companyName = titleMatch[1].replace(/Mã số thuế\s*:\s*\d+/gi, "").trim();
        }

        const addressMatch = html.match(/itemprop=["']address["'][^>]*>([^<]+)</i) ||
                             html.match(/Địa chỉ[^<]*<\/td>\s*<td[^>]*>([^<]+)</i) ||
                             html.match(/<td[^>]*itemprop=["']streetAddress["'][^>]*>([^<]+)</i);
        if (addressMatch) {
          address = addressMatch[1].trim();
        }

        if (companyName) {
          return res.json({
            found: true,
            taxCode: cleanCode,
            companyName,
            address,
            source: "masothue.com",
          });
        }
      }
    } catch {
      // ignore
    }

    res.json({ found: false, taxCode: cleanCode });
  } catch (err: any) {
    res.status(500).json({ found: false, error: err?.message || "Lỗi tra cứu MST" });
  }
});

// 1. Health & Connection Status
app.get("/api/gdrive/status", async (req, res) => {
  try {
    const sa = getServiceAccount();
    const drive = getDriveClient();
    
    // Check drive connection and folder
    const folderInfo = await resolveBackupFolder(drive);
    
    // Count files in folder
    const listRes = await drive.files.list({
      q: `'${folderInfo.folderId}' in parents and trashed=false`,
      fields: "files(id, name, size, createdTime, modifiedTime)",
      orderBy: "createdTime desc",
      pageSize: 10,
    });

    res.json({
      success: true,
      connected: true,
      isCustomKey: !!activeCustomServiceAccount,
      serviceAccount: {
        email: sa.client_email,
        projectId: sa.project_id,
        clientId: sa.client_id,
      },
      folderId: folderInfo.folderId,
      folderName: folderInfo.folderName,
      activeTargetFolderName,
      activeTargetFolderId,
      fileCount: listRes.data.files?.length || 0,
      recentFiles: listRes.data.files || [],
      message: "Kết nối thành công với Google Drive API",
    });
  } catch (error: any) {
    console.error("Lỗi Google Drive API status:", error);
    const sa = getServiceAccount();
    res.status(500).json({
      success: false,
      connected: false,
      isCustomKey: !!activeCustomServiceAccount,
      serviceAccount: {
        email: sa?.client_email || "Chưa thiết lập",
        projectId: sa?.project_id || "N/A",
      },
      error: error?.message || "Không thể kết nối với Google Drive API",
    });
  }
});

// 2. Test a custom Service Account connection
app.post("/api/gdrive/test-connection", async (req, res) => {
  try {
    const { serviceAccountKey } = req.body;
    if (!serviceAccountKey) {
      return res.status(400).json({ success: false, error: "Vui lòng cung cấp nội dung JSON Service Account!" });
    }

    const sa = parseServiceAccount(serviceAccountKey);
    if (!sa || !sa.client_email || !sa.private_key) {
      return res.status(400).json({
        success: false,
        error: "File JSON không hợp lệ! Thiếu trường client_email hoặc private_key.",
      });
    }

    const drive = getDriveClient(sa);
    // Test listing root files
    const testRes = await drive.files.list({
      pageSize: 3,
      fields: "files(id, name)",
    });

    res.json({
      success: true,
      message: "Kiểm tra kết nối thành công!",
      serviceAccount: {
        email: sa.client_email,
        projectId: sa.project_id,
        clientId: sa.client_id,
      },
      accessibleFilesSampleCount: testRes.data.files?.length || 0,
    });
  } catch (error: any) {
    console.error("Lỗi kiểm tra Service Account:", error);
    res.status(400).json({
      success: false,
      error: error?.message || "Xác thực thất bại với Google Drive API. Hãy kiểm tra lại Private Key hoặc quyền chia sẻ.",
    });
  }
});

// 3. Update or reset active Service Account Credentials
app.post("/api/gdrive/config/credentials", async (req, res) => {
  try {
    const { serviceAccountKey, resetToDefault } = req.body;

    if (resetToDefault) {
      activeCustomServiceAccount = null;
      return res.json({
        success: true,
        isCustomKey: false,
        message: "Đã khôi phục về khóa Service Account mặc định (spv-management-contract) thành công!",
        serviceAccount: {
          email: DEFAULT_SERVICE_ACCOUNT_KEY.client_email,
          projectId: DEFAULT_SERVICE_ACCOUNT_KEY.project_id,
        },
      });
    }

    if (!serviceAccountKey) {
      return res.status(400).json({ success: false, error: "Dữ liệu khóa Service Account không được để trống!" });
    }

    const sa = parseServiceAccount(serviceAccountKey);
    if (!sa || !sa.client_email || !sa.private_key) {
      return res.status(400).json({
        success: false,
        error: "File JSON không đúng chuẩn Google Service Account!",
      });
    }

    // Verify key before applying
    const drive = getDriveClient(sa);
    await drive.files.list({ pageSize: 1, fields: "files(id)" });

    // Store as active
    activeCustomServiceAccount = sa;

    res.json({
      success: true,
      isCustomKey: true,
      message: `Đã kết nối thành công với tài khoản: ${sa.client_email}`,
      serviceAccount: {
        email: sa.client_email,
        projectId: sa.project_id,
        clientId: sa.client_id,
      },
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật Service Account:", error);
    res.status(400).json({
      success: false,
      error: error?.message || "Lỗi khi áp dụng khóa Service Account mới",
    });
  }
});

// 4. Update Target Folder Configuration
app.post("/api/gdrive/config/folder", async (req, res) => {
  try {
    const { folderName, folderId } = req.body;

    if (folderName && folderName.trim()) {
      activeTargetFolderName = folderName.trim();
    }
    if (folderId !== undefined) {
      activeTargetFolderId = folderId ? folderId.trim() : null;
    }

    const drive = getDriveClient();
    const resolved = await resolveBackupFolder(drive, activeTargetFolderId || activeTargetFolderName);

    res.json({
      success: true,
      message: `Đã cập nhật thư mục lưu trữ: ${resolved.folderName} (ID: ${resolved.folderId})`,
      folderId: resolved.folderId,
      folderName: resolved.folderName,
      activeTargetFolderName,
      activeTargetFolderId,
    });
  } catch (error: any) {
    console.error("Lỗi cấu hình thư mục:", error);
    res.status(400).json({
      success: false,
      error: error?.message || "Lỗi cấu hình thư mục Google Drive",
    });
  }
});

// 5. List all folders in Google Drive
app.get("/api/gdrive/folders", async (req, res) => {
  try {
    const drive = getDriveClient();
    const listRes = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name, createdTime, modifiedTime, webViewLink)",
      orderBy: "name asc",
      pageSize: 100,
    });

    res.json({
      success: true,
      folders: listRes.data.files || [],
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách thư mục:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi khi lấy danh sách thư mục từ Google Drive",
    });
  }
});

// 6. Create a new folder on Google Drive
app.post("/api/gdrive/folders/create", async (req, res) => {
  try {
    const { folderName, parentFolderId } = req.body;
    if (!folderName || !folderName.trim()) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập tên thư mục cần tạo!" });
    }

    const drive = getDriveClient();
    const requestBody: any = {
      name: folderName.trim(),
      mimeType: "application/vnd.google-apps.folder",
      description: "Thư mục tạo từ hệ thống SPV Logistics",
    };

    if (parentFolderId && parentFolderId.trim()) {
      requestBody.parents = [parentFolderId.trim()];
    }

    const createRes = await drive.files.create({
      requestBody,
      fields: "id, name, webViewLink, createdTime",
    });

    res.json({
      success: true,
      message: `Đã tạo thư mục [${createRes.data.name}] thành công trên Google Drive!`,
      folder: createRes.data,
    });
  } catch (error: any) {
    console.error("Lỗi tạo thư mục Google Drive:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Lỗi khi tạo thư mục trên Google Drive",
    });
  }
});

// 7. List backup files in Google Drive
app.get("/api/gdrive/files", async (req, res) => {
  try {
    const { folderId } = req.query;
    const drive = getDriveClient();
    const resolved = await resolveBackupFolder(drive, folderId as string);

    const listRes = await drive.files.list({
      q: `'${resolved.folderId}' in parents and trashed=false`,
      fields: "files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink, description)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });

    res.json({
      success: true,
      folderId: resolved.folderId,
      folderName: resolved.folderName,
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

// 8. Backup database to Google Drive (supports custom target folder)
app.post("/api/gdrive/backup", async (req, res) => {
  try {
    const { data, backupName, description, createdBy, targetFolderId, targetFolderName } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: "Không có dữ liệu sao lưu!" });
    }

    const drive = getDriveClient();
    const resolved = await resolveBackupFolder(drive, targetFolderId || targetFolderName);

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
        targetFolder: resolved.folderName,
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
      parents: [resolved.folderId],
      description: description || `Sao lưu dữ liệu lúc ${payload.backupInfo.dateFormatted} bởi ${createdBy || "Người dùng"} tại thư mục ${resolved.folderName}`,
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
      message: `Đã sao lưu thành công lên Google Drive: ${fileName} tại thư mục [${resolved.folderName}]`,
      file: uploadRes.data,
      folder: resolved,
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

// 9. Restore database from a specific Google Drive file
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

// 10. Delete a backup file from Google Drive
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

// 11. Live Master Sync (supports custom folder)
app.post("/api/gdrive/sync-master", async (req, res) => {
  try {
    const { data, updatedBy, targetFolderId, targetFolderName } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: "Dữ liệu đồng bộ trống!" });
    }

    const drive = getDriveClient();
    const resolved = await resolveBackupFolder(drive, targetFolderId || targetFolderName);
    const masterFileName = "SPV_Database_Master_Sync.json";

    // Check if master file exists in that folder
    const listRes = await drive.files.list({
      q: `name='${masterFileName}' and '${resolved.folderId}' in parents and trashed=false`,
      fields: "files(id, name)",
    });

    const now = new Date();
    const payload = {
      lastSyncTimestamp: now.toISOString(),
      updatedBy: updatedBy || "SPV System",
      targetFolder: resolved.folderName,
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
          parents: [resolved.folderId],
          description: `Bản đồng bộ tự động thời gian thực của SPV System tại ${resolved.folderName}`,
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
      message: `Đồng bộ Master Database lên Google Drive thành công tại thư mục [${resolved.folderName}]`,
      fileId,
      folder: resolved,
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
