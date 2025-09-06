require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const app = express();
const multer = require("multer"); // Add this import
const path = require("path");
const excel = require("exceljs");

const bodyParser = require("body-parser");
const {isnull}=require("util")
const port = process.env.PORT || 5000;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    useUTC: true,
    enableArithAbort: true,
    encrypt: false,
    driver: "msnodesqlv8",
  },
  requestTimeout: 600000, // 60 seconds
};

app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Initialize database connection
let poolConnection;
const initializeDatabase = async () => {
  try {
    poolConnection = await sql.connect(config);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

initializeDatabase();

// app.get("/api/login", async (req, res) => {
//   try {
//     const pool = await sql.connect(config);
//     const result = await pool.request().query("SELECT * FROM Mx_UserLogin");
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("Error fetching stages:", err);
//     res.status(500).send("Error fetching stages");
//   }
// });
// Login route
app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("password", sql.VarChar, password)
      .query(
        "SELECT user_id, password, Adminflag FROM Mx_UserLogin WHERE user_id = @userId AND password = @password"
      );

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      res.status(200).json({
        success: true,
        user: {
          user_id: user.user_id,
          Adminflag: user.Adminflag, // 1 = Admin, 0 = Employee
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid user ID or password",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.post("/api/login", async (req, res) => {
  const { userId, password } = req.body;

  try {
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("password", sql.VarChar, password)
      .query(
        "SELECT user_id, password, Adminflag FROM Mx_UserLogin WHERE user_id = @userId AND password = @password"
      );

    if (result.recordset.length > 0) {
      const user = result.recordset[0];

      res.status(200).json({
        success: true,
        user: {
          user_id: user.user_id,
          Adminflag: user.Adminflag, // 1 = Admin, 0 = Employee
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid user ID or password",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.post("/api/change-password", async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  console.log(userId, newPassword, oldPassword);
  try {
    const pool = await sql.connect(config);

    // Step 1: Verify if the old password is correct
    const userCheck = await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("oldPassword", sql.VarChar, oldPassword)
      .query(
        "SELECT * FROM Mx_UserLogin WHERE user_id = @userId AND password = @oldPassword"
      );

    if (userCheck.recordset.length === 0) {
      console.log(
        `Failed login attempt for userId: ${userId} - incorrect password`
      );
      return res
        .status(401)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // Step 2: Update the password to the new one
    await pool
      .request()
      .input("userId", sql.VarChar, userId)
      .input("newPassword", sql.VarChar, newPassword)
      .query(
        "UPDATE Mx_UserLogin SET password = @newPassword WHERE user_id = @userId"
      );

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    console.error("Error in password change:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/api/User-master", async (req, res) => {
  try {
    // Connect to DB
    const pool = await sql.connect(config);

    // Query
    let result = await pool
      .request()
      .query("SELECT user_id, password, Adminflag FROM Mx_UserLogin");

    res.json(result.recordset); // Send result as JSON
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});
// GET user by id
app.get("/api/User-master/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.NVarChar, req.params.id)
      .query(
        "SELECT user_id, password, Adminflag FROM Mx_UserLogin WHERE user_id = @id"
      );
    res.json(result.recordset[0] || null);
  } catch (err) {
    console.error("GET /api/User-master/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - add new user (prevent duplicate user_id)
app.post("/api/User-master", async (req, res) => {
  const { user_id, password, Adminflag } = req.body;
  if (
    !user_id ||
    !password ||
    (Adminflag !== "0" &&
      Adminflag !== "1" &&
      Adminflag !== 0 &&
      Adminflag !== 1)
  ) {
    return res
      .status(400)
      .json({
        error: "user_id, password and Adminflag ('0' or '1') are required",
      });
  }

  try {
    const pool = await sql.connect(config);

    // check duplicate
    const chk = await pool
      .request()
      .input("id", sql.NVarChar, user_id)
      .query("SELECT 1 FROM Mx_UserLogin WHERE user_id = @id");
    if (chk.recordset.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    await pool
      .request()
      .input("id", sql.NVarChar, user_id)
      .input("pwd", sql.NVarChar, password)
      .input("af", sql.NVarChar, String(Adminflag))
      .query(
        "INSERT INTO Mx_UserLogin (user_id, password, Adminflag) VALUES (@id, @pwd, @af)"
      );

    res.status(201).json({ message: "User added" });
  } catch (err) {
    console.error("POST /api/User-master error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - update user (by user_id)
app.put("/api/User-master/:id", async (req, res) => {
  const { password, Adminflag } = req.body;
  const id = req.params.id;
  if (
    !password ||
    (Adminflag !== "0" &&
      Adminflag !== "1" &&
      Adminflag !== 0 &&
      Adminflag !== 1)
  ) {
    return res
      .status(400)
      .json({ error: "password and Adminflag ('0' or '1') are required" });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.NVarChar, id)
      .input("pwd", sql.NVarChar, password)
      .input("af", sql.NVarChar, String(Adminflag))
      .query(
        "UPDATE Mx_UserLogin SET password = @pwd, Adminflag = @af WHERE user_id = @id"
      );

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ message: "User updated" });
  } catch (err) {
    console.error("PUT /api/User-master/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - remove user by user_id


app.post("/api/stage-master", async (req, res) => {
  console.log("post",req.body)
  const { Stage_name, Stage_Type, Stage_Serial } = req.body;

  if (!Stage_name || !Stage_Type || !Stage_Serial) {
    return res
      .status(400)
      .send("Stage_name, Stage_Type and Stage_Serial are required");
  }

  try {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    // Step 1: Shift existing Stage_Serial values to make space
    const request1 = new sql.Request(transaction);
    await request1.input("Stage_Serial", sql.Int, Stage_Serial).query(`
        UPDATE Mx_StageMaster
        SET Stage_Serial = Stage_Serial + 1
        WHERE Stage_Serial >= @Stage_Serial
      `);

    // Step 2: Insert the new stage
    const request2 = new sql.Request(transaction);
    const result = await request2
      .input("Stage_name", sql.NVarChar, Stage_name)
      .input("Stage_Type", sql.NVarChar, Stage_Type)
      .input("Stage_Serial", sql.Int, Stage_Serial).query(`
        INSERT INTO Mx_StageMaster (Stage_name, Stage_Type, Stage_Serial)
        OUTPUT INSERTED.Stage_id, INSERTED.Stage_name, INSERTED.Stage_Type, INSERTED.Stage_Serial
        VALUES (@Stage_name, @Stage_Type, @Stage_Serial)
      `);

    // Step 3: Normalize Stage_Serial (no gaps, start from 1)
    const request3 = new sql.Request(transaction);
    await request3.query(`
      WITH Ordered AS (
        SELECT Stage_id, ROW_NUMBER() OVER (ORDER BY Stage_Serial) AS NewSerial
        FROM Mx_StageMaster
      )
      UPDATE Mx_StageMaster
      SET Stage_Serial = Ordered.NewSerial
      FROM Mx_StageMaster
      INNER JOIN Ordered ON Mx_StageMaster.Stage_id = Ordered.Stage_id
    `);

    await transaction.commit();

    res.status(201).json({
      Stage_id: result.recordset[0].Stage_id,
      Stage_name: result.recordset[0].Stage_name,
      Stage_Type: result.recordset[0].Stage_Type,
      Stage_Serial: result.recordset[0].Stage_Serial,
      message: "Stage inserted successfully, serials normalized",
    });
  } catch (err) {
    console.error("Error adding stage:", err);
    res.status(500).send("Error adding stage");
  }
});


app.get("/api/stage-master", async (req, res) => {
  
  console.log("get")

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Stage_id, Stage_name, Stage_Type, Stage_Serial FROM Mx_StageMaster"
      );
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching stages:", err);
    res.status(500).send("Error fetching stages");
  }
});


app.get("/api/stage-master/types", async (req, res) => {
  console.log("get-types")
  try {

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT DISTINCT Stage_Type FROM Mx_StageMaster WHERE Stage_Type IS NOT NULL"
      );

    const stageTypes = result.recordset.map((row) => row.Stage_Type);
    res.json(stageTypes);
  } catch (err) {
    console.error("Error fetching stage types:", err);
    res.status(500).send("Error fetching stage types");
  }
});

app.put("/api/stage-master/:id", async (req, res) => {
  console.log("put",req.params)
  const { id } = req.params;
  const { Stage_name, Stage_Type, Stage_Serial } = req.body;

  if (!Stage_name || !Stage_Type || Stage_Serial === undefined) {
    return res
      .status(400)
      .send("Stage_name, Stage_Type, and Stage_Serial are required");
  }

  try {
    const pool = await sql.connect(config);

    // ✅ Update the selected stage with new serial
    const updateStageQuery = `
      UPDATE Mx_StageMaster 
      SET Stage_name = @Stage_name, Stage_Type = @Stage_Type, Stage_Serial = @Stage_Serial
      WHERE Stage_id = @Stage_id
    `;
    const updateRequest = pool.request();
    updateRequest.input("Stage_id", sql.Int, id);
    updateRequest.input("Stage_name", sql.NVarChar, Stage_name);
    updateRequest.input("Stage_Type", sql.NVarChar, Stage_Type);
    updateRequest.input("Stage_Serial", sql.Int, Stage_Serial);
    await updateRequest.query(updateStageQuery);

    // ✅ Fetch all stages ordered by Stage_Serial
    const fetchQuery = `
      SELECT Stage_id 
      FROM Mx_StageMaster
      ORDER BY Stage_Serial ASC
    `;
    const fetchResult = await pool.request().query(fetchQuery);

    // ✅ Reassign Stage_Serial values in sequence starting from 1
    let counter = 1;
    for (const row of fetchResult.recordset) {
      const reorderQuery = `
        UPDATE Mx_StageMaster 
        SET Stage_Serial = @Serial 
        WHERE Stage_id = @Stage_id
      `;
      const reorderRequest = pool.request();
      reorderRequest.input("Serial", sql.Int, counter++);
      reorderRequest.input("Stage_id", sql.Int, row.Stage_id);
      await reorderRequest.query(reorderQuery);
    }

    res.status(200).json({
      message: "Stage updated and serials reordered successfully",
    });
  } catch (err) {
    console.error("Error updating stage:", err);
    res.status(500).send("Error updating stage");
  }
});

app.delete("/api/stage-master/:id", async (req, res) => {

  console.log("delete",req.params)
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    const deleteAndResequenceQuery = `
      BEGIN TRANSACTION;

      DECLARE @DeletedSerial INT;

      -- Get the Stage_Serial of the record to delete
      SELECT @DeletedSerial = Stage_Serial
      FROM Mx_StageMaster
      WHERE Stage_Id = @StageId;

      -- If no record found, rollback and return
      IF @DeletedSerial IS NULL
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT 'NOT_FOUND' AS Status;
        RETURN;
      END

      -- Delete the stage
      DELETE FROM Mx_StageMaster
      WHERE Stage_Id = @StageId;

      -- Update Stage_Serial for remaining stages
      UPDATE Mx_StageMaster
      SET Stage_Serial = Stage_Serial - 1
      WHERE Stage_Serial > @DeletedSerial;

      COMMIT TRANSACTION;

      SELECT 'SUCCESS' AS Status;
    `;

    const result = await pool
      .request()
      .input("StageId", sql.Int, id)
      .query(deleteAndResequenceQuery);

    if (result.recordset[0].Status === "NOT_FOUND") {
      return res.status(404).json({ message: "Stage not found" });
    }

    res.status(200).json({ message: "Stage deleted and serials updated successfully" });
  } catch (err) {
    console.error("Error deleting stage:", err);
    res.status(500).send("Error deleting stage");
  }
});

// app.delete("/api/stage-master/:id", async (req, res) => {


//   const { id } = req.params;
//   console.log("delete",req.params)

//   try {
//     const pool = await sql.connect(config);

//     const deleteAndResequenceQuery = `
//       BEGIN TRANSACTION;

//       DECLARE @DeletedSerial INT;

//       -- Get the Stage_Serial of the record to delete
//       SELECT @DeletedSerial = Stage_Serial
//       FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- If no record found, rollback and return
//       IF @DeletedSerial IS NULL
//       BEGIN
//         ROLLBACK TRANSACTION;
//         SELECT 'NOT_FOUND' AS Status;
//         RETURN;
//       END

//       -- Delete the stage
//       DELETE FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- Update Stage_Serial for remaining stages
//       UPDATE Mx_StageMaster
//       SET Stage_Serial = Stage_Serial - 1
//       WHERE Stage_Serial > @DeletedSerial;

//       COMMIT TRANSACTION;

//       SELECT 'SUCCESS' AS Status;
//     `;

//     const result = await pool
//       .request()
//       .input("StageId", sql.Int, id)
//       .query(deleteAndResequenceQuery);

//     if (result.recordset[0].Status === "NOT_FOUND") {
//       return res.status(404).json({ message: "Stage not found" });
//     }

//     res.status(200).json({ message: "Stage deleted and serials updated successfully" });
//   } catch (err) {
//     console.error("Error deleting stage:", err);
//     res.status(500).send("Error deleting stage");
//   }
// });


// app.delete("/api/stage-master/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const pool = await sql.connect(config);

//     const deleteAndUpdateQuery = `
//       BEGIN TRANSACTION;

//       DECLARE @DeletedSerial INT;

//       -- Get the Stage_Serial of the record to delete
//       SELECT @DeletedSerial = Stage_Serial
//       FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- If no record found, rollback and return
//       IF @DeletedSerial IS NULL
//       BEGIN
//         ROLLBACK TRANSACTION;
//         SELECT 'NOT_FOUND' AS Status;
//         RETURN;
//       END

//       -- Delete the record
//       DELETE FROM Mx_StageMaster
//       WHERE Stage_Id = @StageId;

//       -- Decrement Stage_Serial for remaining stages
//       UPDATE Mx_StageMaster
//       SET Stage_Serial = Stage_Serial - 1
//       WHERE Stage_Serial > @DeletedSerial;

//       COMMIT TRANSACTION;

//       SELECT 'SUCCESS' AS Status;
//     `;

//     const result = await pool
//       .request()
//       .input("StageId", sql.Int, id)
//       .query(deleteAndUpdateQuery);

//     if (result.recordset[0].Status === "NOT_FOUND") {
//       return res.status(404).json({ message: "Stage not found" });
//     }

//     res
//       .status(200)
//       .json({ message: "Stage deleted and serials updated successfully" });
//   } catch (err) {
//     console.error("Error deleting stage:", err);
//     res.status(500).send("Error deleting stage");
//   }
// });



// Skill Master - Insert a new skill


app.post("/api/skill-master", async (req, res) => {
  const { Skill_Rating, Skill_Description } = req.body;

  if (!Skill_Rating || !Skill_Description) {
    return res
      .status(400)
      .send("Skill_Rating and Skill_Description are required");
  }

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_Rating", sql.Char, Skill_Rating);
    request.input("Skill_Description", sql.NVarChar, Skill_Description);

    // Check for duplicates
    const duplicateCheck = await request.query(`
      SELECT COUNT(*) AS count
      FROM Mx_SkillMaster
      WHERE Skill_Description = @Skill_Description
    `);

    if (duplicateCheck.recordset[0].count > 0) {
      return res.status(400).send("Skill_Description must be unique.");
    }

    // Insert the new skill
    const result = await request.query(
      `INSERT INTO Mx_SkillMaster (Skill_Rating, Skill_Description) VALUES (@Skill_Rating, @Skill_Description); SELECT SCOPE_IDENTITY() AS Skill_id;`
    );
    res.status(201).json({
      Skill_id: result.recordset[0].Skill_id,
      Skill_Rating: Skill_Rating,
      Skill_Description: Skill_Description,
      message: "Skill inserted successfully",
    });
  } catch (error) {
    console.error("Error inserting skill:", error);
    res.status(500).send(error.message);
  }
});

// Update a skill
app.put("/api/skill-master/:id", async (req, res) => {
  const { id } = req.params;
  const { Skill_Rating, Skill_Description } = req.body;

  if (!Skill_Rating || !Skill_Description) {
    return res
      .status(400)
      .send("Skill_Rating and Skill_Description are required");
  }

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_id", sql.Int, id);
    request.input("Skill_Rating", sql.Char, Skill_Rating);
    request.input("Skill_Description", sql.NVarChar, Skill_Description);
    await request.query(
      `UPDATE Mx_SkillMaster SET Skill_Rating = @Skill_Rating, Skill_Description = @Skill_Description WHERE Skill_id = @Skill_id;`
    );
    res.status(200).json({
      Skill_id: id,
      Skill_Rating: Skill_Rating,
      Skill_Description: Skill_Description,
      message: "Skill updated successfully",
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    res.status(500).send(error.message);
  }
});

// Fetch a skill by ID
app.get("/api/skill-master/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    request.input("Skill_id", sql.Int, id);
    const result = await request.query(
      `SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster WHERE Skill_id = @Skill_id;`
    );
    if (result.recordset.length === 0) {
      res.status(404).send("Skill not found");
    } else {
      res.json(result.recordset[0]);
    }
  } catch (error) {
    console.error("Error fetching skill:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all skills
app.get("/api/skill-master", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster"
      );
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all departments
app.get("/api/departments", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT dptid, NAME AS DeptName FROM Mx_DepartmentMst");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).send(error.message);
  }
});

// Fetch employees by selected departments
app.post("/api/employees", async (req, res) => {
  const { departments } = req.body;
  if (!departments || departments.length === 0) {
    return res.status(400).send("No departments selected");
  }

  try {
    const pool = await sql.connect(config);

    const query = `
      SELECT u.userid, u.name + '-' + u.userid AS name, u.Enrolldt, d.Name AS designation
      FROM Mx_UserMst u
      JOIN Mx_DesignationMst d ON u.Dsgid = d.Dsgid
      WHERE u.dptid IN (${departments.map((dept) => `'${dept}'`).join(",")})
      ORDER BY u.name + '-' + u.userid
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all stages
app.get("/api/stagemaster", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query("SELECT Stage_id, Stage_name FROM Mx_StageMaster");
    res.json(result.recordset);

  } catch (error) {
    console.error("Error fetching stages:", error);
    res.status(500).send(error.message);
  }
});

// Fetch all skills
app.get("/api/skillmaster", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        "SELECT Skill_id, Skill_Rating, Skill_Description FROM Mx_SkillMaster"
      );
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).send(error.message);
  }
});

// Endpoint to save skills for multiple employees
app.post("/api/save-skills", async (req, res) => {
  const { data } = req.body;

  // Validate request data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).send("Invalid data format");
  }

  let transaction;

  try {
    // Connect to the database
    const pool = await sql.connect(config);

    // Begin a new transaction
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Iterate through each employee's skill data to be saved
    for (const employeeData of data) {
      const { employeeId, stages } = employeeData;
      if (!employeeId || !Array.isArray(stages)) {
        throw new Error("Invalid input data");
      }

      await pool
        .request()
        .query(`DELETE FROM Mx_UserSkills WHERE USERID = ${employeeId}`);
      for (const stageData of stages) {
        const { stageId, rating } = stageData;
        if (!stageId || !rating) {
          throw new Error("Invalid stage data");
        }

        console.log(
          `Saving: EmployeeId: ${employeeId}, StageId: ${stageId}, Rating: ${rating}`
        );

        // Execute the SQL query within the transaction
        await transaction.request().query(`
                  INSERT INTO Mx_UserSkills (userid, Stage_id, Skill_id)
                  VALUES (${employeeId}, ${stageId}, ${rating})
              `);
      }
    }

    // Commit the transaction if all queries succeed
    await transaction.commit();
    res.send("Skills saved successfully");
  } catch (error) {
    console.error("Error saving skills:", error);

    // Rollback the transaction on error
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }

    // Respond with an internal server error
    res.status(500).send("Server error");
  }
});

// Fetch user skills
app.get("/api/user-skills", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query(`
          SELECT P2.NAME, P3.STAGE_NAME, P4.Skill_Description, P1.USERID
          FROM Mx_UserSkills AS P1
          LEFT OUTER JOIN Mx_UserMst AS P2 ON P1.USERID = P2.USERID
          LEFT OUTER JOIN MX_STAGEMASTER AS P3 ON P1.STAGE_ID = P3.STAGE_Serial
          LEFT OUTER JOIN MX_SKILLMASTER AS P4 ON P1.SKILL_ID = P4.SKILL_ID order by P3.STAGE_NAME,P2.NAME
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user skills:", error);
    res.status(500).send("Server error");
  }
});

// Delete user skill
app.delete("/api/user-skills/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    let pool = await sql.connect(config);
    await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("DELETE FROM Mx_UserSkills WHERE USERID = @userId");
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting user skill:", error);
    res.status(500).send("Server error");
  }
});

app.post("/api/saveUserSkills", async (req, res) => {
  const skillsData = req.body;

  try {
    // Connect to SQL Server
    await sql.connect(config);
    const request = new sql.Request();

    const batchSize = 50; // Number of records per batch

    for (let i = 0; i < skillsData.length; i += batchSize) {
      let QUERY1 = "";

      // Get the current batch of skills
      const batch = skillsData.slice(i, i + batchSize);

      for (let skill of batch) {
        const { userid, STAGE_NAME, Skill_Description, Skill_Rating } = skill;

        if (QUERY1.length > 0) {
          QUERY1 += " UNION ALL ";
        }
        QUERY1 += `SELECT '${userid}' AS userid, '${STAGE_NAME}' AS STAGE_NAME, '${Skill_Description}' AS Skill_Description, '${Skill_Rating}' AS Skill_Rating`;
      }

      const insertQuery = `
INSERT INTO Mx_UserSkills (userid, Skill_id, Stage_id, Update_at, State)
SELECT Q1.userid, ISNULL(P1.Skill_id, 0) AS Skill_id, ISNULL(P2.Stage_serial, 0) AS Stage_serial, GETDATE() AS Update_at, 1 AS State
FROM (${QUERY1}) AS Q1
LEFT OUTER JOIN Mx_SkillMaster AS P1 
ON LTRIM(RTRIM(LOWER(Q1.Skill_Description))) = LTRIM(RTRIM(LOWER(P1.Skill_Description)))
LEFT OUTER JOIN Mx_StageMaster AS P2 
ON REPLACE(LTRIM(RTRIM(LOWER(Q1.STAGE_NAME))), ' ', '') = REPLACE(LTRIM(RTRIM(LOWER(P2.Stage_name))), ' ', '')

      `;

      console.log("Insert Query:", insertQuery);

      try {
        //await request.query(deleteQuery);
        await request.query(insertQuery);
        console.log(`Batch ${i / batchSize + 1} processed successfully.`);
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
      }
    }

    // Close SQL connection
    await sql.close();

    res.status(200).send("User skills saved successfully.");
  } catch (err) {
    console.error("Error saving user skills:", err);
    res.status(500).send("Error saving user skills.");
  }
});
//USER SHIFT
// Endpoint to handle POST request for saving user shifts
app.post("/api/saveUserShifts", async (req, res) => {
  const shiftsData = req.body;
  const invalidStages = [];

  try {
    await sql.connect(config);
    const request = new sql.Request();

    const stageResult = await request.query(`SELECT Stage_Serial, Stage_name FROM Mx_StageMaster`);
    const stageMap = new Map();
    stageResult.recordset.forEach(stage => {
      stageMap.set(stage.Stage_name.toLowerCase().replace(/\s+/g, ""), stage.Stage_Serial);
    });

    const batchSize = 50;

    for (let i = 0; i < shiftsData.length; i += batchSize) {
      let QUERY1 = "";
      const batch = shiftsData.slice(i, i + batchSize);

      for (let shift of batch) {
  const { Shift_date_from, Shift_date_to, userid, STAGE_NAME, SHIFT_ID, LINE } = shift;

  // ✅ Check if STAGE_NAME exists

let stageNameNormalized = null;

if (STAGE_NAME && typeof STAGE_NAME === "string") {
  stageNameNormalized = STAGE_NAME.trim().toLowerCase().replace(/\s+/g, "");
}

if (!stageNameNormalized) {
  invalidStages.push({ ...shift, reason: "Missing STAGE_NAME value" });
  continue;
}

if (!stageMap.has(stageNameNormalized)) {
  invalidStages.push({ ...shift, reason: "Stage not found in DB" });
  continue;
}

  if (QUERY1.length > 0) QUERY1 += " UNION ALL ";
  QUERY1 += `SELECT '${Shift_date_from}' AS SHIFT_FROM_DATE, '${Shift_date_to}' AS SHIFT_TO_DATE, '${userid}' AS userid, '${STAGE_NAME}' AS STAGE_NAME, '${SHIFT_ID}' AS SHIFT_ID, '${LINE}' AS LINE`;
}


      if (QUERY1) {
        const deleteQuery = `
          DELETE p1
          FROM Mx_UserShifts AS p1
          INNER JOIN (
            SELECT SHIFT_FROM_DATE, SHIFT_TO_DATE, userid, P1.Stage_Serial, SHIFT_ID, LINE
            FROM (${QUERY1}) AS Q1
            LEFT JOIN Mx_StageMaster AS P1
            ON REPLACE(LOWER(Q1.STAGE_NAME), ' ', '') = REPLACE(LOWER(P1.Stage_name), ' ', '')
          ) AS q1
          ON p1.shift_date_from = q1.shift_from_date
          AND p1.shift_date_to = q1.shift_to_date
          AND p1.userid = q1.userid
        `;

        const finalQuery = `
          INSERT INTO Mx_UserShifts (Shift_date_from, Shift_date_to, userid, stage_id, SHIFT_ID, LINE)
          SELECT SHIFT_FROM_DATE, SHIFT_TO_DATE, userid, P1.Stage_Serial, SHIFT_ID, LINE
          FROM (${QUERY1}) AS Q1
          LEFT JOIN Mx_StageMaster AS P1
          ON REPLACE(LOWER(Q1.STAGE_NAME), ' ', '') = REPLACE(LOWER(P1.Stage_name), ' ', '')
        `;

        await request.query(deleteQuery);
        await request.query(finalQuery);
      }
    }

    await sql.close();

    res.json({ success: true, invalidRows: invalidStages });

  } catch (err) {
    console.error("Error saving user shifts:", err);
    res.status(500).json({ success: false, message: "Error saving user shifts." });
  }
});

// Fetch user shifts with optional date filter
app.get("/api/getUserShifts", async (req, res) => {
  const { date } = req.query;
  try {
    let pool = await sql.connect(config);
    let query = `
          SELECT u.Shift_date_from, u.Shift_date_to, u.userid, u.SHIFT_ID, u.LINE, s.Stage_name, m.NAME AS user_name
          FROM Mx_UserShifts u
          LEFT JOIN MX_USERMST m ON u.userid = m.USERID
          LEFT JOIN Mx_StageMaster s ON u.stage_id = s.stage_Serial
          ORDER BY SHIFT_ID, Stage_name, LINE
      `;
    if (date) {
      query += ` WHERE u.Shift_date_from = '${date}' OR u.Shift_date_to = '${date}'`;
    }
    let result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching user shifts:", error);
    res.status(500).send("Server error");
  }
});

app.get("/api/attendance/overall-summary", async (req, res) => {
  const { date, shifts, lines } = req.query;

  console.log("Received parameters:", { date, shifts, lines });

  try {
    if (!date) {
      return res.status(400).json({
        error: "Date parameter is required",
      });
    }

    const pool = await sql.connect(config);
    const request = pool.request();

    let whereClause = `
      ISNULL(P2.UserIDEnbl, 0) = 1 
    `;

    // Add date filter
    whereClause += ` AND P1.Shift_date_from = @date`;
    request.input("date", sql.Date, new Date(date));

    // Handle multiple shifts
    if (shifts && shifts.trim() !== "") {
      const shiftArray = shifts
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      if (shiftArray.length > 0) {
        const shiftPlaceholders = shiftArray
          .map((_, index) => `@shift${index}`)
          .join(",");
        whereClause += ` AND P1.SHIFT_ID IN (${shiftPlaceholders})`;

        shiftArray.forEach((shift, index) => {
          request.input(`shift${index}`, sql.VarChar, shift);
        });
      }
    }

    // Handle multiple lines
    if (lines && lines.trim() !== "") {
      const lineArray = lines
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l !== "");
      if (lineArray.length > 0) {
        const linePlaceholders = lineArray
          .map((_, index) => `@line${index}`)
          .join(",");
        whereClause += ` AND P1.LINE IN (${linePlaceholders})`;

        lineArray.forEach((line, index) => {
          request.input(`line${index}`, sql.VarChar, line);
        });
      }
    }

    const query = `
      SELECT 
        Shift_date_from AS DATE,
        SHIFT_ID AS SHIFT,
        LINE,
        COUNT(*) AS ALLOTTED,
        SUM(CASE WHEN PUNCHDATE IS NOT NULL THEN 1 ELSE 0 END) AS PRESENT,
        SUM(CASE WHEN PUNCHDATE IS NULL THEN 1 ELSE 0 END) AS ABSENT
      FROM (
        SELECT 
          P1.USERID, 
          P1.Shift_date_from, 
          P1.SHIFT_ID, 
          P1.LINE,
          (SELECT TOP 1 P5.Edatetime
           FROM Mx_ATDEventTrn AS P5
           WHERE P5.USERID = P1.USERID 
             AND DATEADD(DAY, DATEDIFF(DAY, 0, P5.EDATETIME), 0) = P1.Shift_date_from
           ORDER BY P5.Edatetime) AS PUNCHDATE
        FROM Mx_UserShifts AS P1
        LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
        WHERE ${whereClause}
      ) AS ATT
      GROUP BY Shift_date_from, SHIFT_ID, LINE
      ORDER BY Shift_date_from, SHIFT_ID, LINE;
    `;

    console.log("Executing query with parameters:", request.parameters);

    const result = await request.query(query);

    console.log("Query result count:", result.recordset.length);

    const responseData = result.recordset || [];
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching overall summary:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});



// app.get("/api/attendance/allot", async (req, res) => {
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE  P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;`;

//   try {
//     let pool = await sql.connect(config);
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.VarChar, line)
//       .query(query);

//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching allot records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });

// app.get("/api/attendance/present", async (req, res) => {
//   let pool = await sql.connect(config);
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE, PUNCHDATE
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE ISNULL(PUNCHDATE, '') <> ''
// 	AND P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;
//   `;

//   try {
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.Char, line)
//       .query(query);
//     console.log(results.recordset);
//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching present records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });
// app.get("/api/attendance/absent", async (req, res) => {
//   let pool = await sql.connect(config);
//   const { date, shiftId, stageName, line } = req.query;

//   const query = `
// SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE,
// 	 (SELECT TOP 1 Swap_userid+'-'+P6A.NAME  FROM MX_USERSWAP AS P6 
// 		 LEFT OUTER JOIN Mx_UserMst AS P6A ON P6.Swap_userid = P6A.USERID 
// 		 WHERE P6.SHIFT_DATE=@date 
// 				 AND P6.Absent_userid = Q1.userid AND P6.Shift_id = Q1.SHIFT_ID AND P6.Line = Q1.LINE1 ) AS SWAPUSERNAME 
//    FROM (
//       SELECT Q1.*,
//         CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
//         CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
//         1 AS ALLOT,
//    CASE WHEN ISNULL(NSTAGE_ID,0)<>0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
//                  CASE WHEN ISNULL(NLINE,'')<>'' THEN NLINE ELSE LINE END AS LINE1
//       FROM (
//         SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
//           (SELECT TOP 1 P5.Edatetime
//            FROM Mx_ATDEventTrn AS P5
//            WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
//            ORDER BY P5.Edatetime) AS PUNCHDATE,

//  (SELECT TOP 1 P5.STAGE_ID
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,
//                      (SELECT TOP 1 P5.LINE
//                       FROM Mx_Userswap  AS P5
//                       WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
//                       ORDER BY P5.SHIFT_DATE) AS NLINE
//         FROM Mx_UserShifts AS P1
//         LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
//         LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
// 		LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_id
//         LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
//         WHERE Shift_date_from = @date
//           AND ISNULL(P2.UserIDEnbl, 0) = 1 AND ISNULL(P2.IsAuthHost,0) = 0
//           AND P1.SHIFT_ID = @shiftId
//       ) AS Q1
//     ) AS Q1
//         LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_id

//     WHERE ISNULL(PUNCHDATE, '') = ''
// 	AND P4.Stage_name = @stageName
// 	AND Q1.LINE1 = @line
// 	    ORDER BY STAGE_NAME, SHIFT_ID, USERID;
//   `;

//   try {
//     const results = await pool
//       .request()
//       .input("date", sql.Date, date)
//       .input("shiftId", sql.VarChar, shiftId)
//       .input("stageName", sql.VarChar, stageName)
//       .input("line", sql.Char, line)
//       .query(query);
//     console.log(results.recordset);
//     res.json(results.recordset);
//   } catch (error) {
//     console.error("Error fetching absent records:", error);
//     res.status(500).send({ error: "Server Error", details: error.message });
//   }
// });


app.get("/api/attendance/showAll", async (req, res) => {
  const pool = await sql.connect(config);
  const { date, shifts, lines, stageId } = req.query;

  // Validate required parameters
  if (!date) {
    return res.status(400).json({ error: "date parameter is required" });
  }
  if (!shifts || !lines) {
    return res.status(400).json({ 
      error: "shifts and lines parameters are required" 
    });
  }

  // Process comma-separated values
  const shiftsArr = shifts.split(",").map((s) => s.trim()).filter(Boolean);
  const linesArr = lines.split(",").map((l) => l.trim()).filter(Boolean);

  if (!shiftsArr.length || !linesArr.length) {
    return res.status(400).json({ 
      error: "shifts and lines must each contain at least one value" 
    });
  }

  const shiftsString = shiftsArr.join(',');
  const linesString = linesArr.join(',');

const rawSql = `
WITH Punches AS (
    SELECT
        E.USERID,
        MIN(E.EDateTime) AS PUNCHIN,
        MAX(E.EDateTime) AS PUNCHOUT,
        COUNT(*) AS PunchCount
    FROM dbo.Mx_ATDEventTrn E
    INNER JOIN dbo.MX_USERMST U ON E.USERID = U.USERID
    WHERE CAST(E.EDateTime AS DATE) = @Date
      AND ISNULL(U.UserIDEnbl, 0) = 1
    GROUP BY E.USERID
),
Assignments AS (
    SELECT
        US.USERID,
        US.stage_id AS Original_Stage_ID,
        US.LINE AS Original_LINE,
        US.SHIFT_ID,
        US.Shift_date_from,
        SM.SFTName AS ShiftName,
        SM.SFTSTTime AS StartTime,
        SM.SFTEDTime AS EndTime,
        DATEADD(day, DATEDIFF(day, 0, US.Shift_date_from), 0) + CAST(SM.SFTSTTime AS datetime) AS ShiftStartDateTime,
        CASE WHEN SM.SFTEDTime < SM.SFTSTTime
             THEN DATEADD(day, DATEDIFF(day, 0, US.Shift_date_from) + 1, 0) + CAST(SM.SFTEDTime AS datetime)
             ELSE DATEADD(day, DATEDIFF(day, 0, US.Shift_date_from), 0) + CAST(SM.SFTEDTime AS datetime)
        END AS ShiftEndDateTime
    FROM dbo.Mx_UserShifts US
    LEFT JOIN dbo.Mx_ShiftMst SM ON US.SHIFT_ID = SM.SFTID
    LEFT JOIN dbo.MX_USERMST U ON US.USERID = U.USERID
    WHERE US.Shift_date_from = @Date
      AND ISNULL(U.UserIDEnbl, 0) = 1
),
Swaps AS (
    SELECT
        SW.SWAP_USERID,
        SW.STAGE_ID,
        SW.LINE,
        SW.SHIFT_DATE
    FROM dbo.Mx_Userswap SW
    WHERE SW.SHIFT_DATE = @Date
)

SELECT
    COALESCE(P.USERID, A.USERID, S.SWAP_USERID) AS USERID,
    COALESCE(PU.NAME, AU.NAME, SU.NAME) AS NAME,

    -- Determine assignment source and handle unassigned present users
    CASE
        WHEN A.USERID IS NOT NULL THEN 'Original'
        WHEN S.SWAP_USERID IS NOT NULL THEN 'Swapped In'
        WHEN P.USERID IS NOT NULL AND A.USERID IS NULL THEN 'Unassigned Present'
        ELSE 'Unknown'
    END AS SwapStatus,

    -- Assignment details (will be NULL for unassigned present users)
    A.SHIFT_ID,
    A.ShiftName,
    A.StartTime,
    A.EndTime,
    ISNULL(A.Shift_date_from, @Date) AS Shift_date_from,
    A.ShiftStartDateTime,
    A.ShiftEndDateTime,
    ISNULL(S.STAGE_ID, A.Original_Stage_ID) AS Effective_Stage_ID,
    ISNULL(S.LINE, A.Original_LINE) AS LINE,
    ST.stage_name AS Stage_name,
    ST.Stage_id,

    -- Punch data
    P.PUNCHIN,
    FORMAT(P.PUNCHIN, 'HH:mm:ss') AS PunchInTimeOnly,
    P.PUNCHOUT,
    FORMAT(P.PUNCHOUT, 'HH:mm:ss') AS PunchOutTimeOnly,
    P.PunchCount AS TotalPunches,

    -- Status with special handling for unassigned present users
    CASE
        WHEN P.PUNCHIN IS NOT NULL AND A.USERID IS NULL THEN 'Present (Unassigned)'
        WHEN P.PUNCHIN IS NOT NULL THEN 'Present'
        ELSE 'Absent'
    END AS STATUS,

    CASE
        WHEN P.PUNCHIN IS NULL THEN 'No Punch'
        WHEN A.ShiftStartDateTime IS NULL THEN 'No Shift Info'  -- For unassigned users
        WHEN P.PUNCHIN <= DATEADD(minute, 15, A.ShiftStartDateTime) THEN 'On Time'
        ELSE 'Late'
    END AS PunctualityStatus,

    CASE
        WHEN P.PUNCHIN IS NULL OR A.ShiftStartDateTime IS NULL THEN 0
        WHEN P.PUNCHIN > DATEADD(minute, 15, A.ShiftStartDateTime)
             THEN DATEDIFF(minute, DATEADD(minute, 15, A.ShiftStartDateTime), P.PUNCHIN)
        ELSE 0
    END AS LateByMinutes,

    -- Work time
    CASE WHEN P.PUNCHIN IS NOT NULL AND P.PUNCHOUT IS NOT NULL AND P.PUNCHOUT >= P.PUNCHIN
         THEN DATEDIFF(minute, P.PUNCHIN, P.PUNCHOUT)
         ELSE 0 END AS WorkedMinutes,

    -- Overtime (only calculable for assigned users)
    CASE WHEN A.ShiftEndDateTime IS NOT NULL AND P.PUNCHOUT > A.ShiftEndDateTime
         THEN DATEDIFF(minute, A.ShiftEndDateTime, P.PUNCHOUT)
         ELSE 0 END AS OvertimeMinutes

-- KEY CHANGE: Use FULL OUTER JOIN to capture all users
FROM Punches P
FULL OUTER JOIN Assignments A ON P.USERID = A.USERID
FULL OUTER JOIN Swaps S ON COALESCE(P.USERID, A.USERID) = S.SWAP_USERID
    AND A.Original_Stage_ID = S.STAGE_ID
    AND A.Original_LINE = S.LINE
LEFT JOIN dbo.MX_USERMST PU ON P.USERID = PU.USERID          -- For punch-only users
LEFT JOIN dbo.MX_USERMST AU ON A.USERID = AU.USERID          -- For assigned users
LEFT JOIN dbo.MX_USERMST SU ON S.SWAP_USERID = SU.USERID     -- For swapped users
LEFT JOIN dbo.Mx_STAGEMASTER ST ON ISNULL(S.STAGE_ID, A.Original_Stage_ID) = ST.Stage_Serial


WHERE (@ShiftIds IS NULL OR A.SHIFT_ID IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@ShiftIds, ',')
) OR P.USERID IS NOT NULL AND A.USERID IS NULL)  -- Include unassigned present users regardless of shift filter
AND (@LineIds IS NULL OR ISNULL(S.LINE, A.Original_LINE) IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@LineIds, ',')
) OR P.USERID IS NOT NULL AND A.USERID IS NULL)  -- Include unassigned present users regardless of line filter
AND (@StageId IS NULL OR ISNULL(S.STAGE_ID, A.Original_Stage_ID) = @StageId OR P.USERID IS NOT NULL)

ORDER BY
    CASE WHEN A.USERID IS NOT NULL OR S.SWAP_USERID IS NOT NULL THEN 0 ELSE 1 END,  -- Assigned users first
    ST.Stage_id, ST.stage_name, A.SHIFT_ID, COALESCE(P.USERID, A.USERID, S.SWAP_USERID);`;

  try {
    const conn = await pool;
    const request = conn.request();
    
    request.input("Date", sql.Date, date);
    request.input("ShiftIds", sql.NVarChar, shiftsString);
    request.input("LineIds", sql.NVarChar, linesString);
    
    if (stageId && !isNaN(parseInt(stageId))) {
      request.input("StageId", sql.Int, parseInt(stageId));
    } else {
      request.input("StageId", sql.Int, null);
    }

    const { recordset } = await request.query(rawSql);
    console.log(recordset)
    res.json(recordset);
  } catch (error) {
    console.error("Error fetching attendance records:", error.message);
    res.status(500).send({ error: "Server Error", details: error.message });
  }
});


app.get("/api/attendance", async (req, res) => {
  const { date, shifts, lines } = req.query;
  let pool = await sql.connect(config);

  try {
    const shiftList = shifts.split(",").map(s => s.trim());
    const lineList = lines.split(",").map(l => l.trim());

    const result = await pool.request()
      .input("Date", sql.Date, new Date(date))
      .query(`
        WITH Punches AS (
    SELECT 
        E.USERID,
        MIN(E.EDateTime) AS PUNCHIN
    FROM dbo.Mx_ATDEventTrn E
    INNER JOIN dbo.MX_USERMST U ON E.USERID = U.USERID
    WHERE CAST(E.EDateTime AS DATE) = @Date
      AND ISNULL(U.UserIDEnbl, 0) = 1
    GROUP BY E.USERID
)

SELECT 
    ST.Stage_name,
    A.LINE,
    A.SHIFT_ID,
    SM.SFTSTTime,
    COUNT(*) AS ALLOT,
    SUM(CASE WHEN P.PUNCHIN IS NOT NULL THEN 1 ELSE 0 END) AS PRESENT,
    SUM(CASE WHEN P.PUNCHIN IS NULL THEN 1 ELSE 0 END) AS ABSENT
FROM dbo.Mx_UserShifts A
LEFT JOIN dbo.MX_USERMST B ON A.USERID = B.USERID
LEFT JOIN dbo.Mx_STAGEMASTER ST ON A.stage_id = ST.Stage_Serial
LEFT JOIN dbo.Mx_ShiftMst SM ON A.SHIFT_ID = SM.SFTID
LEFT JOIN Punches P ON A.USERID = P.USERID
WHERE A.Shift_date_from = @Date
  AND ISNULL(B.UserIDEnbl, 0) = 1
  AND A.SHIFT_ID IN (${shiftList.map((_, i) => `'${shiftList[i]}'`).join(",")})
  AND A.LINE IN (${lineList.map((_, i) => `'${lineList[i]}'`).join(",")})
GROUP BY ST.Stage_name, A.LINE, A.SHIFT_ID, SM.SFTSTTime
ORDER BY ALLOT DESC;
      `);
      console.log(result.recordset)

    res.json(result.recordset);
    console.log("attendance", result.recordset);
  } catch (error) {
    console.error("Error fetching attendance details:", error);
    res.status(500).send("Error fetching data from the database");
  } finally {
    await sql.close();
  }
});


app.get("/download-template-us", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../master/public",
    "skill upload new.xlsx"
  );
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Error downloading file");
    }
  });
});

app.use(express.static(path.join(__dirname, "../master/public")));

app.get("/download-template", (req, res) => {
  const filePath = path.join(
    __dirname,
    "../master/public",
    "sample_template.xlsx"
  );
  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).send("Error downloading file");
    }
  });
});

app.get("/api/shifts", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT SHIFT_ID 
FROM   Mx_UserShifts
ORDER  BY SHIFT_ID;
`
      );
      console.log(result.recordset)
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching shifts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/lines", async (req, res) => {
  try {
    let pool = await sql.connect(config);
    const result = await pool
      .request()
      .query(`SELECT DISTINCT LINE FROM Mx_UserShifts ORDER BY LINE ASC`);
    console.log(result.recordset);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching lines:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.put("/api/lines/:oldLineName", async (req, res) => {
  let { oldLineName } = req.params;
  const { newLineName } = req.body;  // <-- must come from frontend

  if (!newLineName || newLineName.trim() === "") {
    return res.status(400).json({ error: "New line name is required" });
  }
  
    console.log(req.params)
     if (oldLineName === "null") {
    oldLineName = null;
  }

  try {
    let pool = await sql.connect(config);

  await pool.request()
    .input('newLineName', sql.VarChar, newLineName)
    .input('oldLineName', sql.VarChar, oldLineName) // This can be null
    .query(`
        UPDATE Mx_UserShifts
        SET LINE = @newLineName
        WHERE (@oldLineName IS NULL AND LINE IS NULL) OR (LINE = @oldLineName);

        UPDATE Mx_UserSwap
        SET LINE = @newLineName
        WHERE (@oldLineName IS NULL AND LINE IS NULL) OR (LINE = @oldLineName);
    `);

    res.json({ success: true, message:` Line updated from '${oldLineName}' to '${newLineName}'. `});
  } catch (err) {
    console.error("Error updating line:", err);
    res.status(500).json({ error: "Error updating line" });
  }
});


// DELETE API - Set LINE as NULL in both tables
app.delete("/api/lines/:lineName", async (req, res) => {
  const { lineName } = req.params;

  try {
    let pool = await sql.connect(config);

    // Update both tables: Mx_UserShifts and Mx_UserSwap
    await pool.request()
      .input("lineName", sql.VarChar, lineName)
      .query(`
        UPDATE Mx_UserShifts SET LINE = NULL WHERE LINE = @lineName;
        UPDATE Mx_UserSwap SET LINE = NULL WHERE LINE = @lineName;
      `);

    res.json({ success: true, message: `Line '${lineName}' set to NULL in both tables.` });
  } catch (err) {
    console.error("Error deleting line:", err);
    res.status(500).json({ error: "Error deleting line" });
  }
});




app.get("/api/getEmployees", async (req, res) => {
  const { date, shiftId, Stage_name, Line } = req.query;
  console.log({ date, shiftId, Stage_name, Line });

  if (!date || !shiftId) {
    return res
      .status(400)
      .json({ error: "Date and Shift ID are required parameters." });
  }

  const query = `SELECT DISTINCT USERID, NAME, Stage_name, SHIFT_ID, LINE1 AS LINE,
(SELECT TOP 1 Skill_Description  FROM Mx_UserSkills AS P1
LEFT OUTER JOIN MX_SKILLMASTER AS P2 ON P1.Skill_id = P2.Skill_id WHERE
Q1.userid = P1.userid ORDER BY  P1.UPDATE_AT DESC,P1.SKILL_ID DESC) AS SKILL_DESCRIPTION
            FROM (
                SELECT Q1.*,
                    CASE WHEN ISNULL(PUNCHDATE, '') = '' THEN 1 ELSE 0 END AS ABSENT,
                    CASE WHEN ISNULL(PUNCHDATE, '') <> '' THEN 1 ELSE 0 END AS PRESENT,
                    1 AS ALLOT,
                    CASE WHEN ISNULL(NSTAGE_ID, 0) <> 0 THEN NSTAGE_ID ELSE STAGE_ID END AS STAGEID,
                    CASE WHEN ISNULL(NLINE, '') <> '' THEN NLINE ELSE LINE END AS LINE1
                FROM (
                    SELECT P1.USERID, P1.SHIFT_ID, P1.LINE, P3.SFTName, P1.STAGE_ID, P5.Name AS CGNAME, P2.NAME,
                        (SELECT TOP 1 P5.Edatetime
                         FROM Mx_ATDEventTrn AS P5
                         WHERE P5.USERID = P1.USERID AND DATEADD(d, DATEDIFF(d, 0, P5.EDATETIME), 0) = P1.Shift_date_from
                         ORDER BY P5.Edatetime) AS PUNCHDATE,

                        (SELECT TOP 1 P5.STAGE_ID
                         FROM Mx_Userswap AS P5
                         WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
                         ORDER BY P5.SHIFT_DATE) AS NSTAGE_ID,

                        (SELECT TOP 1 P5.LINE
                         FROM Mx_Userswap AS P5
                         WHERE P5.Swap_userid = P1.USERID AND P5.SHIFT_DATE = P1.Shift_date_from
                         ORDER BY P5.SHIFT_DATE) AS NLINE
                    FROM Mx_UserShifts AS P1
                    LEFT JOIN [Mx_ShiftMst] AS P3 ON P1.SHIFT_ID = P3.SFTID
                    LEFT JOIN MX_USERMST AS P2 ON P1.USERID = P2.USERID
                    LEFT JOIN Mx_STAGEMASTER AS P4 ON P1.stage_id = P4.Stage_Serial
                    LEFT JOIN Mx_CustomGroup1Mst AS P5 ON P2.CG1ID = P5.CG1ID
                    WHERE Shift_date_from = @date
                      AND SHIFT_ID = @shiftId
                ) AS Q1
            ) AS Q1
            LEFT JOIN Mx_STAGEMASTER AS P4 ON Q1.stageid = P4.Stage_Serial
            WHERE ISNULL(PUNCHDATE, '') <> '' 
AND USERID NOT IN
(SELECT Swap_userid from Mx_Userswap where Shift_date = @date) AND NOT (Q1.LINE1 = @Line AND P4.STAGE_NAME != @Stage_name)
            ORDER BY STAGE_NAME, SHIFT_ID, USERID;`;

  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("date", sql.Date, date)
      .input("shiftId", sql.VarChar, shiftId)
      .input("Stage_name", sql.NVarChar, Stage_name)
      .input("Line", sql.VarChar, Line)
      .query(query);
    
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error fetching employees");
  }
});

app.post("/api/saveUserSwap", async (req, res) => {
  const swapRecords = req.body;
  console.log(req.body)

  try {
    const pool = await sql.connect(config);

    for (const swap of swapRecords) {
      const { shiftDate, Stage_name, shiftId, line, absentUserId, swapUserId } =
        swap;

      // Fetch Stage_id
      const result = await pool
        .request()
        .input("StageName", sql.NVarChar, Stage_name)
        .query(
          "SELECT Stage_id FROM Mx_StageMaster WHERE Stage_name = @StageName"
        );

      if (result.recordset.length === 0) {
        return res.status(400).send("Stage_name not found");
      }

      const stageId = result.recordset[0].Stage_id;

      // Insert swap details
      await pool
        .request()
        .input("ShiftDate", sql.DateTime, shiftDate)
        .input("StageId", sql.Int, stageId)
        .input("ShiftId", sql.Char(2), shiftId)
        .input("Line", sql.Char(2), line)
        .input("AbsentUserId", sql.NChar(15), absentUserId)
        .input("SwapUserId", sql.NChar(15), swapUserId)
        .query(
          "INSERT INTO Mx_Userswap (Shift_date, Stage_id, Shift_id, Line, Absent_userid, Swap_userid) VALUES (@ShiftDate, @StageId, @ShiftId, @Line, @AbsentUserId, @SwapUserId)"
        );
    }

    res.status(200).send("All swap details saved successfully");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send(`Error saving swap details: ${err.message}`);
  }
});

app.get("/api/lines/master", async (req, res) => {
  try {
    const pool = await sql.connect(config);

    // Ensure the master table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mx_LinesMaster' AND xtype='U')
      CREATE TABLE Mx_LinesMaster (
        LineID INT IDENTITY(1,1) PRIMARY KEY,
        LineName NVARCHAR(50) NOT NULL UNIQUE,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    const result = await pool
      .request()
      .query(
        "SELECT LineID, LineName, CreatedDate FROM Mx_LinesMaster ORDER BY LineName ASC"
      );

      console.log(result.recordset)
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching lines master:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/lines", async (req, res) => {
  const { lineName } = req.body;

  if (!lineName) {
    return res.status(400).send("Line name is required");
  }

  try {
    const pool = await sql.connect(config);

    // Check if line already exists in Mx_UserShifts
    const checkLineQuery =
      "SELECT TOP 1 LINE FROM Mx_UserShifts WHERE LINE = @lineName";
    const checkLineRequest = pool.request();
    checkLineRequest.input("lineName", sql.NVarChar, lineName);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length > 0) {
      return res.status(409).send("Line already exists");
    }

    // For demonstration, we'll create a lines master table if it doesn't exist
    // First check if lines master table exists, if not create it
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Mx_LinesMaster' AND xtype='U')
      CREATE TABLE Mx_LinesMaster (
        LineID INT IDENTITY(1,1) PRIMARY KEY,
        LineName NVARCHAR(50) NOT NULL UNIQUE,
        CreatedDate DATETIME DEFAULT GETDATE()
      )
    `);

    // Insert new line
    const insertQuery = `
      INSERT INTO Mx_LinesMaster (LineName) 
      OUTPUT INSERTED.LineID, INSERTED.LineName 
      VALUES (@lineName);
    `;
    const request = pool.request();
    request.input("lineName", sql.NVarChar, lineName);
    const result = await request.query(insertQuery);

    res.status(201).json({
      LineID: result.recordset[0].LineID,
      LineName: result.recordset[0].LineName,
      message: "Line added successfully",
    });
  } catch (err) {
    console.error("Error adding line:", err);
    res.status(500).send("Error adding line");
  }
});

app.put("/api/lines/:id", async (req, res) => {
  const { id } = req.params;
  const { lineName } = req.body;

  if (!lineName) {
    return res.status(400).send("Line name is required");
  }

  try {
    const pool = await sql.connect(config);

    // Check if the line exists
    const checkLineQuery =
      "SELECT LineID FROM Mx_LinesMaster WHERE LineID = @LineID";
    const checkLineRequest = pool.request();
    checkLineRequest.input("LineID", sql.Int, id);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length === 0) {
      return res.status(404).send("Line not found");
    }

    // Update the line
    const updateQuery = `
      UPDATE Mx_LinesMaster 
      SET LineName = @lineName 
      WHERE LineID = @LineID
    `;
    const request = pool.request();
    request.input("LineID", sql.Int, id);
    request.input("lineName", sql.NVarChar, lineName);

    await request.query(updateQuery);

    res.status(200).json({
      LineID: id,
      LineName: lineName,
      message: "Line updated successfully",
    });
  } catch (err) {
    console.error("Error updating line:", err);
    res.status(500).send("Error updating line");
  }
});

app.delete("/api/lines/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await sql.connect(config);

    // Check if the line exists before deleting
    const checkLineQuery =
      "SELECT TOP 1 LineID FROM Mx_LinesMaster WHERE LineID = @id";
    const checkLineRequest = pool.request();
    checkLineRequest.input("id", sql.Int, id);
    const existingLine = await checkLineRequest.query(checkLineQuery);

    if (existingLine.recordset.length === 0) {
      return res.status(404).send("Line not found");
    }

    // Check if line is being used in Mx_UserShifts
    const usageCheck = await pool
      .request()
      .input("id", sql.Int, id)
      .query(
        "SELECT TOP 1 * FROM Mx_UserShifts WHERE LINE = (SELECT LineName FROM Mx_LinesMaster WHERE LineID = @id)"
      );

    if (usageCheck.recordset.length > 0) {
      return res
        .status(400)
        .send("Cannot delete line as it is currently in use");
    }

    // Delete the line
    const deleteQuery = "DELETE FROM Mx_LinesMaster WHERE LineID = @id";
    await pool.request().input("id", sql.Int, id).query(deleteQuery);

    res.status(200).json({ message: "Line deleted successfully" });
  } catch (err) {
    console.error("Error deleting line:", err);
    res.status(500).send("Error deleting line");
  }
});

