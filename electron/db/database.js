const { Database } = require('sqlite3').verbose();

const db = new Database('candidates.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});


db.serialize(()=> {
  // db.run("DROP TABLE IF EXISTS candidates", (err) => {
  //   if (err) {
  //     console.error("Lỗi khi xóa bảng:", err.message);
  //   } else {
  //     console.log("Bảng 'candidates' đã được xóa thành công.");
  //   }
  // });
  db.run(`CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    day_of_birth TEXT,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    education TEXT,
    position_candidate TEXT,
    experience TEXT,
    summary TEXT,
    department_apply TEXT,
    position_apply TEXT,
    date_apply TEXT,
    date_interview TEXT,
    result_interview TEXT,
    time_probation TEXT,
    date_official TEXT,
    note TEXT,
    lastModified TEXT,
    filePath TEXT
  )`, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("Table 'candidates' is created.");
    }
  });
})

module.exports = db
