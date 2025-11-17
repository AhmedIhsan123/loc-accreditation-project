import express from "express";
import mysql2 from "mysql2";

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

app.get("/", (req, res) => {
	res.render("home");
});

app.get("/edit", (req, res) => {
	res.render("edit");
});

app.get("/api/divisions", async (req, res) => {
	try {
		// Single query with JOINs to get all data at once
		const [rows] = await pool.query(
			`SELECT 
				d.division_name,
				d.dean_name,
				d.pen_contact,
				d.loc_rep,
				d.chair_name,
				p.program_name,
				p.has_been_paid,
				p.report_submitted,
				p.notes,
				py.payee_name,
				py.amount
			FROM divisions d
			LEFT JOIN programs p ON d.id = p.division_id
			LEFT JOIN payees py ON p.id = py.program_id
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
					program.payees[row.payee_name] = parseFloat(row.amount);
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

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