// API 1: Create carousel images table (run once)
app.post("/api/create-carousel-table", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CarouselImages' AND xtype='U')
      CREATE TABLE CarouselImages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        image_name VARCHAR(255) NOT NULL,
        image_data TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        is_active BIT DEFAULT 1,
        display_order INT DEFAULT 0,
        created_date DATETIME DEFAULT GETDATE(),
        updated_date DATETIME DEFAULT GETDATE()
      )
    `;

    await pool.request().query(createTableQuery);
    res.json({
      success: true,
      message: "Carousel images table created successfully",
    });
  } catch (error) {
    console.error("Error creating table:", error);
    res
      .status(500)
      .json({ error: "Failed to create table", details: error.message });
  }
});

// API 2: Upload carousel image
// API 2: Upload carousel image (FIXED VERSION)
app.post(
  "/api/carousel-images/upload",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const { displayOrder = 0 } = req.body;

      // Convert to base64
      const base64Data = `data:${mimetype};base64,${buffer.toString("base64")}`;

      const pool = await sql.connect(config);
      const request = pool.request();

      // FIXED: Add OUTPUT INSERTED.id to return the inserted ID
      const insertQuery = `
      INSERT INTO CarouselImages (image_name, image_data, mime_type, file_size, display_order)
      OUTPUT INSERTED.id
      VALUES (@imageName, @imageData, @mimeType, @fileSize, @displayOrder)
    `;

      request.input("imageName", sql.VarChar, originalname);
      request.input("imageData", sql.Text, base64Data);
      request.input("mimeType", sql.VarChar, mimetype);
      request.input("fileSize", sql.Int, size);
      request.input("displayOrder", sql.Int, parseInt(displayOrder));

      const result = await request.query(insertQuery);

      // FIXED: Check if result exists before accessing
      let insertedId = null;
      if (result.recordset && result.recordset.length > 0) {
        insertedId = result.recordset[0].id;
      }

      res.json({
        success: true,
        message: "Image uploaded successfully",
        imageData: {
          name: originalname,
          size: size,
          type: mimetype,
          id: insertedId,
        },
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res
        .status(500)
        .json({ error: "Failed to upload image", details: error.message });
    }
  }
);

// API 3: Get all carousel images
app.get("/api/carousel-images", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const query = `
      SELECT id, image_name, image_data, mime_type, file_size, display_order, created_date
      FROM CarouselImages 
      WHERE is_active = 1 
      ORDER BY display_order ASC, created_date DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching carousel images:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch images", details: error.message });
  }
});

