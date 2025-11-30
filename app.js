// server.js
import express from "express";
import mysql2 from "mysql2";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import MySQLStoreConstructor from "express-mysql-session";
import { authenticateUser, redirectIfAuthenticated } from "./middlewares.js";

dotenv.config();

const app = express();

// initialize session store
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 1000 * 60 * 60 * 12, // 12 hours
		},
	})
);

// Create mySQL connection pool
const pool = mysql2
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	})
	.promise();

const MySQLStore = MySQLStoreConstructor(session);
const sessionStore = new MySQLStore({}, pool);

const PORT = 3200;

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make user data available across all ejs templates
app.use((req, res, next) => {
	res.locals.user = req.session.user;
	next();
});

/**
 * ------------------------------
 * GET: Login Page
 * ------------------------------
 */
app.get("/login", redirectIfAuthenticated, (req, res) => {
	res.render("login", { error: null, query: req.query });
});

/**
 * ------------------------------
 * POST: Login Submission
 * ------------------------------
 */
app.post("/login", async (req, res) => {
	const { username, password } = req.body;

	try {
		const [users] = await pool.query(
			"SELECT * FROM users WHERE username = ? AND is_active = 1",
			[username]
		);

		if (users.length === 0) {
			return res.status(401).render("login", { error: "Invalid credentials" });
		}

		const user = users[0];
		const isValid = await bcrypt.compare(password, user.password_hash);

		if (!isValid) {
			return res.status(401).render("login", { error: "Invalid credentials" });
		}

		// Set session
		req.session.user = {
			id: user.id,
			username: user.username,
			email: user.email,
			first_name: user.first_name,
		};

		// Update last login timestamp
		await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [
			user.id,
		]);

		res.redirect("/");
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).render("login", { error: "An error occurred" });
	}
});

/**
 * ------------------------------
 * GET: Registration Page
 * ------------------------------
 */
app.get("/register", redirectIfAuthenticated, (req, res) => {
	res.render("register", { error: null, success: null });
});

/**
 * ------------------------------
 * POST: Registration Submission
 * ------------------------------
 */
app.post("/register", async (req, res) => {
	const { username, email, password, first_name } = req.body;

	try {
		// Validate required fields
		if (!username || !email || !password || !first_name) {
			return res.status(400).render("register", {
				error: "All fields are required",
				success: null,
			});
		}

		// Check if username or email already exists
		const [rows] = await pool.query(
			"SELECT username, email FROM users WHERE username = ? OR email = ?",
			[username, email]
		);

		if (rows.length > 0) {
			const user = rows[0];

			if (user.username === username) {
				return res.status(409).render("register", {
					error: "Username already taken",
					success: null,
				});
			}

			if (user.email === email) {
				return res.status(409).render("register", {
					error: "Email already registered",
					success: null,
				});
			}
		}

		// Hash password
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(password, saltRounds);

		// Insert new user
		await pool.query(
			"INSERT INTO users (username, email, password_hash, first_name, created_at, is_active) VALUES (?, ?, ?, ?, NOW(), 1)",
			[username, email, password_hash, first_name]
		);

		// Redirect to login with success message
		return res.redirect("/login?registered=true");
	} catch (error) {
		console.error("Registration error:", error);
		return res.status(500).render("register", {
			error: "An error occurred during registration",
			success: null,
		});
	}
});

/**
 * ------------------------------
 * POST: Logout
 * ------------------------------
 */
app.post("/logout", authenticateUser, (req, res) => {
	req.session.destroy((error) => {
		if (error) {
			console.error("Logout error:", error);
		}
		res.redirect("/login");
	});
});

/**
 * Safely produce "?, ?, ?" placeholders for an array and return combined params.
 */
function placeholdersForArray(arr) {
	if (!Array.isArray(arr) || arr.length === 0)
		return { placeholders: "", params: [] };
	return {
		placeholders: arr.map(() => "?").join(","),
		params: arr.slice(),
	};
}

