import express from "express";
import mysql2 from "mysql2";
import PDFDocument from "pdfkit";
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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
	// Render home with server-side department data so modal and PDF match
	(async () => {
		try {
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
				ORDER BY d.division_name, p.program_name, py.payee_name`
			);

			const divisionsMap = {};
			rows.forEach((row) => {
				const divName = row.division_name;
				const divId = row.division_ID || row.ID;

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

			const result = Object.values(divisionsMap);
			res.render("home", { departments: result });
		} catch (err) {
			console.error("Error fetching divisions for home:", err);
			res.render("home", { departments: [] });
		}
	})();
});

app.get("/edit", async (req, res) => {
	try {
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
			ORDER BY d.division_name, p.program_name, py.payee_name`
		);

		const divisionsMap = {};
		rows.forEach((row) => {
			const divName = row.division_name;
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

		const result = Object.values(divisionsMap);
		res.render("edit", { departments: result });
	} catch (error) {
		console.error("Error fetching divisions for edit:", error);
		res.status(500).render("edit", { departments: [] });
	}
});

app.get("/api/divisions", async (req, res) => {
	try {
		// Single query with JOINs to get all data at once
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
			ORDER BY d.division_name, p.program_name, py.payee_name`
		);

		// Transform flat rows into nested structure
		const divisionsMap = {};
		rows.forEach((row) => {
			const divName = row.division_name;

			// Create division if doesn't exist
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

			// If there's a program in this row
			if (row.program_name) {
				// Find or create the program
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

				// If there's a payee in this row
				if (row.payee_name) {
					const amount =
						row.amount === null || isNaN(parseFloat(row.amount))
							? "To Be Determined"
							: parseFloat(row.amount);
					program.payees[row.payee_name] = amount;
				}
			}
		});

		// Convert map to array
		const result = Object.values(divisionsMap);

		res.render("divisions", { departments: result });
	} catch (error) {
		console.error("Error fetching divisions:", error);
		res.status(500).json({ error: "Failed to fetch divisions" });
	}
});

// Stream a PDF for a single division for modal preview. Call as: /pdf-preview?division=Division%20Name
app.get("/pdf-preview", async (req, res) => {
	const divisionName = req.query.division;
	if (!divisionName)
		return res.status(400).send("Query parameter 'division' is required");

	try {
		// Try to find the division by a tolerant match (trim + lower) to avoid issues with spacing/case
		const [found] = await pool.query(
			`SELECT * FROM Divisions WHERE TRIM(LOWER(division_name)) = TRIM(LOWER(?)) LIMIT 1`,
			[divisionName]
		);

		let divisionRow = found && found.length ? found[0] : null;

		// If not found, try a LIKE search as a second chance (contains)
		if (!divisionRow) {
			const likePattern = `%${divisionName}%`;
			const [likeFound] = await pool.query(
				`SELECT * FROM Divisions WHERE division_name LIKE ? LIMIT 1`,
				[likePattern]
			);
			divisionRow = likeFound && likeFound.length ? likeFound[0] : null;
		}

		// If still not found, try splitting the requested name into tokens and require all tokens be present (fuzzy match)
		if (!divisionRow) {
			const tokens = divisionName
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
				divisionRow = multiFound && multiFound.length ? multiFound[0] : null;
			}
		}

		if (!divisionRow) {
			console.warn(`Division not found: '${divisionName}'`);
			return res.status(404).send("Division not found or has no data");
		}

		// Use the division ID for subsequent queries to avoid name-matching issues
		const divisionId = divisionRow.ID;

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

		// Build division object from rows (similar to /edit handler)
		const divisionsMap = {};
		// If there are no rows returned but we have a divisionRow, create a minimal representation
		if (!rows || rows.length === 0) {
			divisionsMap[divisionRow.division_name] = {
				divisionName: divisionRow.division_name,
				deanName: "",
				penContact: "",
				locRep: "",
				chairName: "",
				programList: [],
			};
		} else {
			rows.forEach((row) => {
				const divName = row.division_name || divisionRow.division_name;
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

		const division = Object.values(divisionsMap)[0];

		// Stream PDF using PDFKit with inline disposition for modal preview
		const filename = `${division.divisionName.replace(/\s+/g, "_")}.pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

		const doc = new PDFDocument({ margin: 50 });
		doc.pipe(res);

		// Title
		doc.fontSize(20).font("Helvetica-Bold").text(division.divisionName);
		doc.moveDown(0.5);

		// Contacts: write each contact on its own line with a small gap to avoid overlap
		doc.fontSize(12);
		doc.font("Helvetica-Bold").text(`Dean: ${division.deanName || ""}`);
		doc.moveDown(0.12);
		doc.font("Helvetica-Bold").text(`Chair: ${division.chairName || ""}`);
		doc.moveDown(0.12);
		doc
			.font("Helvetica-Bold")
			.text(`PEN Contact: ${division.penContact || ""}`);
		doc.moveDown(0.12);
		doc.font("Helvetica-Bold").text(`LOC Rep: ${division.locRep || ""}`);
		doc.moveDown(0.3);

		doc.moveDown(0.5);

		// Programs header
		if (division.programList && division.programList.length) {
			doc.font("Helvetica-Bold").fontSize(14).text("Programs");
			doc.moveDown(0.25);

			division.programList.forEach((p) => {
				// Program name
				doc.font("Helvetica-Bold").fontSize(13).text(p.programName);
				doc.moveDown(0.15);

				// Payees as bullets, indented
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

				// Notes
				if (p.notes) {
					doc.moveDown(0.1);
					doc.font("Helvetica-Oblique").fontSize(11).text(`Notes: ${p.notes}`, {
						indent: 16,
					});
				}

				doc.moveDown(0.4);
			});
		} else {
			// No programs - still present a Programs header for consistency
			doc.font("Helvetica-Bold").fontSize(14).text("Programs");
			doc.moveDown(0.5);
			doc.font("Helvetica").fontSize(12).text("No programs available.");
		}

		doc.end();
	} catch (error) {
		console.error("Error generating division PDF:", error);
		res.status(500).send("Failed to generate PDF");
	}
});

// Download a PDF for a single division with attachment disposition. Call as: /download-division-pdf-file?division=Division%20Name
app.get("/download-division-pdf-file", async (req, res) => {
	const divisionName = req.query.division;
	if (!divisionName)
		return res.status(400).send("Query parameter 'division' is required");

	try {
		// Try to find the division by a tolerant match (trim + lower) to avoid issues with spacing/case
		const [found] = await pool.query(
			`SELECT * FROM Divisions WHERE TRIM(LOWER(division_name)) = TRIM(LOWER(?)) LIMIT 1`,
			[divisionName]
		);

		let divisionRow = found && found.length ? found[0] : null;

		// If not found, try a LIKE search as a second chance (contains)
		if (!divisionRow) {
			const likePattern = `%${divisionName}%`;
			const [likeFound] = await pool.query(
				`SELECT * FROM Divisions WHERE division_name LIKE ? LIMIT 1`,
				[likePattern]
			);
			divisionRow = likeFound && likeFound.length ? likeFound[0] : null;
		}

		// If still not found, try splitting the requested name into tokens and require all tokens be present (fuzzy match)
		if (!divisionRow) {
			const tokens = divisionName
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
				divisionRow = multiFound && multiFound.length ? multiFound[0] : null;
			}
		}

		if (!divisionRow) {
			console.warn(`Division not found: '${divisionName}'`);
			return res.status(404).send("Division not found or has no data");
		}

		// Use the division ID for subsequent queries to avoid name-matching issues
		const divisionId = divisionRow.ID;

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

		// Build division object from rows (similar to /edit handler)
		const divisionsMap = {};
		// If there are no rows returned but we have a divisionRow, create a minimal representation
		if (!rows || rows.length === 0) {
			divisionsMap[divisionRow.division_name] = {
				divisionName: divisionRow.division_name,
				deanName: "",
				penContact: "",
				locRep: "",
				chairName: "",
				programList: [],
			};
		} else {
			rows.forEach((row) => {
				const divName = row.division_name || divisionRow.division_name;
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

		const division = Object.values(divisionsMap)[0];

		// Stream PDF using PDFKit with attachment disposition for download
		const filename = `${division.divisionName.replace(/\s+/g, "_")}.pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

		const doc = new PDFDocument({ margin: 50 });
		doc.pipe(res);

		// Title
		doc.fontSize(20).font("Helvetica-Bold").text(division.divisionName);
		doc.moveDown(0.5);

		// Contacts: write each contact on its own line with a small gap to avoid overlap
		doc.fontSize(12);
		doc.font("Helvetica-Bold").text(`Dean: ${division.deanName || ""}`);
		doc.moveDown(0.12);
		doc.font("Helvetica-Bold").text(`Chair: ${division.chairName || ""}`);
		doc.moveDown(0.12);
		doc
			.font("Helvetica-Bold")
			.text(`PEN Contact: ${division.penContact || ""}`);
		doc.moveDown(0.12);
		doc.font("Helvetica-Bold").text(`LOC Rep: ${division.locRep || ""}`);
		doc.moveDown(0.3);

		doc.moveDown(0.5);

		// Programs header
		if (division.programList && division.programList.length) {
			doc.font("Helvetica-Bold").fontSize(14).text("Programs");
			doc.moveDown(0.25);

			division.programList.forEach((p) => {
				// Program name
				doc.font("Helvetica-Bold").fontSize(13).text(p.programName);
				doc.moveDown(0.15);

				// Payees as bullets, indented
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

				// Notes
				if (p.notes) {
					doc.moveDown(0.1);
					doc.font("Helvetica-Oblique").fontSize(11).text(`Notes: ${p.notes}`, {
						indent: 16,
					});
				}

				doc.moveDown(0.4);
			});
		} else {
			// No programs - still present a Programs header for consistency
			doc.font("Helvetica-Bold").fontSize(14).text("Programs");
			doc.moveDown(0.5);
			doc.font("Helvetica").fontSize(12).text("No programs available.");
		}

		doc.end();
	} catch (error) {
		console.error("Error generating division PDF:", error);
		res.status(500).send("Failed to generate PDF");
	}
});

// POST endpoint to save division contact info and program data
app.post("/api/save-division", async (req, res) => {
	const { divisionName, deanName, chairName, locRep, penContact, programList } =
		req.body;

	if (!divisionName) {
		return res.status(400).json({ error: "Division name is required" });
	}

	try {
		// Find the division ID by name
		const [divisionRows] = await pool.query(
			`SELECT ID FROM Divisions WHERE division_name = ?`,
			[divisionName]
		);

		if (divisionRows.length === 0) {
			return res.status(404).json({ error: "Division not found" });
		}

		const divisionId = divisionRows[0].ID;

		// Helper function to get or create a person by name
		const getOrCreatePersonId = async (personName) => {
			if (!personName || personName.trim() === "") return null;
			const [personRows] = await pool.query(
				`SELECT ID FROM Persons WHERE person_name = ?`,
				[personName]
			);
			if (personRows.length > 0) {
				return personRows[0].ID;
			}
			// Create new person: find max ID and increment
			const [maxIdRows] = await pool.query(
				`SELECT MAX(ID) as maxId FROM Persons`
			);
			const newId = (maxIdRows[0].maxId || 0) + 1;
			await pool.query(`INSERT INTO Persons (ID, person_name) VALUES (?, ?)`, [
				newId,
				personName,
			]);
			return newId;
		};

		// Update division contact info
		const chairId = await getOrCreatePersonId(chairName);
		const deanId = await getOrCreatePersonId(deanName);
		const locId = await getOrCreatePersonId(locRep);
		const penId = await getOrCreatePersonId(penContact);

		await pool.query(
			`UPDATE Divisions SET chair_ID = ?, dean_ID = ?, loc_ID = ?, pen_ID = ? WHERE ID = ?`,
			[chairId, deanId, locId, penId, divisionId]
		);

		// Update program data if provided
		if (Array.isArray(programList)) {
			for (const program of programList) {
				const [programRows] = await pool.query(
					`SELECT ID FROM Programs WHERE program_name = ? AND division_ID = ?`,
					[program.programName, divisionId]
				);

				if (programRows.length > 0) {
					const programId = programRows[0].ID;
					// Update program info
					await pool.query(
						`UPDATE Programs SET has_been_paid = ?, report_submitted = ?, notes = ? WHERE ID = ?`,
						[
							program.hasBeenPaid ? 1 : 0,
							program.reportSubmitted ? 1 : 0,
							program.notes || "",
							programId,
						]
					);

					// Delete old payees and insert new ones
					await pool.query(`DELETE FROM Payees WHERE program_ID = ?`, [
						programId,
					]);

					if (program.payees && typeof program.payees === "object") {
						for (const [payeeName, payeeAmount] of Object.entries(
							program.payees
						)) {
							// Get max ID and increment for new payee
							const [maxPayeeIdRows] = await pool.query(
								`SELECT MAX(ID) as maxId FROM Payees`
							);
							const newPayeeId = (maxPayeeIdRows[0].maxId || 0) + 1;
							await pool.query(
								`INSERT INTO Payees (ID, payee_name, payee_amount, program_ID) VALUES (?, ?, ?, ?)`,
								[newPayeeId, payeeName, payeeAmount, programId]
							);
						}
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

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