// API 4: Delete carousel image (soft delete)
app.delete("/api/carousel-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(config);
    const request = pool.request();

    const deleteQuery = `
      UPDATE CarouselImages 
      SET is_active = 0, updated_date = GETDATE() 
      WHERE id = @id
    `;
    request.input("id", sql.Int, parseInt(id));

    await request.query(deleteQuery);
    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res
      .status(500)
      .json({ error: "Failed to delete image", details: error.message });
  }
});

// API 5: Update image display order
app.put("/api/carousel-images/:id/order", async (req, res) => {
  try {
    const { id } = req.params;
    const { displayOrder } = req.body;

    const pool = await sql.connect(config);
    const request = pool.request();

    const updateQuery = `
      UPDATE CarouselImages 
      SET display_order = @displayOrder, updated_date = GETDATE() 
      WHERE id = @id
    `;
    request.input("id", sql.Int, parseInt(id));
    request.input("displayOrder", sql.Int, parseInt(displayOrder));

    await request.query(updateQuery);
    res.json({ success: true, message: "Display order updated successfully" });
  } catch (error) {
    console.error("Error updating display order:", error);
    res
      .status(500)
      .json({
        error: "Failed to update display order",
        details: error.message,
      });
  }
});

// API 6: Get single image by ID
app.get("/api/carousel-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(config);
    const request = pool.request();

    const query = `
      SELECT id, image_name, image_data, mime_type, file_size, display_order, created_date
      FROM CarouselImages 
      WHERE id = @id AND is_active = 1
    `;
    request.input("id", sql.Int, parseInt(id));

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching image:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch image", details: error.message });
  }
});