/**
 * Build a division object (used by edit / preview / download endpoints)
 * Accepts rows returned from the DB for a single division (joined rows).
 */
function buildDivisionFromRows(rows, fallbackDivisionRow = null) {
	const divisionsMap = {};
	if (!rows || rows.length === 0) {
		if (!fallbackDivisionRow) return null;
		divisionsMap[fallbackDivisionRow.division_name] = {
			divisionName: fallbackDivisionRow.division_name,
			deanName: "",
			penContact: "",
			locRep: "",
			chairName: "",
			programList: [],
		};
	} else {
		rows.forEach((row) => {
			const divName =
				row.division_name ||
				(fallbackDivisionRow && fallbackDivisionRow.division_name);
			if (!divisionsMap[divName]) {
				divisionsMap[divName] = {
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
						programName: row.program_name,
						hasBeenPaid: Boolean(row.has_been_paid),
						reportSubmitted: Boolean(row.report_submitted),
						underReview: Boolean(row.under_review),
						notes: row.notes || "",
						payees: {},
					};
					divisionsMap[divName].programList.push(program);
				}

				if (row.payee_name) {
					const amount =
						row.amount === null || isNaN(parseFloat(row.amount))
							? "To Be Determined"
							: parseFloat(row.amount);
					program.payees[row.payee_name] = amount;
				}
			}
		});
	}

	return Object.values(divisionsMap)[0];
}

/**
 * Tolerant lookup for a division by name.
 * Tries exact (trim+lower), LIKE, and tokenized fuzzy match.
 * Returns { row, id } or null if not found.
 */
async function findDivisionByNameTolerant(name) {
	if (!name) return null;

	// 1) exact match (trim + lower)
	const [found] = await pool.query(
		`SELECT * FROM Divisions WHERE TRIM(LOWER(division_name)) = TRIM(LOWER(?)) LIMIT 1`,
		[name]
	);
	if (found && found.length) return found[0];

	// 2) like contains
	const likePattern = `%${name}%`;
	const [likeFound] = await pool.query(
		`SELECT * FROM Divisions WHERE division_name LIKE ? LIMIT 1`,
		[likePattern]
	);
	if (likeFound && likeFound.length) return likeFound[0];

	// 3) tokenized fuzzy (require all tokens present)
	const tokens = name
		.split(/[^A-Za-z0-9]+/)
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.toLowerCase());
	if (tokens.length) {
		const clauses = tokens
			.map(() => "LOWER(division_name) LIKE ?")
			.join(" AND ");
		const params = tokens.map((t) => `%${t}%`);
		const [multiFound] = await pool.query(
			`SELECT * FROM Divisions WHERE ${clauses} LIMIT 1`,
			params
		);
		if (multiFound && multiFound.length) return multiFound[0];
	}

	return null;
}

/**
 * Get or create a person record; returns the person ID.
 * Uses auto-increment for Persons table (recommended).
 */
async function getOrCreatePersonId(name, connectionOrPool = pool) {
	if (!name || !name.trim()) return null;

	// First attempt to find existing
	const [personRows] = await connectionOrPool.query(
		`SELECT ID FROM Persons WHERE person_name = ? LIMIT 1`,
		[name]
	);
	if (personRows && personRows.length) return personRows[0].ID;

	// Insert new person (use auto-increment)
	const [result] = await connectionOrPool.query(
		`INSERT INTO Persons (person_name) VALUES (?)`,
		[name]
	);
	return result.insertId;
}

/**
 * ------------------------------
 * Routes
 * ------------------------------
 */

/**
 * GET: Home (render departments + changelog)
 */
