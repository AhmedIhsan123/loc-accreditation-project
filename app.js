import express from "express";
import mysql2 from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const pool = mysql2
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		port: process.env.DB_PORT,
	})
	.promise();

const PORT = 3100;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ------------------------------
 * GET: Home
 * ------------------------------
 */
app.get("/", (req, res) => {
	res.render("home");
});

/**
 * ------------------------------
 * GET: Edit Page
 * ------------------------------
 */
app.get("/edit", async (req, res) => {
	try {
		const [rows] = await pool.query(
			`SELECT
				d.ID AS division_ID,
				d.division_name,
				chair.person_name AS chair_name,
				dean.person_name AS dean_name,
				loc.person_name AS loc_rep,
				pen.person_name AS pen_contact,
				p.ID AS program_ID,
				p.program_name,
				p.has_been_paid,
				p.report_submitted,
				p.notes,
				py.ID AS payee_ID,
				py.payee_name,
				py.payee_amount AS amount
			FROM Divisions d
			LEFT JOIN Programs p ON d.ID = p.division_ID
			LEFT JOIN Payees py ON p.ID = py.program_ID
			LEFT JOIN Persons chair ON d.chair_ID = chair.ID
			LEFT JOIN Persons dean ON d.dean_ID = dean.ID
			LEFT JOIN Persons loc ON d.loc_ID = loc.ID
			LEFT JOIN Persons pen ON d.pen_ID = pen.ID
			ORDER BY d.division_name, p.program_name, py.payee_name`
		);

		const divisionsMap = {};
		rows.forEach((row) => {
			const divName = row.division_name;
			if (!divisionsMap[divName]) {
				divisionsMap[divName] = {
					divisionID: row.division_ID,
					divisionName: divName,
					deanName: row.dean_name || "",
					penContact: row.pen_contact || "",
					locRep: row.loc_rep || "",
					chairName: row.chair_name || "",
					programList: [],
				};
			}

			if (row.program_name) {
				let program = divisionsMap[divName].programList.find(
					(p) => p.programName === row.program_name
				);

				if (!program) {
					program = {
						programID: row.program_ID,
						programName: row.program_name,
						hasBeenPaid: Boolean(row.has_been_paid),
						reportSubmitted: Boolean(row.report_submitted),
						notes: row.notes || "",
						payees: [],
					};
					divisionsMap[divName].programList.push(program);
				}

				if (row.payee_name) {
					program.payees.push({
						payeeID: row.payee_ID,
						payeeName: row.payee_name,
						payeeAmount: row.amount,
					});
				}
			}
		});

		const result = Object.values(divisionsMap);
		res.render("edit", { departments: result });
	} catch (error) {
		console.error("Error fetching divisions for edit:", error);
		res.status(500).render("edit", { departments: [] });
	}
});

/**
 * ------------------------------
 * PATCH: Full update from frontend
 * ------------------------------
 */
app.patch("/api/division/full-update", async (req, res) => {
	try {
		const { divisionName, dean, pen, loc, chair, programs } = req.body;
		console.log("Received update request for division:", divisionName);
		console.log("Division-level data:", { dean, pen, loc, chair });
		console.log("Programs received:", programs);

		if (!divisionName) {
			console.log("No division name provided!");
			return res.status(400).json({ error: "Division name is required" });
		}

		// --- Get division ID ---
		const [divisionRows] = await pool.query(
			"SELECT ID FROM Divisions WHERE division_name = ?",
			[divisionName]
		);
		if (!divisionRows.length) {
			console.log("Division not found in DB:", divisionName);
			return res.status(404).json({ error: "Division not found" });
		}
		const divisionID = divisionRows[0].ID;
		console.log("Division ID:", divisionID);

		// --- Update division persons ---
		const personMap = { chair, dean, loc, pen };
		for (const [role, name] of Object.entries(personMap)) {
			if (!name) continue;
			console.log(`Processing ${role}: ${name}`);

			// Get or create person
			let [personRows] = await pool.query(
				"SELECT ID FROM Persons WHERE person_name = ?",
				[name]
			);
			let personID;
			if (personRows.length) {
				personID = personRows[0].ID;
				console.log(`Found existing person ${name} with ID:`, personID);
			} else {
				const [result] = await pool.query(
					"INSERT INTO Persons (person_name) VALUES (?)",
					[name]
				);
				personID = result.insertId;
				console.log(`Created new person ${name} with ID:`, personID);
			}

			// Update division
			await pool.query(`UPDATE Divisions SET ${role}_ID = ? WHERE ID = ?`, [
				personID,
				divisionID,
			]);
			console.log(`Updated division ${divisionID} ${role}_ID to`, personID);
		}

		// --- Handle programs ---
		for (const prog of programs) {
			console.log("Processing program:", prog.programName);

			const [progRows] = await pool.query(
				"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ?",
				[prog.programName, divisionID]
			);

			let programID;
			if (progRows.length) {
				programID = progRows[0].ID;
				await pool.query(
					`UPDATE Programs
					 SET has_been_paid = ?, report_submitted = ?, notes = ?
					 WHERE ID = ?`,
					[prog.hasBeenPaid, prog.reportSubmitted, prog.notes, programID]
				);
				console.log(
					`Updated existing program ${prog.programName} (ID: ${programID})`
				);
			} else {
				const [result] = await pool.query(
					`INSERT INTO Programs
					 (program_name, division_ID, has_been_paid, report_submitted, notes)
					 VALUES (?, ?, ?, ?, ?)`,
					[
						prog.programName,
						divisionID,
						prog.hasBeenPaid,
						prog.reportSubmitted,
						prog.notes,
					]
				);
				programID = result.insertId;
				console.log(
					`Inserted new program ${prog.programName} with ID:`,
					programID
				);
			}

			// --- Handle payees ---
			const existingPayeeNames = Object.keys(prog.payees);
			console.log("Existing payee names in frontend data:", existingPayeeNames);

			await pool.query(
				"DELETE FROM Payees WHERE program_ID = ? AND payee_name NOT IN (?)",
				[programID, existingPayeeNames.length ? existingPayeeNames : [""]]
			);
			console.log("Deleted removed payees from DB for program ID:", programID);

			for (const [name, amount] of Object.entries(prog.payees)) {
				const [payeeRows] = await pool.query(
					"SELECT ID FROM Payees WHERE program_ID = ? AND payee_name = ?",
					[programID, name]
				);
				if (payeeRows.length) {
					await pool.query("UPDATE Payees SET payee_amount = ? WHERE ID = ?", [
						amount,
						payeeRows[0].ID,
					]);
					console.log(`Updated payee ${name} with amount ${amount}`);
				} else {
					await pool.query(
						"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
						[name, amount, programID]
					);
					console.log(`Inserted new payee ${name} with amount ${amount}`);
				}
			}
		}

		console.log("Full update finished successfully.");
		res.json({ success: true });
	} catch (err) {
		console.error("Error during full update:", err);
		res.status(500).json({ error: "Failed to update division" });
	}
});

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