// API 7: Bulk update display orders
app.put("/api/carousel-images/bulk-order", async (req, res) => {
  try {
    const { images } = req.body; // Array of {id, displayOrder}

    if (!Array.isArray(images)) {
      return res.status(400).json({ error: "Images array is required" });
    }

    const pool = await sql.connect(config);

    // Use transaction for bulk update
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const image of images) {
        const request = new sql.Request(transaction);
        await request
          .input("id", sql.Int, parseInt(image.id))
          .input("displayOrder", sql.Int, parseInt(image.displayOrder)).query(`
            UPDATE CarouselImages 
            SET display_order = @displayOrder, updated_date = GETDATE() 
            WHERE id = @id
          `);
      }

      await transaction.commit();
      res.json({
        success: true,
        message: "Display orders updated successfully",
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating bulk display orders:", error);
    res
      .status(500)
      .json({
        error: "Failed to update display orders",
        details: error.message,
      });
  }
});





app.post("/api/employee-history", async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;
  console.log(req.body)

  if (!employeeId || !fromDate || !toDate) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    await sql.connect(config);
    const request = new sql.Request();

    request.input('employeeId', sql.NVarChar, employeeId)
    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);

  const query = `
  WITH EmployeeHistory AS (
    -- Data from Mx_UserShifts
    SELECT 
        P2.USERID,
        P2.NAME,
        P1.Shift_date_from AS [DATE],
        P1.SHIFT_ID AS SHIFT,
        P1.LINE,
        P4.stage_name AS STAGE,
        CASE WHEN P5.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN P5.ActualPunch IS NULL THEN 'No Punch'
            WHEN P5.ActualPunch <= CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN P5.ActualPunch IS NOT NULL THEN 
                CASE 
                    WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                    ELSE
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), P1.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                END
            ELSE 0
        END AS LateMinutes
    FROM Mx_UserShifts P1
    LEFT JOIN MX_USERMST P2 ON P1.USERID = P2.USERID
    LEFT JOIN Mx_ShiftMst P3 ON P1.SHIFT_ID = P3.SFTID
    LEFT JOIN Mx_STAGEMASTER P4 ON P1.stage_id = P4.Stage_Serial
    LEFT JOIN (
        -- Find ActualPunch using 45 min tolerance
        SELECT SW.USERID, SW.Shift_date_from,
               CASE 
                   WHEN EXISTS (
                       SELECT 1
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, SW.ShiftStart) AND SW.ShiftStart
                   )
                   THEN (
                       SELECT MAX(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, SW.ShiftStart) AND SW.ShiftStart
                   )
                   ELSE (
                       SELECT MIN(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW.USERID
                         AND A.Edatetime >= SW.ShiftStart
                         AND A.Edatetime <= SW.ShiftEnd
                   )
               END AS ActualPunch
        FROM (
            SELECT P1.USERID, P1.Shift_date_from, P1.SHIFT_ID,
                   DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from), 0) + CAST(P3.SFTSTTime AS DATETIME) AS ShiftStart,
                   CASE WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from) + 1, 0) + CAST(P3.SFTEDTime AS DATETIME)
                        ELSE DATEADD(DAY, DATEDIFF(DAY, 0, P1.Shift_date_from), 0) + CAST(P3.SFTEDTime AS DATETIME)
                   END AS ShiftEnd
            FROM Mx_UserShifts P1
            LEFT JOIN Mx_ShiftMst P3 ON P1.SHIFT_ID = P3.SFTID
        ) SW
    ) P5 ON P1.USERID = P5.USERID AND P1.Shift_date_from = P5.Shift_date_from
    WHERE P1.USERID = @EmployeeId
      AND P1.Shift_date_from BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- Data from Mx_Userswap
    SELECT 
        P2.USERID,
        P2.NAME,
        SW.Shift_date AS [DATE],
        SW.Shift_id AS SHIFT,
        SW.LINE,
        P4.stage_name AS STAGE,
        CASE WHEN P5.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN P5.ActualPunch IS NULL THEN 'No Punch'
            WHEN P5.ActualPunch <= CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN P5.ActualPunch IS NOT NULL THEN 
                CASE 
                    WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                    ELSE
                        CASE 
                            WHEN DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch) < 0 THEN 0
                            ELSE DATEDIFF(MINUTE, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), P3.SFTSTTime, 108) AS DATETIME), P5.ActualPunch)
                        END
                END
            ELSE 0
        END AS LateMinutes
    FROM Mx_Userswap SW
    LEFT JOIN MX_USERMST P2 ON SW.Swap_userid = P2.USERID
    LEFT JOIN Mx_ShiftMst P3 ON SW.Shift_id = P3.SFTID
    LEFT JOIN Mx_STAGEMASTER P4 ON SW.stage_id = P4.Stage_Serial
    LEFT JOIN (
        SELECT SW2.Swap_userid, SW2.Shift_date,
               CASE 
                   WHEN EXISTS (
                       SELECT 1
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)) 
                                             AND DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                   )
                   THEN (
                       SELECT MAX(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)) 
                                             AND DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                   )
                   ELSE (
                       SELECT MIN(A.Edatetime)
                       FROM Mx_ATDEventTrn A
                       WHERE A.USERID = SW2.Swap_userid
                         AND A.Edatetime >= DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTSTTime AS DATETIME)
                         AND A.Edatetime <= CASE WHEN P3.SFTEDTime < P3.SFTSTTime THEN
                                                     DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date) + 1, 0) + CAST(P3.SFTEDTime AS DATETIME)
                                                 ELSE
                                                     DATEADD(DAY, DATEDIFF(DAY, 0, SW2.Shift_date), 0) + CAST(P3.SFTEDTime AS DATETIME)
                                            END
                   )
               END AS ActualPunch
        FROM Mx_Userswap SW2
        LEFT JOIN Mx_ShiftMst P3 ON SW2.Shift_id = P3.SFTID
    ) P5 ON SW.Swap_userid = P5.Swap_userid AND SW.Shift_date = P5.Shift_date
    WHERE SW.Swap_userid = @EmployeeId
      AND SW.Shift_date BETWEEN @FromDate AND @ToDate

          UNION ALL

    -- Users present in attendance but not in UserShifts or UserSwap
    SELECT 
        U.USERID,
        U.NAME,
        CAST(A.Edatetime AS DATE) AS [DATE],
        NULL AS SHIFT,
        NULL AS LINE,
        NULL AS STAGE,
        'Present' AS ATTENDANCE,
        'No Shift Assigned' AS PUNCTUALITY,
        0 AS LateMinutes
    FROM Mx_ATDEventTrn A
    INNER JOIN MX_USERMST U ON A.USERID = U.USERID
    WHERE A.USERID = @EmployeeId
      AND CAST(A.Edatetime AS DATE) BETWEEN @FromDate AND @ToDate
      AND NOT EXISTS (
            SELECT 1 FROM Mx_UserShifts S
            WHERE S.USERID = A.USERID
              AND S.Shift_date_from = CAST(A.Edatetime AS DATE)
      )
      AND NOT EXISTS (
            SELECT 1 FROM Mx_Userswap SW
            WHERE SW.Swap_userid = A.USERID
              AND SW.Shift_date = CAST(A.Edatetime AS DATE)
      )
    GROUP BY U.USERID, U.NAME, CAST(A.Edatetime AS DATE)


)
SELECT 
    ROW_NUMBER() OVER (ORDER BY [DATE] asc) AS SL_NO,
    CONVERT(VARCHAR(10), [DATE], 103) AS [DATE],
    SHIFT, LINE, STAGE, ATTENDANCE,
    CASE WHEN LateMinutes > 0 THEN PUNCTUALITY + ' (' + CAST(LateMinutes AS VARCHAR) + ' min late)' ELSE PUNCTUALITY END AS PUNCTUALITY
FROM EmployeeHistory
ORDER BY SL_NO;

  
  `;

    const result = await request.query(query);

    res.json({
      employeeId,
      fromDate,
      toDate,
      records: result.recordset,
    });
    console.log(result.recordset)
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).send("Error fetching attendance history");
  } finally {
    await sql.close();
  }
});