app.get("/", async (req, res) => {
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

		// Build divisions grouped by division_name
		const divisionsMap = {};
		rows.forEach((row) => {
			const divName = row.division_name;
			const divId = row.division_ID;

			if (!divisionsMap[divName]) {
				divisionsMap[divName] = {
					divisionName: divName,
					id: divId,
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
						programName: row.program_name,
						hasBeenPaid: Boolean(row.has_been_paid),
						reportSubmitted: Boolean(row.report_submitted),
						notes: row.notes || "",
						payees: {},
					};
					divisionsMap[divName].programList.push(program);
				}

				if (row.payee_name) {
					program.payees[row.payee_name] = parseFloat(row.amount);
				}
			}
		});

		const [changelogRows] = await pool.query(
			`SELECT * FROM Changelog ORDER BY ID DESC`
		);

		res.render("home", {
			departments: Object.values(divisionsMap),
			changelogs: changelogRows,
		});
	} catch (err) {
		console.error("Error fetching divisions for home:", err);
		res.status(500).render("home", { departments: [], changelogs: [] });
	}
});

/**
 * GET: Edit Page
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
        p.under_review,
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
						underReview: Boolean(row.under_review),
						notes: row.notes || "",
						payees: {},
					};
					divisionsMap[divName].programList.push(program);
				}

				if (row.payee_name) {
					const amount =
						row.amount === null || isNaN(parseFloat(row.amount))
							? "To Be Determined"
							: parseFloat(row.amount);
					program.payees[row.payee_name] = amount;
				}
			}
		});

		res.render("edit", { departments: Object.values(divisionsMap) });
	} catch (error) {
		console.error("Error fetching divisions for edit:", error);
		res.status(500).render("edit", { departments: [] });
	}
});

/**
 * ------------------------------
 * PATCH: Full update from frontend
 * Handles creation, updates, deletion, AND moving of programs
 * ------------------------------
 */
