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

		const [changelog] = await pool.query(
			`SELECT * FROM Changelog ORDER BY ID DESC`
		);

		res.render("home", {
			departments: Object.values(divisionsMap),
			changelogs: changelog,
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
 * with COMPREHENSIVE changelog tracking (including payee add/remove)
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
			renamedPrograms = [],
		} = req.body;

		if (!divisionName) {
			await connection.rollback();
			return res.status(400).json({ error: "Division name is required" });
		}

		// Fetch division ID
		const [divisionRows] = await connection.query(
			"SELECT ID FROM Divisions WHERE division_name = ? LIMIT 1",
			[divisionName]
		);
		if (!divisionRows.length) {
			await connection.rollback();
			return res.status(404).json({ error: "Division not found" });
		}

		const divisionID = divisionRows[0].ID;

		// Changelog tracker
		const changeLog = {
			divisionPersonChanges: [],
			createdPrograms: [],
			deletedPrograms: [],
			movedPrograms: [],
			renamedPrograms: [],
			programUpdates: [],
		};

		// Utility: track program update changes safely
		const ensureProgramUpdateEntry = (programName) => {
			let entry = changeLog.programUpdates.find(
				(p) => p.programName === programName
			);
			if (!entry) {
				entry = { programName, changes: [] };
				changeLog.programUpdates.push(entry);
			}
			return entry;
		};

		// -----------------------------
		// HANDLE RENAMED PROGRAMS FIRST
		// -----------------------------
		for (const renamed of renamedPrograms) {
			const {
				oldProgramName,
				programName,
				payees,
				hasBeenPaid,
				reportSubmitted,
				notes,
			} = renamed;

			const [programRows] = await connection.query(
				"SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ?",
				[oldProgramName, divisionID]
			);

			if (!programRows.length) continue;
			const programID = programRows[0].ID;

			// Rename + update
			await connection.query(
				`UPDATE Programs SET program_name=?, has_been_paid=?, report_submitted=?, notes=? WHERE ID=?`,
				[programName, hasBeenPaid, reportSubmitted, notes, programID]
			);

			// Replace payees
			await connection.query("DELETE FROM Payees WHERE program_ID=?", [
				programID,
			]);
			const payeeUpdates = [];
			for (const [name, amt] of Object.entries(payees || {})) {
				await connection.query(
					"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
					[name, amt, programID]
				);
				payeeUpdates.push(`${name}: $${amt}`);
			}

			changeLog.renamedPrograms.push({
				oldName: oldProgramName,
				newName: programName,
				hasBeenPaid,
				reportSubmitted,
				notes,
				payees: payeeUpdates,
			});
		}

		// -----------------------------
		// HANDLE MOVED PROGRAMS
		// -----------------------------
		for (const moved of movedPrograms) {
			const {
				targetDivision,
				programName,
				payees,
				hasBeenPaid,
				reportSubmitted,
				notes,
			} = moved;

			// Look up target division
			const [targetRows] = await connection.query(
				"SELECT ID FROM Divisions WHERE division_name=?",
				[targetDivision]
			);
			if (!targetRows.length) continue;

			const targetID = targetRows[0].ID;

			// Look up program in current division
			const [programRows] = await connection.query(
				"SELECT ID FROM Programs WHERE program_name=? AND division_ID=?",
				[programName, divisionID]
			);
			if (!programRows.length) continue;

			const programID = programRows[0].ID;

			// Move program
			await connection.query(
				`UPDATE Programs SET division_ID=?, has_been_paid=?, report_submitted=?, notes=? WHERE ID=?`,
				[targetID, hasBeenPaid, reportSubmitted, notes, programID]
			);

			// Replace payees
			await connection.query("DELETE FROM Payees WHERE program_ID=?", [
				programID,
			]);

			const payeeUpdates = [];
			for (const [name, amt] of Object.entries(payees || {})) {
				await connection.query(
					"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
					[name, amt, programID]
				);
				payeeUpdates.push(`${name}: $${amt}`);
			}

			changeLog.movedPrograms.push({
				programName,
				fromDivision: divisionName,
				toDivision: targetDivision,
				hasBeenPaid,
				reportSubmitted,
				notes,
				payees: payeeUpdates,
			});
		}

		// -----------------------------
		// HANDLE DELETED PROGRAMS
		// -----------------------------
		for (const programName of deletedPrograms) {
			const [rows] = await connection.query(
				"SELECT ID FROM Programs WHERE program_name=? AND division_ID=?",
				[programName, divisionID]
			);
			if (!rows.length) continue;

			const programID = rows[0].ID;

			// Payees before deletion
			const [payees] = await connection.query(
				"SELECT payee_name, payee_amount FROM Payees WHERE program_ID=?",
				[programID]
			);

			await connection.query("DELETE FROM Payees WHERE program_ID=?", [
				programID,
			]);
			await connection.query("DELETE FROM Programs WHERE ID=?", [programID]);

			changeLog.deletedPrograms.push({
				programName,
				payeesRemoved: payees.map((p) => `${p.payee_name}: $${p.payee_amount}`),
			});
		}

		// -----------------------------
		// UPDATE DIVISION PEOPLE
		// -----------------------------
		const personMap = { chair, dean, loc, pen };
		for (const [role, name] of Object.entries(personMap)) {
			if (!name) continue;

			const [divRow] = await connection.query(
				`SELECT ${role}_ID FROM Divisions WHERE ID=?`,
				[divisionID]
			);

			const currentID = divRow[0][`${role}_ID`];

			if (currentID) {
				const [person] = await connection.query(
					"SELECT person_name FROM Persons WHERE ID=?",
					[currentID]
				);

				if (person[0]?.person_name !== name) {
					changeLog.divisionPersonChanges.push({
						role: role.toUpperCase(),
						oldName: person[0]?.person_name || "None",
						newName: name,
					});

					await connection.query(
						"UPDATE Persons SET person_name=? WHERE ID=?",
						[name, currentID]
					);
				}
			} else {
				const personID = await getOrCreatePersonId(name, connection);
				changeLog.divisionPersonChanges.push({
					role: role.toUpperCase(),
					oldName: "None",
					newName: name,
				});
				await connection.query(`UPDATE Divisions SET ${role}_ID=? WHERE ID=?`, [
					personID,
					divisionID,
				]);
			}
		}

		// -----------------------------
		// CREATE & UPDATE PROGRAMS
		// -----------------------------
		for (const prog of programs) {
			const { programName } = prog;

			const [existing] = await connection.query(
				"SELECT ID, has_been_paid, report_submitted, notes FROM Programs WHERE program_name=? AND division_ID=?",
				[programName, divisionID]
			);

			let programID;
			let isNew = false;

			if (!existing.length) {
				// CREATE
				const [insert] = await connection.query(
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
				programID = insert.insertId;
				isNew = true;

				changeLog.createdPrograms.push({
					programName,
					hasBeenPaid: prog.hasBeenPaid,
					reportSubmitted: prog.reportSubmitted,
					notes: prog.notes || "",
				});
			} else {
				// UPDATE
				programID = existing[0].ID;
				const updateEntry = ensureProgramUpdateEntry(programName);

				if (existing[0].has_been_paid !== (prog.hasBeenPaid ? 1 : 0)) {
					updateEntry.changes.push(
						`Payment status: ${existing[0].has_been_paid ? "Yes" : "No"} → ${
							prog.hasBeenPaid ? "Yes" : "No"
						}`
					);
				}
				if (existing[0].report_submitted !== (prog.reportSubmitted ? 1 : 0)) {
					updateEntry.changes.push(
						`Report submitted: ${
							existing[0].report_submitted ? "Yes" : "No"
						} → ${prog.reportSubmitted ? "Yes" : "No"}`
					);
				}
				if (existing[0].notes !== (prog.notes || "")) {
					updateEntry.changes.push(
						`Notes: "${existing[0].notes || ""}" → "${prog.notes || ""}"`
					);
				}

				await connection.query(
					"UPDATE Programs SET has_been_paid=?, report_submitted=?, notes=? WHERE ID=?",
					[
						prog.hasBeenPaid ? 1 : 0,
						prog.reportSubmitted ? 1 : 0,
						prog.notes || "",
						programID,
					]
				);
			}

			// -----------------------------
			// PAYEE CHANGES (NEW, MODIFIED, REMOVED)
			// -----------------------------
			const updateEntry = ensureProgramUpdateEntry(programName);

			const [existingPayees] = await connection.query(
				"SELECT payee_name, payee_amount FROM Payees WHERE program_ID=?",
				[programID]
			);

			const incoming = prog.payees || {};
			const existingMap = Object.fromEntries(
				existingPayees.map((p) => [p.payee_name, p.payee_amount])
			);

			// Track removed payees
			for (const oldName of Object.keys(existingMap)) {
				if (!(oldName in incoming)) {
					updateEntry.changes.push(
						`Removed payee: ${oldName} ($${existingMap[oldName]})`
					);
				}
			}

			// Remove deleted payees
			await connection.query("DELETE FROM Payees WHERE program_ID=?", [
				programID,
			]);

			// Re-add all incoming payees while tracking new/changed
			for (const [payeeName, newAmountRaw] of Object.entries(incoming)) {
				const newAmount =
					newAmountRaw === null ||
					newAmountRaw === undefined ||
					newAmountRaw === ""
						? null
						: Number(newAmountRaw);

				const oldAmount = existingMap[payeeName];

				if (oldAmount === undefined) {
					updateEntry.changes.push(`Added payee: ${payeeName} ($${newAmount})`);
				} else if (oldAmount !== newAmount) {
					updateEntry.changes.push(
						`${payeeName}: $${oldAmount} → $${newAmount}`
					);
				}

				await connection.query(
					"INSERT INTO Payees (payee_name, payee_amount, program_ID) VALUES (?, ?, ?)",
					[payeeName, newAmount, programID]
				);
			}

			// If this was a new program, remove update noise
			if (isNew) {
				changeLog.programUpdates = changeLog.programUpdates.filter(
					(p) => p.programName !== programName
				);
			}
		}

		// -----------------------------
		// FORMAT CHANGELOG ENTRY
		// -----------------------------
		let changeDescription = `[${new Date().toLocaleString()}] Division: ${divisionName}\n`;

		if (changeLog.divisionPersonChanges.length) {
			changeDescription += `Division Person:\n`;
			for (const c of changeLog.divisionPersonChanges) {
				changeDescription += `${c.role}: "${c.oldName}" → "${c.newName}"\n`;
			}
		}

		if (changeLog.createdPrograms.length) {
			changeDescription += `Created Program:\n`;
			for (const p of changeLog.createdPrograms) {
				changeDescription += `${p.programName} (Paid: ${p.hasBeenPaid}, Report: ${p.reportSubmitted})\n`;
			}
		}

		if (changeLog.deletedPrograms.length) {
			changeDescription += `Program Deleted:\n`;
			for (const p of changeLog.deletedPrograms) {
				changeDescription += `${p.programName}`;
				if (p.payeesRemoved.length) {
					changeDescription += ` (Payees: ${p.payeesRemoved.join(", ")})`;
				}
				changeDescription += `\n`;
			}
		}

		if (changeLog.movedPrograms.length) {
			changeDescription += `Program Moved:\n`;
			for (const p of changeLog.movedPrograms) {
				changeDescription += `${p.programName}: ${p.fromDivision} → ${p.toDivision}\n`;
				if (p.payees.length) {
					changeDescription += `Payees: ${p.payees.join(", ")}\n`;
				}
			}
		}

		if (changeLog.renamedPrograms.length) {
			changeDescription += `Program Renamed:\n`;
			for (const p of changeLog.renamedPrograms) {
				changeDescription += `"${p.oldName}" → "${p.newName}"\n`;
				if (p.payees.length) {
					changeDescription += `Payees: ${p.payees.join(", ")}\n`;
				}
			}
		}

		if (changeLog.programUpdates.length) {
			changeDescription += `Program Updated:\n`;
			for (const p of changeLog.programUpdates) {
				changeDescription += `${p.programName}:\n`;
				for (const ch of p.changes) {
					changeDescription += `${ch}\n`;
				}
			}
		}

		// Save changelog to DB
		await connection.query(
			"INSERT INTO Changelog (save_time, changes) VALUES (?, ?)",
			[new Date(), changeDescription]
		);

		await connection.commit();
		res.json({ success: true, summary: changeDescription });
	} catch (err) {
		await connection.rollback();
		console.error("Error:", err);
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