app.get("/api/employees", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT userid, name, UserIDEnbl
      FROM dbo.MX_USERMST
      where ISNULL(UserIDEnbl, 0) = 1
      ORDER BY userid
    `);

    res.json(result.recordset); // [{ userid: 101, name: 'John' }, { userid: 102, name: 'Alice' }]
   
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});



app.get("/api/employees-showall", async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT userid, name, UserIDEnbl
      FROM dbo.MX_USERMST
      ORDER BY name
    `);

    res.json(result.recordset); // [{ userid: 101, name: 'John' }, { userid: 102, name: 'Alice' }]
   
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

app.get('/api/punch_report', async (req, res) => {
  try {
    console.log(req.query)
    // 1. Read & validate query-string parameters
    const userId = req.query.userid;        // NVARCHAR(50)
    const fromDate = req.query.fromDate;    // YYYY-MM-DD
    const toDate = req.query.toDate;        // YYYY-MM-DD
    
    if (!userId || !fromDate || !toDate)
      return res.status(400).json({ error: "Missing required 'userid', 'fromDate' and 'toDate' (YYYY-MM-DD)" });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate))
      return res.status(400).json({ error: 'Invalid fromDate format. Use YYYY-MM-DD' });
      
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate))
      return res.status(400).json({ error: 'Invalid toDate format. Use YYYY-MM-DD' });

    // Validate date range
    if (new Date(fromDate) > new Date(toDate))
      return res.status(400).json({ error: 'fromDate cannot be later than toDate' });

    const earlyGrace = Number.isFinite(+req.query.earlyGrace) ? +req.query.earlyGrace : 30;
    const lateGrace  = Number.isFinite(+req.query.lateGrace)  ? +req.query.lateGrace  : 30;

    // 2. Get a pooled SQL connection (mssql)
    const pool = await sql.connect(config);

    // 3. The updated query to handle date ranges
    const query = `
DECLARE @UserId     NVARCHAR(50) = @UserIdParam;
DECLARE @FromDate   DATE         = @FromDateParam;
DECLARE @ToDate     DATE         = @ToDateParam;
DECLARE @EarlyGrace INT          = @EarlyGraceParam;
DECLARE @LateGrace  INT          = @LateGraceParam;

WITH DateRange AS (
    SELECT @FromDate AS WorkDate
    UNION ALL
    SELECT DATEADD(DAY,1,WorkDate)
    FROM   DateRange
    WHERE  WorkDate < @ToDate
),

ShiftInfoByDate AS (
    SELECT DR.WorkDate,
           -- Direct shift assignment
           (SELECT TOP 1 Shift_ID
            FROM  dbo.Mx_UserShifts
            WHERE UserId = @UserId
              AND Shift_date_from = DR.WorkDate) AS DirectShiftID,
           
           -- Swap shift assignment  
           (SELECT TOP 1 Shift_ID
            FROM  dbo.Mx_Userswap
            WHERE Swap_userid = @UserId
              AND Shift_date  = DR.WorkDate) AS SwapShiftID,
           
           -- IMPROVED: Automatic detection with better night shift handling
           (SELECT TOP 1 SM.SFTID
            FROM dbo.Mx_ShiftMst SM
            CROSS APPLY (
                 SELECT 
                 MIN(Edatetime) AS FirstPunch,
                 MAX(Edatetime) AS LastPunch
                 FROM dbo.Mx_ATDEventTrn
                 WHERE UserId = @UserId
                 AND Edatetime >= DATEADD(HOUR,-6, CAST(DR.WorkDate AS DATETIME2))
                 AND Edatetime < DATEADD(HOUR,42, CAST(DR.WorkDate AS DATETIME2))
            ) P
            WHERE P.FirstPunch IS NOT NULL 
              AND P.LastPunch IS NOT NULL
              AND (
                  -- Flexible first punch: from early grace before start to late grace after end
                  P.FirstPunch BETWEEN 
                      DATEADD(MINUTE, -@EarlyGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2)))
                      AND 
                      DATEADD(MINUTE, @LateGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                          CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                               THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                               ELSE CAST(DR.WorkDate AS DATETIME2) END))
              )
              AND (
                  -- Flexible last punch: from shift start to late grace after end
                  P.LastPunch BETWEEN 
                      DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2))
                      AND 
                      DATEADD(MINUTE, @LateGrace, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                          CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                               THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                               ELSE CAST(DR.WorkDate AS DATETIME2) END))
              )
              AND (
                  -- Duration validation: ensure reasonable shift duration (4-16 hours)
                  DATEDIFF(HOUR, P.FirstPunch, P.LastPunch) BETWEEN 4 AND 16
              )
            ORDER BY 
                -- Prioritize shifts where punches are closest to expected times
                ABS(DATEDIFF(MINUTE, P.FirstPunch, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTSTTime), CAST(DR.WorkDate AS DATETIME2)))) +
                ABS(DATEDIFF(MINUTE, P.LastPunch, DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00', SM.SFTEDTime), 
                    CASE WHEN SM.SFTEDTime <= SM.SFTSTTime 
                         THEN DATEADD(DAY,1, CAST(DR.WorkDate AS DATETIME2)) 
                         ELSE CAST(DR.WorkDate AS DATETIME2) END)))
           ) AS AutoDetectedShiftID
    FROM DateRange DR
),

ShiftAssignmentType AS (
    SELECT WorkDate,
           COALESCE(DirectShiftID, SwapShiftID, AutoDetectedShiftID) AS ShiftID,
           CASE 
               WHEN DirectShiftID IS NOT NULL THEN CAST(DirectShiftID AS NVARCHAR(50))
               WHEN SwapShiftID IS NOT NULL THEN CAST(SwapShiftID AS NVARCHAR(50))
               WHEN AutoDetectedShiftID IS NOT NULL THEN CAST(AutoDetectedShiftID AS NVARCHAR(50)) + ' (Automatically Identified)'
               ELSE 'Not Assigned'
           END AS DisplayShiftID
    FROM ShiftInfoByDate
),

ShiftTimesByDate AS (
    SELECT  SAT.WorkDate,
            SAT.ShiftID,
            SAT.DisplayShiftID,
            SM.SFTID,
            SM.SFTSTTime,
            SM.SFTEDTime,
            SM.BRKSTTime,                                                        -- Break start time
            SM.BRKEDTime,                                                        -- Break end time
            CASE WHEN SM.SFTEDTime <= SM.SFTSTTime THEN 1 ELSE 0 END          AS IsOvernight,
            DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.SFTSTTime), CAST(SAT.WorkDate AS DATETIME2))                   AS ShiftStart,
            DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.SFTEDTime),
                         CASE WHEN SM.SFTEDTime <= SM.SFTSTTime
                              THEN DATEADD(DAY,1,CAST(SAT.WorkDate AS DATETIME2))
                              ELSE CAST(SAT.WorkDate AS DATETIME2) END)                                               AS ShiftEnd,
            -- Calculate break start datetime
            CASE WHEN SM.BRKSTTime IS NOT NULL 
                 THEN DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.BRKSTTime), CAST(SAT.WorkDate AS DATETIME2))
                 ELSE NULL END                                                   AS BreakStart,
            -- Calculate break end datetime  
            CASE WHEN SM.BRKEDTime IS NOT NULL 
                 THEN DATEADD(SECOND, DATEDIFF(SECOND,'00:00:00',SM.BRKEDTime),
                           CASE WHEN SM.BRKEDTime <= SM.BRKSTTime
                                THEN DATEADD(DAY,1,CAST(SAT.WorkDate AS DATETIME2))
                                ELSE CAST(SAT.WorkDate AS DATETIME2) END)
                 ELSE NULL END                                                   AS BreakEnd
    FROM   ShiftAssignmentType SAT
    LEFT   JOIN dbo.Mx_ShiftMst SM ON SM.SFTID = SAT.ShiftID
),

PunchStats AS (
    SELECT  ST.WorkDate,
            ST.SFTID,
            COUNT(P.Edatetime)                                                   AS TotalPunchesShift,
            STRING_AGG( FORMAT(P.Edatetime,'HH:mm:ss'), ', ' ) WITHIN GROUP
            (ORDER BY P.Edatetime)                                               AS PunchList
    FROM   ShiftTimesByDate ST
    LEFT   JOIN dbo.Mx_ATDEventTrn P
           ON  P.UserId   = @UserId
           AND P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND     DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    GROUP  BY ST.WorkDate, ST.SFTID
),

PunchDataByDate AS (
    SELECT  ST.WorkDate,
            ST.SFTID,
            ST.DisplayShiftID,
            ST.SFTSTTime,
            ST.SFTEDTime,
            ST.BRKSTTime,
            ST.BRKEDTime,
            ST.IsOvernight,
            ST.ShiftStart,
            ST.ShiftEnd,
            ST.BreakStart,
            ST.BreakEnd,
            MIN(CASE WHEN P.Edatetime >= CAST(ST.WorkDate AS DATETIME2)
                           AND P.Edatetime <  DATEADD(DAY,1,CAST(ST.WorkDate AS DATETIME2))
                     THEN P.Edatetime END)                                       AS FirstPunchDay,
            MAX(CASE WHEN P.Edatetime >= CAST(ST.WorkDate AS DATETIME2)
                           AND P.Edatetime <  DATEADD(DAY,1,CAST(ST.WorkDate AS DATETIME2))
                     THEN P.Edatetime END)                                       AS LastPunchDay,
            MIN(CASE WHEN P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                     AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                     THEN P.Edatetime END)                                       AS FirstPunchShift,
            MAX(CASE WHEN P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                                     AND     DATEADD(MINUTE, @LateGrace,  ST.ShiftEnd)
                     THEN P.Edatetime END)                                       AS LastPunchShift
    FROM   ShiftTimesByDate ST
    LEFT   JOIN dbo.Mx_ATDEventTrn P
           ON  P.UserId   = @UserId
           AND P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND     DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    GROUP  BY ST.WorkDate, ST.SFTID, ST.DisplayShiftID, ST.SFTSTTime, ST.SFTEDTime, ST.BRKSTTime, ST.BRKEDTime,
              ST.IsOvernight, ST.ShiftStart, ST.ShiftEnd, ST.BreakStart, ST.BreakEnd
),

-- Add this new CTE after PunchDataByDate and before the final SELECT
PunchSequence AS (
    SELECT  
        ST.WorkDate,
        ST.SFTID,
        P.Edatetime,
        ROW_NUMBER() OVER (PARTITION BY ST.WorkDate, ST.SFTID ORDER BY P.Edatetime) AS PunchNumber,
        CASE WHEN ROW_NUMBER() OVER (PARTITION BY ST.WorkDate, ST.SFTID ORDER BY P.Edatetime) % 2 = 1 
             THEN 'IN' 
             ELSE 'OUT' 
        END AS PunchType
    FROM   ShiftTimesByDate ST
    INNER  JOIN dbo.Mx_ATDEventTrn P
           ON  P.UserId   = @UserId
           AND P.Edatetime BETWEEN DATEADD(MINUTE,-@EarlyGrace, ST.ShiftStart)
                               AND DATEADD(MINUTE, @LateGrace, ST.ShiftEnd)
    WHERE  ST.SFTID IS NOT NULL
),

WorkingPairs AS (
    SELECT  
        PS_IN.WorkDate,
        PS_IN.SFTID,
        PS_IN.Edatetime AS PunchIn,
        PS_OUT.Edatetime AS PunchOut,
        PS_IN.PunchNumber,
        DATEDIFF(SECOND, PS_IN.Edatetime, PS_OUT.Edatetime) AS WorkingSeconds
    FROM   PunchSequence PS_IN
    LEFT   JOIN PunchSequence PS_OUT 
           ON  PS_IN.WorkDate = PS_OUT.WorkDate
           AND PS_IN.SFTID = PS_OUT.SFTID
           AND PS_IN.PunchNumber = PS_OUT.PunchNumber - 1
           AND PS_IN.PunchType = 'IN'
           AND PS_OUT.PunchType = 'OUT'
    WHERE  PS_IN.PunchType = 'IN'
),

WorkingHoursCalculation AS (
    SELECT  
        WorkDate,
        SFTID,
        SUM(CASE WHEN WorkingSeconds > 0 THEN WorkingSeconds ELSE 0 END) AS TotalWorkingSeconds,
        CAST(SUM(CASE WHEN WorkingSeconds > 0 THEN WorkingSeconds ELSE 0 END) / 3600.0 AS DECIMAL(10,2)) AS ActualHoursWorked,
        COUNT(CASE WHEN PunchOut IS NOT NULL THEN 1 END) AS CompletedWorkSessions,
        COUNT(CASE WHEN PunchOut IS NULL THEN 1 END) AS IncompleteWorkSessions,
        STRING_AGG(
            CASE WHEN PunchOut IS NOT NULL 
                 THEN FORMAT(PunchIn,'HH:mm') + '-' + FORMAT(PunchOut,'HH:mm') + ' (' + 
                      CAST(CAST(WorkingSeconds/3600.0 AS DECIMAL(10,2)) AS NVARCHAR(10)) + 'h)'
                 ELSE FORMAT(PunchIn,'HH:mm') + '-??? (incomplete)'
            END, 
            ', '
        ) WITHIN GROUP (ORDER BY PunchNumber) AS WorkingSessions
    FROM   WorkingPairs
    GROUP  BY WorkDate, SFTID
)


SELECT
    @UserId                                   AS UserId,
    PD.WorkDate                               AS WorkDate,
    PD.WorkDate                               AS Date,
    PD.DisplayShiftID                         AS ShiftID,
    PD.SFTSTTime                              AS ShiftStartTime,
    PD.SFTEDTime                              AS ShiftEndTime,
    PD.BRKSTTime                              AS BreakStartTime,
    PD.BRKEDTime                              AS BreakEndTime,
    PD.IsOvernight                            AS IsNightShift,
    PD.ShiftStart                             AS ShiftStartDateTime,
    PD.ShiftEnd                               AS ShiftEndDateTime,
    PD.BreakStart                             AS BreakStartDateTime,
    PD.BreakEnd                               AS BreakEndDateTime,

    PD.FirstPunchDay                          AS FirstPunchInDay,
    PD.LastPunchDay                           AS LastPunchInDay,
    PD.FirstPunchShift                        AS FirstPunchInShift,
    PD.LastPunchShift                         AS LastPunchInShift,
    FORMAT(PD.FirstPunchShift,'HH:mm')        AS firstpunch,
    FORMAT(PD.LastPunchShift ,'HH:mm')        AS lastpunch,

    -- Original calculations (for comparison)
    CAST(DATEDIFF(SECOND, PD.FirstPunchShift, PD.LastPunchShift)/3600.0 AS DECIMAL(10,2)) AS HoursWorkedInclusive,
    CAST(DATEDIFF(SECOND,
          CASE WHEN PD.FirstPunchShift < PD.ShiftStart THEN PD.ShiftStart ELSE PD.FirstPunchShift END,
          CASE WHEN PD.LastPunchShift  > PD.ShiftEnd   THEN PD.ShiftEnd   ELSE PD.LastPunchShift  END)/3600.0 AS DECIMAL(10,2)) AS HoursWithinShift,

    -- NEW: Actual working hours calculation
    COALESCE(WHC.ActualHoursWorked, 0)        AS ActualHoursWorked,
    COALESCE(WHC.CompletedWorkSessions, 0)    AS CompletedWorkSessions,
    COALESCE(WHC.IncompleteWorkSessions, 0)   AS IncompleteWorkSessions,
    WHC.WorkingSessions                       AS WorkingSessionsDetail,

    CASE WHEN PD.FirstPunchShift < PD.ShiftStart THEN DATEDIFF(MINUTE, PD.FirstPunchShift, PD.ShiftStart) ELSE 0 END AS EarlyArrivedMinutes,
    CASE WHEN PD.LastPunchShift  > PD.ShiftEnd   THEN DATEDIFF(MINUTE, PD.ShiftEnd     , PD.LastPunchShift) ELSE 0 END AS LateStayMinutes,

    PD.BreakStart                             AS GivenBreakStart,
    PD.BreakEnd                               AS GivenBreakEnd,
    NULL                                      AS TakenBreakStart,
    NULL                                      AS TakenBreakEnd,

    PS.TotalPunchesShift                      AS TotalPunches,
    PS.PunchList                              AS PunchTimes
FROM   PunchDataByDate PD
LEFT   JOIN PunchStats  PS
       ON  PS.WorkDate = PD.WorkDate
      AND PS.SFTID     = PD.SFTID
LEFT   JOIN WorkingHoursCalculation WHC
       ON  WHC.WorkDate = PD.WorkDate
       AND WHC.SFTID = PD.SFTID
WHERE  PD.WorkDate IS NOT NULL
ORDER  BY PD.WorkDate
OPTION (MAXRECURSION 366);


`;


    // 4. Execute with parameter binding
    const rs = await pool.request()
      .input('UserIdParam',     sql.NVarChar(50), userId)
      .input('FromDateParam',   sql.Date,         fromDate)
      .input('ToDateParam',     sql.Date,         toDate)
      .input('EarlyGraceParam', sql.Int,          earlyGrace)
      .input('LateGraceParam',  sql.Int,          lateGrace)
      .query(query);

    // 5. Return array of results (one row per date in range)
    console.log(rs.recordset)
    return res.json(rs.recordset);

  } catch (err) {
    console.error('Error in /api/punch_report:', err);
    return res.status(500).json({ error: 'Server Error', details: String(err) });
  }
});