app.patch("/api/division/full-update", async (req, res) => {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		const {
			divisionName,
			dean,
			pen,
			loc,
			chair,
			programs = [],
			deletedPrograms = [],
			movedPrograms = [],
			renamedPrograms = []
		} = req.body;
		
		console.log("Received update request for division:", divisionName);
		console.log("Division-level data:", { dean, pen, loc, chair });
		console.log("Programs received:", programs);
		console.log("Deleted programs:", deletedPrograms || []);
		console.log("Moved programs:", movedPrograms || []);
		console.log("Renamed programs:", renamedPrograms || []);

		if (!divisionName) {
			await connection.rollback();
			return res.status(400).json({ error: "Division name is required" });
		}

		// Get division ID
		const [divisionRows] = await connection.query(
			"SELECT ID FROM Divisions WHERE division_name = ? LIMIT 1",
			[divisionName]
		);
		if (!divisionRows.length) {
			await connection.rollback();
			return res.status(404).json({ error: "Division not found" });
		}
		const divisionID = divisionRows[0].ID;

		const createdPrograms = [];
		const changedPrograms = [];
		const deletedProgramsList = [];
		console.log("Division ID:", divisionID);

		// --- Handle renamed programs FIRST ---
		if (renamedPrograms && renamedPrograms.length > 0) {
			for (const renamedProgram of renamedPrograms) {
				const { oldProgramName, programName, payees, hasBeenPaid, reportSubmitted, notes } = renamedProgram;

				console.log(`Renaming program from "${oldProgramName}" to "${programName}"`);

				// Find the program by old name
				const [programRows] = await connection.query(
					"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ?",
					[oldProgramName, divisionID]
				);

				if (programRows.length) {
					const programID = programRows[0].ID;

					// Update the program name and other fields
					await connection.query(
						`UPDATE Programs 
						 SET program_name = ?, has_been_paid = ?, report_submitted = ?, notes = ?
						 WHERE ID = ?`,
						[programName, hasBeenPaid, reportSubmitted, notes, programID]
					);

					console.log(`Renamed program ID ${programID} from "${oldProgramName}" to "${programName}"`);

					// Update payees
					await connection.query(
						"DELETE FROM Payees WHERE program_ID = ?",
						[programID]
					);

					for (const [name, amount] of Object.entries(payees || {})) {
						if (!name || name.trim() === "") continue;

						await connection.query(
							"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
							[name, amount, programID]
						);
					}
				} else {
					console.warn(`Program "${oldProgramName}" not found in division "${divisionName}"`);
				}
			}
		}

		// --- Handle moved programs FIRST (before deletions) ---
		if (movedPrograms && movedPrograms.length > 0) {
			for (const movedProgram of movedPrograms) {
				const { 
					targetDivision, 
					programName, 
					payees, 
					hasBeenPaid, 
					reportSubmitted, 
					notes 
				} = movedProgram;

				console.log(`Moving program "${programName}" to "${targetDivision}"`);

				// Find target division
				const [targetDivRows] = await connection.query(
					"SELECT ID FROM Divisions WHERE division_name = ?",
					[targetDivision]
				);

				if (!targetDivRows.length) {
					console.warn(`Target division "${targetDivision}" not found for program "${programName}"`);
					continue; // Skip this move
				}

				const targetDivisionID = targetDivRows[0].ID;

				// Find the program in the source division
				const [programRows] = await connection.query(
					"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ?",
					[programName, divisionID]
				);

				if (programRows.length) {
					const programID = programRows[0].ID;

					// Update the program to point to the new division
					await connection.query(
						`UPDATE Programs 
						 SET division_ID = ?, has_been_paid = ?, report_submitted = ?, notes = ?
						 WHERE ID = ?`,
						[targetDivisionID, hasBeenPaid, reportSubmitted, notes, programID]
					);

					console.log(`Updated program ${programName} (ID: ${programID}) to division ${targetDivision}`);

					// Update payees for the moved program
					// First, delete existing payees
					await connection.query(
						"DELETE FROM Payees WHERE program_ID = ?",
						[programID]
					);

					// Insert updated payees
					for (const [name, amount] of Object.entries(payees || {})) {
						if (!name || name.trim() === "") continue;

						await connection.query(
							"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
							[name, amount, programID]
						);
						console.log(`Inserted payee ${name} with amount ${amount} for moved program`);
					}

					console.log(`Successfully moved program "${programName}" from "${divisionName}" to "${targetDivision}"`);
				} else {
					console.warn(`Program "${programName}" not found in source division "${divisionName}"`);
				}
			}
		}

		// Delete removed programs (and their payees)
		if (Array.isArray(deletedPrograms) && deletedPrograms.length > 0) {
			for (const programName of deletedPrograms) {
				const [progRows] = await connection.query(
					"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ? LIMIT 1",
					[programName, divisionID]
				);
				if (progRows.length) {
					const programID = progRows[0].ID;
					await connection.query("DELETE FROM Payees WHERE program_ID = ?", [
						programID,
					]);
					await connection.query("DELETE FROM Programs WHERE ID = ?", [
						programID,
					]);
					deletedProgramsList.push(programName);
				}
			}
		}

		// Update division persons (chair, dean, loc, pen)
		const personMap = { chair, dean, loc, pen };
		for (const [role, name] of Object.entries(personMap)) {
			if (!name) continue;

			// Get current person ID for this role
			const [currentDivision] = await connection.query(
				`SELECT ${role}_ID FROM Divisions WHERE ID = ? LIMIT 1`,
				[divisionID]
			);
			const currentPersonID = currentDivision[0][`${role}_ID`];

			if (currentPersonID) {
				// Fetch the existing person's name
				const [currentPerson] = await connection.query(
					"SELECT person_name FROM Persons WHERE ID = ? LIMIT 1",
					[currentPersonID]
				);
				const currentPersonName = currentPerson[0]?.person_name;
				if (currentPersonName !== name) {
					// Update existing person record
					await connection.query(
						"UPDATE Persons SET person_name = ? WHERE ID = ?",
						[name, currentPersonID]
					);
				}
				// nothing else needed (division already points to this ID)
			} else {
				// No current person assigned: get or create and update division role column
				const personID = await getOrCreatePersonId(name, connection);
				await connection.query(
					`UPDATE Divisions SET ${role}_ID = ? WHERE ID = ?`,
					[personID, divisionID]
				);
			}
		}

		// Create / Update programs and their payees
		for (const prog of programs) {
			if (!prog.programName) continue;

			const [progRows] = await connection.query(
				"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ? LIMIT 1",
				[prog.programName, divisionID]
			);

			let programID;
			if (progRows.length) {
				programID = progRows[0].ID;
				// Update program fields
				await connection.query(
					`UPDATE Programs SET has_been_paid = ?, report_submitted = ?, notes = ? WHERE ID = ?`,
					[
						prog.hasBeenPaid ? 1 : 0,
						prog.reportSubmitted ? 1 : 0,
						prog.notes || "",
						programID,
					]
				);
			} else {
				const [insertResult] = await connection.query(
					`INSERT INTO Programs (program_name, division_ID, has_been_paid, report_submitted, notes)
           VALUES (?, ?, ?, ?, ?)`,
					[
						prog.programName,
						divisionID,
						prog.hasBeenPaid ? 1 : 0,
						prog.reportSubmitted ? 1 : 0,
						prog.notes || "",
					]
				);
				programID = insertResult.insertId;
				createdPrograms.push(prog.programName);
			}

			// Handle payees: remove ones not present in incoming payees, then upsert incoming
			const incomingPayeeNames = prog.payees ? Object.keys(prog.payees) : [];

			// Delete payees that are not in incoming list
			if (incomingPayeeNames.length > 0) {
				const { placeholders, params } =
					placeholdersForArray(incomingPayeeNames);
				// params spread after programID
				await connection.query(
					`DELETE FROM Payees WHERE program_ID = ? AND payee_name NOT IN (${placeholders})`,
					[programID, ...params]
				);
			} else {
				// No incoming payees: delete all for this program
				await connection.query("DELETE FROM Payees WHERE program_ID = ?", [
					programID,
				]);
			}

			// Insert or update incoming payees
			for (const [payeeName, amountRaw] of Object.entries(prog.payees || {})) {
				if (!payeeName || !String(payeeName).trim()) continue;

				const amount =
					amountRaw === null || amountRaw === undefined || amountRaw === ""
						? null
						: Number(amountRaw);

				const [payeeRows] = await connection.query(
					"SELECT ID FROM Payees WHERE program_ID = ? AND payee_name = ? LIMIT 1",
					[programID, payeeName]
				);

				if (payeeRows.length) {
					await connection.query(
						"UPDATE Payees SET payee_amount = ? WHERE ID = ?",
						[amount, payeeRows[0].ID]
					);
				} else {
					await connection.query(
						"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
						[payeeName, amount, programID]
					);
				}
			}
		}

		// Insert changelog entry summarizing changes
		let summaryStr = `Division: ${divisionName}. `;
		if (createdPrograms.length)
			summaryStr += `Created: ${createdPrograms.join(", ")}. `;
		if (deletedProgramsList.length)
			summaryStr += `Deleted: ${deletedProgramsList.join(", ")}. `;
		if (changedPrograms.length)
			summaryStr += `Modified: ${changedPrograms.join(", ")}. `;

		await connection.query(
			`INSERT INTO Changelog (save_time, changes) VALUES (?, ?)`,
			[new Date(), summaryStr]
		);

		await connection.commit();
		res.json({ success: true, summary: summaryStr });
	} catch (err) {
		await connection.rollback();
		console.error("Error during full update:", err);
		res
			.status(500)
			.json({ error: "Failed to update division", details: err.message });
	} finally {
		connection.release();
	}
});

