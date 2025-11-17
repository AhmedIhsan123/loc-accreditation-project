import { Department } from "./department.js";
import { Program } from "./program.js";

export const data = {
	departments: [
		new Department(
			"Fine Arts",
			[
				new Program(
					"Music",
					{ Sam: 333, Kelly: 333, Ruth: 333 },
					true,
					new Date("2025-05-02"),
					false,
					"Yes! Sam, Kelly, and Ruth all work on this together and divide the money three ways."
				),
			],
			"Paul Metevier",
			"Christie Gilliland",
			"Monica Brown",
			"Liz Peterson"
		),

		new Department(
			"Humanities",
			[
				new Program(
					"Communication-Studies",
					{ Madeleine: 500, "Joy Crawford": 500 },
					true,
					new Date("2025-05-02"),
					false,
					"No for this round"
				),
			],
			"Katie Cunnion",
			"Jamie Fitzgerald",
			"Lisa Luengo",
			"Liz Peterson"
		),

		new Department(
			"Social Sciences",
			[
				new Program(
					"Anthropology",
					{ Lindsey: 400, Yoav: 400 },
					false,
					new Date("2025-05-02"),
					true,
					"Initial research phase"
				),
				new Program(
					"History",
					{ Joy: 300, Jerry: 300 },
					true,
					new Date("2025-05-02"),
					false,
					"Project in progress"
				),
				new Program(
					"Political-Science",
					{ "Aley Martin": 250, "Claire Scalede": 250, "Ericka Nelson": 250 },
					false,
					new Date("2025-05-02"),
					true,
					"Team assignment completed"
				),
				new Program(
					"Psychology",
					{ Jake: 500, Stephanie: 500 },
					true,
					new Date("2025-05-02"),
					true,
					"Survey data collection ongoing"
				),
			],
			"Mark Thomason",
			"Christie Gilliland",
			"Joy Crawford",
			"Liz Peterson"
		),

		new Department(
			"English",
			[
				new Program(
					"English",
					{ Leo: 334, Stephanie: 333, Danny: 333 },
					false,
					new Date("2025-05-02"),
					true,
					"Report to be completed in year #2"
				),
			],
			"Ian Sherman",
			"Jamie Fitzgerald",
			"Jake Frye",
			"Liz Peterson"
		),

		new Department(
			"Science",
			[
				new Program(
					"Anatomy-and-Physiology",
					{ "Leo Studach": 400, "Stephanie Hoffman": 400 },
					true,
					new Date("2025-05-02"),
					false,
					"Lab work scheduled"
				),
				new Program(
					"Biology/Environmental-Science",
					{ "Danny Najera": 350, "Pam Kikillus": 350 },
					false,
					new Date("2025-05-02"),
					true,
					"Field study in progress"
				),
				new Program(
					"Geology/Oceanography",
					{ "Anna Neil": 500, "Tad Henry": 500 },
					true,
					new Date("2025-05-02"),
					false,
					"Initial sample collection complete"
				),
			],
			"Katy Shaw",
			"Danny Najera",
			"Miebeth Bustillo-Booth",
			"Heather Lambert"
		),

		new Department(
			"Business-Law-and-Education",
			[
				new Program(
					"Accounting",
					{ Sam: 300, Kelly: 300 },
					false,
					new Date("2025-05-02"),
					false,
					"Year 1 project"
				),
				new Program(
					"Business-Management",
					{ Ruth: 400, Madeleine: 400 },
					true,
					new Date("2025-05-02"),
					true,
					"Completed management training module"
				),
				new Program(
					"Business-Marketing/Entrepreneurship",
					{ "Joy Crawford": 500, Jake: 500 },
					true,
					new Date("2025-05-02"),
					false,
					"Marketing plan drafted"
				),
			],
			"Lea Ann Simpson",
			"Lea Ann Simpson",
			"Jane Swenson",
			"Mary Singer"
		),
	],
};