app.post("/api/employee-punctuality", async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;
console.log(req.body)
  if (!employeeId ) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    await sql.connect(config);


const request = new sql.Request();

request.input("EmployeeId", sql.NVarChar, employeeId); // ✅ match SQL variable name

    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);


    const query = `
WITH EmployeePunctuality AS (
    -- From Mx_UserShifts
    SELECT 
        U.USERID,
        U.NAME,
        S.Shift_date_from AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        S.SHIFT_ID AS SHIFTNAME,
        S.LINE,
        ST.stage_name AS STAGE,
        FORMAT(ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN ActualPunch IS NULL THEN 'No Punch'
            WHEN ActualPunch <= DATEADD(MINUTE, 10, ShiftStart) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN ActualPunch IS NOT NULL 
                THEN CASE WHEN DATEDIFF(MINUTE, ShiftStart, ActualPunch) < 0 THEN 0 ELSE DATEDIFF(MINUTE, ShiftStart, ActualPunch) END
            ELSE 0
        END AS LateMinutes
    FROM Mx_UserShifts S
    INNER JOIN MX_USERMST U ON S.USERID = U.USERID
    INNER JOIN Mx_ShiftMst MS ON S.SHIFT_ID = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON S.stage_id = ST.Stage_Serial
    CROSS APPLY (
        SELECT 
            ShiftStart = CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME),
            ShiftEnd = CASE WHEN MS.SFTEDTime < MS.SFTSTTime
                            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
                            ELSE CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME)
                       END
    ) AS Shifts
    OUTER APPLY (
        SELECT ActualPunch = 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                THEN (
                    SELECT MAX(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                ELSE (
                    SELECT MIN(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = S.USERID
                      AND A2.Edatetime >= Shifts.ShiftStart
                      AND A2.Edatetime <= Shifts.ShiftEnd
                )
            END
    ) AS PunchCalc
    WHERE S.USERID = @EmployeeId
      AND S.Shift_date_from BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- From Mx_Userswap
    SELECT 
        U.USERID,
        U.NAME,
        SW.Shift_date AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        SW.Shift_id AS SHIFTNAME,
        SW.LINE,
        ST.stage_name AS STAGE,
        FORMAT(ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE,
        CASE 
            WHEN ActualPunch IS NULL THEN 'No Punch'
            WHEN ActualPunch <= DATEADD(MINUTE, 10, ShiftStart) THEN 'On Time'
            ELSE 'Late'
        END AS PUNCTUALITY,
        CASE 
            WHEN ActualPunch IS NOT NULL 
                THEN CASE WHEN DATEDIFF(MINUTE, ShiftStart, ActualPunch) < 0 THEN 0 ELSE DATEDIFF(MINUTE, ShiftStart, ActualPunch) END
            ELSE 0
        END AS LateMinutes
    FROM Mx_Userswap SW
    INNER JOIN MX_USERMST U ON SW.Swap_userid = U.USERID
    INNER JOIN Mx_ShiftMst MS ON SW.Shift_id = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON SW.stage_id = ST.Stage_Serial
    CROSS APPLY (
        SELECT 
            ShiftStart = CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME),
            ShiftEnd = CASE WHEN MS.SFTEDTime < MS.SFTSTTime
                            THEN DATEADD(DAY, 1, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
                            ELSE CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME)
                       END
    ) AS Shifts
    OUTER APPLY (
        SELECT ActualPunch = 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                THEN (
                    SELECT MAX(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime BETWEEN DATEADD(MINUTE, -45, Shifts.ShiftStart) AND Shifts.ShiftStart
                )
                ELSE (
                    SELECT MIN(A2.Edatetime)
                    FROM Mx_ATDEventTrn A2
                    WHERE A2.USERID = SW.Swap_userid
                      AND A2.Edatetime >= Shifts.ShiftStart
                      AND A2.Edatetime <= Shifts.ShiftEnd
                )
            END
    ) AS PunchCalc
    WHERE SW.Swap_userid = @EmployeeId
      AND SW.Shift_date BETWEEN @FromDate AND @ToDate

    UNION ALL

    -- Users present in attendance but not in UserShifts or UserSwap
    SELECT
        U.USERID,
        U.NAME,
        CAST(A.Edatetime AS DATE) AS [DATE],
        NULL AS SHIFT,
        NULL AS ScheduledStart,
        NULL AS SHIFTNAME,
        NULL AS LINE,
        NULL AS STAGE,
        FORMAT(MIN(A.Edatetime), 'HH:mm') AS ActualPunch,
        'Present (No Shift)' AS ATTENDANCE,
        'No Shift Assigned' AS PUNCTUALITY,
        0 AS LateMinutes
    FROM Mx_ATDEventTrn A
    INNER JOIN MX_USERMST U ON A.USERID = U.USERID
    WHERE A.USERID = @EmployeeId
      AND CAST(A.Edatetime AS DATE) BETWEEN @FromDate AND @ToDate
      AND NOT EXISTS (
            SELECT 1 FROM Mx_UserShifts S 
            WHERE S.USERID = A.USERID 
              AND S.Shift_date_from = CAST(A.Edatetime AS DATE)
        )
      AND NOT EXISTS (
            SELECT 1 FROM Mx_Userswap SW 
            WHERE SW.Swap_userid = A.USERID 
              AND SW.Shift_date = CAST(A.Edatetime AS DATE)
        )
    GROUP BY U.USERID, U.NAME, CAST(A.Edatetime AS DATE)
)
SELECT 
    USERID, 
    NAME, 
    CONVERT(VARCHAR(10), [DATE], 103) AS [DATE],    
    SHIFTNAME,
    SHIFT,
    LINE, 
    CASE 
        WHEN ScheduledStart IS NOT NULL 
        THEN FORMAT(DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), 'HH:mm')
        ELSE 'N/A'
    END AS ScheduledStart, 
    STAGE, 
    ATTENDANCE, 
    ActualPunch,
    CASE 
        WHEN ActualPunch IS NULL THEN 'No Punch'
        WHEN TRY_CAST(ActualPunch AS TIME) IS NULL THEN 'No Punch'
        WHEN ScheduledStart IS NOT NULL AND DATEDIFF(MINUTE, DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), TRY_CAST(ActualPunch AS TIME)) <= 0 
            THEN 'On Time'
        ELSE 'Late (' + CAST(DATEDIFF(MINUTE, DATEADD(MINUTE, -15, CAST(ScheduledStart AS DATETIME)), TRY_CAST(ActualPunch AS TIME)) AS VARCHAR) + ' mins late)'
    END AS PUNCTUALITY
FROM EmployeePunctuality
ORDER BY EmployeePunctuality.[DATE] ASC;


 `;



    const result = await request.query(query);