/**
 * Helper: generate PDF stream (used by preview and download)
 * - disposition can be "inline" (preview) or "attachment" (download)
 */
async function streamDivisionPdfById(res, divisionId, disposition = "inline") {
	const [rows] = await pool.query(
		`SELECT
      d.division_name,
      chair.person_name AS chair_name,
      dean.person_name AS dean_name,
      loc.person_name AS loc_rep,
      pen.person_name AS pen_contact,
      p.program_name,
      p.has_been_paid,
      p.report_submitted,
      p.notes,
      py.payee_name,
      py.payee_amount AS amount
    FROM Divisions d
    LEFT JOIN Programs p ON d.ID = p.division_ID
    LEFT JOIN Payees py ON p.ID = py.program_ID
    LEFT JOIN Persons chair ON d.chair_ID = chair.ID
    LEFT JOIN Persons dean ON d.dean_ID = dean.ID
    LEFT JOIN Persons loc ON d.loc_ID = loc.ID
    LEFT JOIN Persons pen ON d.pen_ID = pen.ID
    WHERE d.ID = ?
    ORDER BY p.program_name, py.payee_name`,
		[divisionId]
	);

	// If no rows, try to load the division row alone to get division name
	let divisionRow = null;
	if (!rows || rows.length === 0) {
		const [divOnly] = await pool.query(
			`SELECT * FROM Divisions WHERE ID = ? LIMIT 1`,
			[divisionId]
		);
		divisionRow = divOnly && divOnly.length ? divOnly[0] : null;
	}

	const division = buildDivisionFromRows(rows, divisionRow);
	if (!division) {
		res.status(404).send("Division not found or has no data");
		return;
	}

	const filename = `${division.divisionName.replace(/\s+/g, "_")}.pdf`;
	res.setHeader("Content-Type", "application/pdf");
	res.setHeader(
		"Content-Disposition",
		`${disposition}; filename="${filename}"`
	);

	const doc = new PDFDocument({ margin: 50 });
	doc.pipe(res);

	// Title
	doc.fontSize(20).font("Helvetica-Bold").text(division.divisionName);
	doc.moveDown(0.5);

	// Contacts
	doc.fontSize(12);
	doc.font("Helvetica-Bold").text(`Dean: ${division.deanName || ""}`);
	doc.moveDown(0.12);
	doc.font("Helvetica-Bold").text(`Chair: ${division.chairName || ""}`);
	doc.moveDown(0.12);
	doc.font("Helvetica-Bold").text(`PEN Contact: ${division.penContact || ""}`);
	doc.moveDown(0.12);
	doc.font("Helvetica-Bold").text(`LOC Rep: ${division.locRep || ""}`);
	doc.moveDown(0.3);

	// Programs
	doc.moveDown(0.5);
	if (division.programList && division.programList.length) {
		doc.font("Helvetica-Bold").fontSize(14).text("Programs");
		doc.moveDown(0.25);

		division.programList.forEach((p) => {
			doc.font("Helvetica-Bold").fontSize(13).text(p.programName);
			doc.moveDown(0.15);

			const payeeNames = p.payees ? Object.keys(p.payees) : [];
			if (payeeNames.length) {
				payeeNames.forEach((payee) => {
					const amount = p.payees[payee];
					const displayAmount =
						typeof amount === "string" ? amount : `$${amount}`;
					doc
						.font("Helvetica")
						.fontSize(12)
						.text(`• ${payee}: ${displayAmount}`, {
							indent: 16,
						});
				});
			}

			if (p.notes) {
				doc.moveDown(0.1);
				doc
					.font("Helvetica-Oblique")
					.fontSize(11)
					.text(`Notes: ${p.notes}`, { indent: 16 });
			}

			doc.moveDown(0.4);
		});
	} else {
		doc.font("Helvetica-Bold").fontSize(14).text("Programs");
		doc.moveDown(0.5);
		doc.font("Helvetica").fontSize(12).text("No programs available.");
	}

	doc.end();
}

