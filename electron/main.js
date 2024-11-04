const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require("crypto");
const db = require("./db/database");
const url = require("url");
const Store = require("electron-store");
const store = new Store();
console.log("Main process started");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, `/../dist/hr-tools/browser/index.html`),
      protocol: "file:",
      slashes: true,
    })
  );
  mainWindow.webContents.reloadIgnoringCache();
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("set-key", (event, key) => {
  store.set("key", key);
});

ipcMain.handle("get-key", (event, key) => {
  event.sender.send("key-response", store.get("key"));
});

ipcMain.handle("load-candidates", (event, keyword, sortBy, pageIndex) => {
  console.log("Loading candidates", keyword, sortBy, pageIndex);
  const keywordFormat = `%${keyword}%`;
  db.all(
    "SELECT * FROM candidates WHERE full_name LIKE ? or email LIKE ? or phone_number LIKE ?  ORDER BY ? DESC LIMIT ? OFFSET ?",
    [
      keywordFormat,
      keywordFormat,
      keywordFormat,
      sortBy ?? "lastModified",
      30,
      (pageIndex - 1) * 30,
    ],
    (err, rows) => {
      if (err) {
        console.error("Error loading candidates:", err);
        event.sender.send("candidates-response", []);
      }
      event.sender.send("candidates-response", rows ?? []);
    }
  );
});

ipcMain.handle("upload-cv", async (event) => {
  return onUpload(event);
});

ipcMain.handle("save-candidates", async (event, candidates) => {
  const filePath = path.join(__dirname, "../data/candidate.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify({ datas: candidates }, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Error saving candidate:", error);
    return { error: "Failed to save candidate" };
  }
});

ipcMain.handle("preview-file", (event, filePath) => {
  // check file path exists
  if (!fs.existsSync(filePath)) {
    return;
  }
  // open file
  shell.openPath(filePath);
});
ipcMain.handle("delete-candidate", (event, id) => {
  db.run("DELETE FROM candidates WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Error deleting candidate:", err);
      return { error: "Failed to delete candidate" };
    }
    event.sender.send("candidate-uploaded", id);
    return { success: true };
  });
});

ipcMain.handle("update-candidate", (event, candidate) => {
  const fields = Object.keys(candidate)
    .filter((key) => key !== "id") // Loại bỏ trường 'id' vì nó không cần thiết trong phần SET
    .map((key) => `${key} = ?`)
    .join(", "); // Tạo câu lệnh SET

  const values = Object.keys(candidate)
    .filter((key) => key !== "id")
    .map((key) => candidate[key]);
  values.push(candidate.id); // Thêm ID vào cuối mảng giá trị để sử dụng trong WHERE
  db.run(`UPDATE candidates SET ${fields} WHERE id = ?`, values, (err) => {
    console.log("Updated candidate", fields, values);
    if (err) {
      console.error("Error updating candidate:", err);
      return { error: "Failed to update candidate" };
    }

    event.sender.send("candidate-uploaded", candidate);
    return { success: true };
  });
});

async function onUpload(event) {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"], // Open a file
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    console.log("Selected file:", filePath);

    // Read the file as a buffer
    fs.readFile(filePath, async (err, content) => {
      if (err) {
        console.error(err);
        return;
      }

      const dataBuffer = await content;
      if (!dataBuffer) {
        return;
      }
      const data = await pdf(dataBuffer);
      if (!store.get("key")) {
        console.warn(
          "No API key found. Please set your API key in the settings."
        );
        event.sender.send("key-response", null);
        return;
      }
      const genAI = new GoogleGenerativeAI(store.get("key"));
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt =
        `Extract and format the following information into JSON: name, age, phone number, birthday(yyyy-mm-dd), experience (with format body: title, description, company, time), education (with format body: institution, years, major, degree),  summary from the text: ` +
        data.text;
      let response;
      try {
        response = await model.generateContent(prompt);
      } catch (e) {
        console.log("Error", e);
        event.sender.send("key-response", null);
      }

      const candidate = response.response.candidates[0];
      const part = candidate.content.parts[0];
      const text = part.text
        .slice(
          part.text.indexOf("```") + 3,
          part.text.indexOf("```", part.text.indexOf("```") + 3)
        )
        .slice(4);
      const res = JSON.parse(text);
      // convert IGeminiExactFromCVResponse to Candidate
      const newCandidate = {
        id: crypto.randomUUID(),
        full_name: res.name,
        day_of_birth: res.birthday,
        phone_number: res.phone_number,
        email: res.email,
        address: res.address,
        education: res.education
          .map(
            (edu) =>
              `<li>${edu.institution}, ${edu.years}, ${edu.major}, ${edu.degree}</li>`
          )
          .join(""),
        position_candidate: res.position_candidate,
        experience: res.experience
          .map(
            (exp) =>
              `<li>${exp.title}, ${exp.description}, ${exp.company}, ${exp.time}</li>`
          )
          .join(""),
        summary: res.summary,
        department_apply: "",
        position_apply: "",
        date_apply: "",
        date_interview: "",
        result_interview: "",
        time_probation: undefined,
        date_official: "",
        note: "",
        lastModified: new Date().toISOString(),
        filePath: result.filePaths[0],
      };

      // save to database
      db.run(
        "INSERT INTO candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        newCandidate.id ?? "",
        newCandidate.full_name ?? "",
        newCandidate.day_of_birth ?? "",
        newCandidate.phone_number ?? "",
        newCandidate.email ?? "",
        newCandidate.address ?? "",
        newCandidate.education ?? "",
        newCandidate.position_candidate ?? "",
        newCandidate.experience ?? "",
        newCandidate.summary ?? "",
        newCandidate.department_apply ?? "",
        newCandidate.position_apply ?? "",
        newCandidate.date_apply ?? "",
        newCandidate.date_interview ?? "",
        newCandidate.result_interview ?? "",
        newCandidate.time_probation ?? "",
        newCandidate.date_official ?? "",
        newCandidate.note ?? "",
        newCandidate.lastModified ?? "",
        newCandidate.filePath ?? "",
        (err) => {
          if (err) {
            console.error("Error saving candidate:", err.message);
          } else {
            console.log("Candidate saved successfully");
          }
        }
      );
      event.sender.send("candidate-uploaded", newCandidate);
      return newCandidate;
    });
  }
}

require("electron-reload")(__dirname, {
  electron: require(`${__dirname}/../../node_modules/electron`),
});