console.log(result.recordset)
    res.json({
      employeeId,
      records: result.recordset,
    });
  } catch (err) {
    console.error("Error fetching punctuality:", err);
    res.status(500).send("Error fetching punctuality details");
  } finally {
    await sql.close();
  }
});

app.post("/api/jobcard-upload", async (req, res) => {
  const records = req.body; // Expecting an array like [{ Edatetime, UserID, Job_Target, ... }, ...]

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Records array is required" });
  }

  const batchSize = 50; // Process in batches
  let totalInserted = 0;
  let totalUpdated = 0;

  try {
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    const request = new sql.Request(transaction);

    for (let i = 0; i < records.length; i += batchSize) {
      let QUERY1 = "";
      const batch = records.slice(i, i + batchSize);

      for (let rec of batch) {
        const { Edatetime, UserID, Job_Target, Job_Actual, Job_Rejns, job_5S,PPE,Job_Disclipline  } = rec;

        if (!Edatetime || !UserID) {
          return res.status(400).json({ error: "Edatetime and UserID are required in each record" });
        }

        if (QUERY1.length > 0) {
          QUERY1 += " UNION ALL ";
        }

        QUERY1 += `
          SELECT 
            CAST('${Edatetime}' AS DATE) AS Edatetime,
            '${UserID}' AS UserID,
            ${Job_Target || 0} AS Job_Target,
            ${Job_Actual || 0} AS Job_Actual,
            ${Job_Rejns || 0} AS Job_Rejns,
            ${job_5S || 0} AS job_5S,
            ${PPE || 0} AS PPE,
            ${Job_Disclipline || 0} AS Job_Disclipline
        `;
      }

      const insertQuery = `
        MERGE Mx_UserJobCard AS target
        USING (${QUERY1}) AS source
        ON target.Edatetime = source.Edatetime AND target.UserID = source.UserID
        WHEN MATCHED THEN
          UPDATE SET 
            target.Job_Target = source.Job_Target,
            target.Job_Actual = source.Job_Actual,
            target.Job_Rejns = source.Job_Rejns,
            target.job_5S = source.job_5S,
            target.PPE = source.PPE,
           target.Job_Disclipline = source.Job_Disclipline
        WHEN NOT MATCHED THEN
          INSERT (Edatetime, UserID, Job_Target, Job_Actual, Job_Rejns,job_5S,PPE,Job_Disclipline)
          VALUES (source.Edatetime, source.UserID, source.Job_Target, source.Job_Actual, source.Job_Rejns,source.job_5S, source.PPE, source.Job_Disclipline)
        OUTPUT
          $action AS Action; -- Will return 'INSERT' or 'UPDATE' per row
      `;

      const result = await request.query(insertQuery);

      result.recordset.forEach(row => {
        if (row.Action === 'INSERT') totalInserted++;
        else if (row.Action === 'UPDATE') totalUpdated++;
      });

    }

    await transaction.commit();
    await sql.close();

    res.json({
      success: true,
      message: "Job card data processed successfully.",
      inserted: totalInserted,
      updated: totalUpdated
    });

  } catch (error) {
    console.error("Error processing job card:", error);
    try {      await transaction.rollback();

    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    res.status(500).json({ error: "Error inserting/updating job card" });
  }
});