/**
 * GET: PDF preview (inline)
 * Call: /pdf-preview?division=Division%20Name
 */
app.get("/pdf-preview", async (req, res) => {
	const divisionName = req.query.division;
	if (!divisionName)
		return res.status(400).send("Query parameter 'division' is required");

	try {
		const divisionRow = await findDivisionByNameTolerant(divisionName);
		if (!divisionRow) {
			return res.status(404).send("Division not found or has no data");
		}
		await streamDivisionPdfById(res, divisionRow.ID, "inline");
	} catch (error) {
		console.error("Error generating division PDF preview:", error);
		res.status(500).send("Failed to generate PDF");
	}
});

/**
 * GET: Download division PDF (attachment)
 * Call: /download-division-pdf-file?division=Division%20Name
 */
app.get("/download-division-pdf-file", async (req, res) => {
	const divisionName = req.query.division;
	if (!divisionName)
		return res.status(400).send("Query parameter 'division' is required");

	try {
		const divisionRow = await findDivisionByNameTolerant(divisionName);
		if (!divisionRow) {
			return res.status(404).send("Division not found or has no data");
		}
		await streamDivisionPdfById(res, divisionRow.ID, "attachment");
	} catch (error) {
		console.error("Error generating downloadable division PDF:", error);
		res.status(500).send("Failed to generate PDF");
	}
});

/**
 * POST: Save division contact info and program data (non-transactional; intended for simple saves)
 * Body shape: { divisionName, deanName, chairName, locRep, penContact, programList: [...] }
 */
app.post("/api/save-division", async (req, res) => {
	const { divisionName, deanName, chairName, locRep, penContact, programList } =
		req.body;

	if (!divisionName) {
		return res.status(400).json({ error: "Division name is required" });
	}

	try {
		const [divisionRows] = await pool.query(
			`SELECT ID FROM Divisions WHERE division_name = ? LIMIT 1`,
			[divisionName]
		);

		if (divisionRows.length === 0) {
			return res.status(404).json({ error: "Division not found" });
		}

		const divisionId = divisionRows[0].ID;

		// Create/get persons
		const chairId = await getOrCreatePersonId(chairName);
		const deanId = await getOrCreatePersonId(deanName);
		const locId = await getOrCreatePersonId(locRep);
		const penId = await getOrCreatePersonId(penContact);

		await pool.query(
			`UPDATE Divisions SET chair_ID = ?, dean_ID = ?, loc_ID = ?, pen_ID = ? WHERE ID = ?`,
			[chairId, deanId, locId, penId, divisionId]
		);

		// Update programs if provided
		if (Array.isArray(programList)) {
			for (const program of programList) {
				if (!program.programName) continue;

				const [programRows] = await pool.query(
					`SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ? LIMIT 1`,
					[program.programName, divisionId]
				);

				if (programRows.length > 0) {
					const programId = programRows[0].ID;
					await pool.query(
						`UPDATE Programs SET has_been_paid = ?, report_submitted = ?, notes = ? WHERE ID = ?`,
						[
							program.hasBeenPaid ? 1 : 0,
							program.reportSubmitted ? 1 : 0,
							program.notes || "",
							programId,
						]
					);

					// Replace payees: delete old, insert new (simple approach)
					await pool.query(`DELETE FROM Payees WHERE program_ID = ?`, [
						programId,
					]);

					for (const [payeeName, payeeAmount] of Object.entries(
						program.payees || {}
					)) {
						await pool.query(
							`INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)`,
							[
								payeeName,
								payeeAmount === "" ? null : Number(payeeAmount),
								programId,
							]
						);
					}
				}
			}
		}

		res.json({ success: true, message: "Division data saved successfully" });
	} catch (error) {
		console.error("Error saving division:", error);
		res.status(500).json({ error: "Failed to save division data" });
	}
});

/**
 * Start server
 */
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