app.post("/api/employee-Jobreport", async (req, res) => {
  const { employeeId, fromDate, toDate } = req.body;
console.log(req.body)
  if (!employeeId ) {
    return res.status(400).send("Missing required parameters");
  }

  try {
    await sql.connect(config);


const request = new sql.Request();

request.input("EmployeeId", sql.NVarChar, employeeId); // ✅ match SQL variable name

    request.input("FromDate", sql.Date, fromDate);
    request.input("ToDate", sql.Date, toDate);

const query = `
WITH EmployeeJobreport AS (
    SELECT 
        U.USERID,
        U.NAME,
        S.Shift_date_from AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        S.LINE,
        ST.stage_name AS STAGE,
        S.SHIFT_ID AS SHIFTNAME,
        FORMAT(ATD.ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ATD.ActualPunch IS NOT NULL THEN 5 ELSE 0 END AS Attendance,
        CASE WHEN ATD.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE_Status,
        CASE 
            WHEN ATD.ActualPunch IS NULL THEN 'No Punch'
            WHEN ATD.ActualPunch <= DATEADD(MINUTE, 10, CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME))
                THEN 'On Time'
            ELSE 'Late'
        END AS Jobreport,
        ISNULL(J.Job_Target,0) AS Job_Target,
        ISNULL(J.Job_Actual,0) AS Job_Actual,
        ISNULL(J.Job_Rejns,0) AS Job_Rejns,
        ISNULL(J.Job_5S,0) AS Job_5S,
        ISNULL(J.PPE,0) AS PPE,
        ISNULL(J.Job_Disclipline,0) AS Job_Disclipline
    FROM Mx_UserShifts S
    LEFT JOIN MX_USERMST U ON S.USERID = U.USERID
    LEFT JOIN Mx_UserJobCard J ON S.USERID = J.USERID AND J.Edatetime = S.Shift_date_from
    LEFT JOIN Mx_ShiftMst MS ON S.SHIFT_ID = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON S.stage_id = ST.Stage_Serial
    OUTER APPLY (
        SELECT TOP 1 A.Edatetime AS ActualPunch
        FROM Mx_ATDEventTrn A
        WHERE A.USERID = S.USERID
        AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME))
                            AND DATEADD(MINUTE, 600, CAST(CONVERT(VARCHAR(10), S.Shift_date_from, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
        ORDER BY A.Edatetime
    ) ATD
    WHERE S.USERID = @EmployeeId 
      AND S.Shift_date_from BETWEEN @FromDate AND @ToDate 

    UNION ALL

    SELECT 
        U.USERID,
        U.NAME,
        SW.Shift_date AS [DATE],
        CONCAT(FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm'), '-', FORMAT(CAST(MS.SFTEDTime AS DATETIME), 'HH:mm')) AS SHIFT,
        FORMAT(CAST(MS.SFTSTTime AS DATETIME), 'HH:mm') AS ScheduledStart,
        SW.LINE,        
        SW.Shift_id AS SHIFTNAME,
        ST.stage_name AS STAGE,
        FORMAT(ATD.ActualPunch, 'HH:mm') AS ActualPunch,
        CASE WHEN ATD.ActualPunch IS NOT NULL THEN 5 ELSE 0 END AS Attendance,
        CASE WHEN ATD.ActualPunch IS NOT NULL THEN 'Present' ELSE 'Absent' END AS ATTENDANCE_Status,
        CASE 
            WHEN ATD.ActualPunch IS NULL THEN 'No Punch'
            WHEN ATD.ActualPunch <= DATEADD(MINUTE, 10, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME))
                THEN 'On Time'
            ELSE 'Late'
        END AS Jobreport,
        ISNULL(J.Job_Target,0) AS Job_Target,
        ISNULL(J.Job_Actual,0) AS Job_Actual,
        ISNULL(J.Job_Rejns,0) AS Job_Rejns,
        ISNULL(J.Job_5S,0) AS Job_5S,
        ISNULL(J.PPE,0) AS PPE,
        ISNULL(J.Job_Disclipline,0) AS Job_Disclipline
    FROM Mx_Userswap SW
    LEFT JOIN MX_USERMST U ON SW.Swap_userid = U.USERID
    LEFT JOIN Mx_UserJobCard J ON SW.Swap_userid = J.USERID AND J.Edatetime = SW.Shift_date
    LEFT JOIN Mx_ShiftMst MS ON SW.Shift_id = MS.SFTID
    LEFT JOIN Mx_STAGEMASTER ST ON SW.stage_id = ST.Stage_Serial
    OUTER APPLY (
        SELECT TOP 1 A.Edatetime AS ActualPunch
        FROM Mx_ATDEventTrn A
        WHERE A.USERID = SW.Swap_userid
        AND A.Edatetime BETWEEN DATEADD(MINUTE, -45, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTSTTime, 108) AS DATETIME))
                            AND DATEADD(MINUTE, 600, CAST(CONVERT(VARCHAR(10), SW.Shift_date, 120) + ' ' + CONVERT(VARCHAR(8), MS.SFTEDTime, 108) AS DATETIME))
        ORDER BY A.Edatetime
    ) ATD
    WHERE SW.Swap_userid = @EmployeeId
     AND SW.Shift_date BETWEEN @FromDate AND @ToDate

         UNION ALL

    -- Users present in attendance but not in UserShifts or UserSwap
    SELECT 
        U.USERID,
        U.NAME,
        CAST(A.Edatetime AS DATE) AS [DATE],
        NULL AS SHIFT,
        NULL AS ScheduledStart,
        NULL AS LINE,
        NULL AS STAGE,
        NULL AS SHIFTNAME,
        FORMAT(MIN(A.Edatetime), 'HH:mm') AS ActualPunch,
        5 AS Attendance,
        'Present' AS ATTENDANCE_Status,
        'No Shift Assigned' AS Jobreport,
        0 AS Job_Target,
        0 AS Job_Actual,
        0 AS Job_Rejns,
        0 AS Job_5S,
        0 AS PPE,
        0 AS Job_Disclipline
    FROM Mx_ATDEventTrn A
    INNER JOIN MX_USERMST U ON A.USERID = U.USERID
    WHERE A.USERID = @EmployeeId
      AND CAST(A.Edatetime AS DATE) BETWEEN @FromDate AND @ToDate
      AND NOT EXISTS (
            SELECT 1 FROM Mx_UserShifts S
            WHERE S.USERID = A.USERID
              AND S.Shift_date_from = CAST(A.Edatetime AS DATE)
      )
      AND NOT EXISTS (
            SELECT 1 FROM Mx_Userswap SW
            WHERE SW.Swap_userid = A.USERID
              AND SW.Shift_date = CAST(A.Edatetime AS DATE)
      )
    GROUP BY U.USERID, U.NAME, CAST(A.Edatetime AS DATE)


)
SELECT 
    CONVERT(VARCHAR(10), [DATE], 103) AS Date,
    SHIFTNAME, 
    STAGE, 
    LINE, 
    ActualPunch, 
    ScheduledStart,
    Job_Target AS Target,
    Job_Actual AS Actual,
    CASE 
        WHEN Job_Target > 0 
        THEN ROUND((CAST(Job_Actual AS DECIMAL(18,4)) / CAST(Job_Target AS DECIMAL(18,4))) * 50.0, 0) 
        ELSE 0 
    END AS Performance,

    Attendance,
    CASE 
        WHEN ActualPunch IS NULL OR ActualPunch = '00:00' THEN 0
        WHEN ActualPunch > ScheduledStart THEN 0 
        ELSE 5 
    END AS Punctuality,
    
    Job_5S AS [5S],
    Job_Rejns AS Rejections,
    PPE,
    Job_Disclipline AS Disclipline,

    (
        ISNULL(Job_Rejns,0) 
        + ISNULL(Job_5S,0) 
        + ISNULL(PPE,0) 
        + ISNULL(Job_Disclipline,0) 
        + CASE 
            WHEN Job_Target > 0 
            THEN ROUND((CAST(Job_Actual AS DECIMAL(18,4)) / CAST(Job_Target AS DECIMAL(18,4))) * 50.0, 0) 
            ELSE 0 
          END
        + Attendance
        + CASE 
            WHEN ActualPunch IS NULL OR ActualPunch = '00:00' THEN 0
        WHEN ActualPunch > ScheduledStart THEN 0 
            ELSE 5 
          END
    ) AS Total
FROM EmployeeJobreport
ORDER BY [DATE] ASC;


`;



    const result = await request.query(query);
console.log(result.recordset)
    res.json({
      employeeId,
      records: result.recordset,
    });
  } catch (err) {
    console.error("Error fetching Jobreport:", err);
    res.status(500).send("Error fetching Jobreport details");
  } finally {
    await sql.close();
  }
});


app.get("/download-templatejob", (req, res) => {

  const filePath = path.join(

    __dirname,

    "../master/public",

    "EmployeeJobCardSampleData.xlsx"

  );

  res.download(filePath, (err) => {

    if (err) {

      console.error("Error downloading file:", err);

      res.status(500).send("Error downloading file");

    }

  });

});


sql
  .connect(config)
  .then((pool) => {
    console.log("✅ Connected to database");
    // Start server only if DB connected
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });

